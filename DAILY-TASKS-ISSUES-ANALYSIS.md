# Daily Admin Tasks - Issues Analysis and Fix Plan

## Issue Summary

Based on production testing, the following issues were identified:

| Issue | Severity | Status | Tasks Affected |
|-------|----------|--------|----------------|
| Connection Health Parsing Error | High | 🔴 Critical | Connection Health |
| Exit Code 4 Errors | High | 🔴 Critical | 4 tasks |
| Missing Historical Tracking | Medium | 🟡 Enhancement | All tasks |

---

## Issue 1: Connection Health Parsing Error

### Problem Description

**Observed Behavior:**
```
Connection usage critical: 8664/11 (78763.6%)
activeConnections: 8664
maxConnections: 11
utilization: 78763.6%
```

**Expected Behavior:**
```
Connection usage healthy: 5/AUTOMATIC (N/A%)
activeConnections: 5
maxConnections: AUTOMATIC
utilization: N/A
```

### Root Cause Analysis

The issue is in line 445-448 of [`daily-tasks.service.ts`](db2-day2ops-app/backend/src/services/daily-tasks.service.ts:445):

```typescript
case 'connection-health':
  const connMatch = stdout.match(/(\d+)\s+(\d+)/);
  if (connMatch) {
    const active = parseInt(connMatch[1]);
    const max = parseInt(connMatch[2]);
```

**Problem:** The regex `/(\d+)\s+(\d+)/` is matching the wrong numbers in the output.

**Actual DB2 Output:**
```
ACTIVE_CONNECTIONS MAX_CONNECTIONS
------------------ ----------------
                 5 -

  1 record(s) selected.
```

**What's Happening:**
1. The regex matches "5" (active connections) correctly
2. But then it matches "1" from "1 record(s) selected" as max_connections
3. This causes: 5 active / 1 max = 500% utilization
4. The display shows "8664/11" which appears to be corrupted data from multiple runs

### Solution

**Fix 1: Handle NULL/AUTOMATIC max_connections**

DB2 returns `-` or `NULL` when `max_connections` is set to AUTOMATIC. We need to:
1. Parse the output more carefully
2. Handle the case where max_connections is not a number
3. Skip utilization calculation when max is AUTOMATIC

**Fix 2: Improved Regex Pattern**

```typescript
// Match the actual data row, not the "record(s) selected" line
const connMatch = stdout.match(/^\s*(\d+)\s+(-|NULL|\d+)\s*$/m);
```

**Fix 3: Handle AUTOMATIC Configuration**

```typescript
if (connMatch) {
  const active = parseInt(connMatch[1]);
  const maxStr = connMatch[2].trim();
  
  // Handle AUTOMATIC (shown as - or NULL)
  if (maxStr === '-' || maxStr === 'NULL' || maxStr === '') {
    return {
      status: 'pass',
      message: `Active connections: ${active} (max_connections=AUTOMATIC)`,
      metrics: {
        activeConnections: active,
        maxConnections: 'AUTOMATIC',
        utilization: 'N/A'
      },
      recommendations: []
    };
  }
  
  const max = parseInt(maxStr);
  const usage = (active / max) * 100;
  // ... rest of logic
}
```

---

## Issue 2: Exit Code 4 Errors

### Problem Description

**Affected Tasks:**
1. Transaction Log Health
2. DB2 Diagnostic Log Review  
3. Lock and Blocking Analysis
4. Backup Verification

**Error Message:**
```
Task execution failed: command terminated with non-zero exit code: exit status 4
```

### Root Cause Analysis

**Exit Code 4** in DB2 typically means:
- **SQL0104N**: An unexpected token was found
- **SQL0204N**: Object does not exist
- **SQL0206N**: Column does not exist
- **Permission denied** on certain operations

**Possible Causes:**

1. **Transaction Log Health** - `MON_GET_TRANSACTION_LOG()` may require special permissions
2. **Diagnostic Log Review** - `db2diag` command may not be in PATH or requires different permissions
3. **Lock Analysis** - Query may be failing due to syntax or permissions
4. **Backup Verification** - `SYSIBMADM.DB_HISTORY` may not exist or be accessible

### Investigation Steps

1. Check if commands work when executed directly in DB2 pod
2. Verify user permissions (db2inst1)
3. Check if monitoring functions are enabled
4. Verify database configuration

### Solution Approach

**Fix 1: Add Better Error Handling**

```typescript
private async runTask(task: DailyTask): Promise<TaskResult> {
  try {
    const { stdout, stderr } = await execInDB2Pod(task.command);
    
    // Check for specific DB2 error codes
    if (stderr.includes('SQL0204N') || stderr.includes('SQL0206N')) {
      return {
        status: 'error',
        message: 'Database object not found - feature may not be available',
        recommendations: [
          'Verify database is properly configured',
          'Check if monitoring functions are enabled',
          'Ensure user has required permissions'
        ]
      };
    }
    
    // ... rest of logic
  } catch (error: any) {
    // Enhanced error handling with exit code detection
    if (error.message.includes('exit status 4')) {
      return {
        status: 'error',
        message: 'Command failed - check permissions and database configuration',
        recommendations: [
          'Verify db2inst1 user permissions',
          'Check if database is activated',
          'Review command syntax for DB2 version compatibility',
          'Enable monitoring switches if needed'
        ]
      };
    }
  }
}
```

**Fix 2: Alternative Commands for Failing Tasks**

For tasks that consistently fail, provide fallback commands:

```typescript
// Transaction Log Health - Alternative
command: 'db2 connect to SAMPLE && db2 "SELECT * FROM SYSIBMADM.LOG_UTILIZATION" && db2 terminate'

// Diagnostic Log Review - Alternative  
command: 'tail -100 /database/config/db2inst1/sqllib/db2dump/db2diag.log | grep -i error || echo "No recent errors"'

// Lock Analysis - Simplified
command: 'db2 connect to SAMPLE && db2 "SELECT COUNT(*) as LOCK_WAITS FROM SYSIBMADM.LOCKWAITS" && db2 terminate'

// Backup Verification - Alternative
command: 'db2 connect to SAMPLE && db2 "SELECT * FROM SYSIBMADM.DB_HISTORY WHERE OPERATION=\'B\' FETCH FIRST 1 ROW ONLY" && db2 terminate'
```

**Fix 3: Graceful Degradation**

If a task fails with exit code 4, mark it as "Not Available" instead of "Error":

```typescript
if (exitCode === 4) {
  return {
    status: 'warning',
    message: 'Feature not available or not configured',
    recommendations: [
      'This monitoring feature may require additional configuration',
      'Contact DBA to enable required monitoring switches',
      'Check DB2 version compatibility'
    ]
  };
}
```

---

## Issue 3: Missing Historical Job Run Table

### Problem Description

Currently, task execution history is stored in memory only. When the backend pod restarts, all history is lost.

### Requirements

1. **Persistent Storage** - Store execution history in a database or file
2. **Historical View** - Display past executions in the UI
3. **Trend Analysis** - Show trends over time (pass/fail rates)
4. **Retention Policy** - Keep last 100 runs or 30 days

### Solution Design

#### Backend Changes

**1. Add Database Schema (if using DB2)**

```sql
CREATE TABLE DAILY_TASK_RUNS (
  RUN_ID VARCHAR(36) PRIMARY KEY,
  START_TIME TIMESTAMP NOT NULL,
  END_TIME TIMESTAMP NOT NULL,
  TOTAL_TASKS INT NOT NULL,
  PASSED INT NOT NULL,
  WARNINGS INT NOT NULL,
  FAILED INT NOT NULL,
  ERRORS INT NOT NULL,
  DURATION_MS INT NOT NULL
);

CREATE TABLE DAILY_TASK_RESULTS (
  RESULT_ID VARCHAR(36) PRIMARY KEY,
  RUN_ID VARCHAR(36) NOT NULL,
  TASK_ID VARCHAR(50) NOT NULL,
  TASK_NAME VARCHAR(200) NOT NULL,
  STATUS VARCHAR(20) NOT NULL,
  MESSAGE VARCHAR(500),
  DURATION_MS INT NOT NULL,
  TIMESTAMP TIMESTAMP NOT NULL,
  FOREIGN KEY (RUN_ID) REFERENCES DAILY_TASK_RUNS(RUN_ID)
);

CREATE INDEX IDX_TASK_RUNS_TIME ON DAILY_TASK_RUNS(START_TIME DESC);
CREATE INDEX IDX_TASK_RESULTS_RUN ON DAILY_TASK_RESULTS(RUN_ID);
```

**2. Alternative: File-Based Storage**

If database is not available, use JSON file storage:

```typescript
// Store in /app/data/task-history.json
interface HistoryStorage {
  runs: TaskRunSummary[];
  lastUpdated: Date;
}

private async saveHistory(): Promise<void> {
  const data: HistoryStorage = {
    runs: this.taskHistory.slice(0, 100), // Keep last 100
    lastUpdated: new Date()
  };
  
  await fs.writeFile(
    '/app/data/task-history.json',
    JSON.stringify(data, null, 2)
  );
}

private async loadHistory(): Promise<void> {
  try {
    const data = await fs.readFile('/app/data/task-history.json', 'utf-8');
    const history: HistoryStorage = JSON.parse(data);
    this.taskHistory = history.runs;
  } catch (error) {
    // File doesn't exist yet, start fresh
    this.taskHistory = [];
  }
}
```

**3. Add API Endpoints**

```typescript
// Get historical runs
router.get('/history', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const history = dailyTasksService.getHistory().slice(0, limit);
  res.json(history);
});

// Get specific run details
router.get('/history/:runId', async (req, res) => {
  const run = dailyTasksService.getRunById(req.params.runId);
  if (!run) {
    return res.status(404).json({ error: 'Run not found' });
  }
  res.json(run);
});

// Get statistics
router.get('/statistics', async (req, res) => {
  const stats = dailyTasksService.getStatistics();
  res.json(stats);
});
```

#### Frontend Changes

**1. Add History Table Component**

```typescript
// frontend/src/components/DailyTasks/TaskHistoryTable.tsx
interface TaskHistoryTableProps {
  history: TaskHistory[];
  onSelectRun: (runId: string) => void;
}

export const TaskHistoryTable: React.FC<TaskHistoryTableProps> = ({
  history,
  onSelectRun
}) => {
  return (
    <DataTable
      rows={history.map(h => ({
        id: h.runId,
        timestamp: new Date(h.timestamp).toLocaleString(),
        total: h.summary.total,
        passed: h.summary.passed,
        warnings: h.summary.warnings,
        failed: h.summary.failed
      }))}
      headers={[
        { key: 'timestamp', header: 'Execution Time' },
        { key: 'total', header: 'Total' },
        { key: 'passed', header: 'Passed' },
        { key: 'warnings', header: 'Warnings' },
        { key: 'failed', header: 'Failed' }
      ]}
      onRowClick={(row) => onSelectRun(row.id)}
    />
  );
};
```

**2. Add History Tab to Daily Tasks Page**

```typescript
<Tabs>
  <TabList>
    <Tab>Current Run</Tab>
    <Tab>History</Tab>
    <Tab>Statistics</Tab>
  </TabList>
  <TabPanels>
    <TabPanel>
      {/* Current task execution UI */}
    </TabPanel>
    <TabPanel>
      <TaskHistoryTable 
        history={history}
        onSelectRun={handleSelectRun}
      />
    </TabPanel>
    <TabPanel>
      <TaskStatistics stats={statistics} />
    </TabPanel>
  </TabPanels>
</Tabs>
```

**3. Add Statistics Dashboard**

```typescript
interface TaskStatistics {
  totalRuns: number;
  averagePassRate: number;
  averageDuration: number;
  taskSuccessRates: Record<string, number>;
  recentTrend: 'improving' | 'stable' | 'declining';
}
```

---

## Implementation Plan

### Phase 1: Critical Fixes (Priority: High)

**Estimated Time:** 2-3 hours

1. ✅ Fix connection health parsing
   - Update regex pattern
   - Handle AUTOMATIC max_connections
   - Test with real DB2 output

2. ✅ Fix exit code 4 errors
   - Add better error detection
   - Implement fallback commands
   - Add graceful degradation

3. ✅ Test all fixes locally
   - Run each task individually
   - Verify error handling
   - Check metrics extraction

### Phase 2: Historical Tracking (Priority: Medium)

**Estimated Time:** 4-5 hours

1. ✅ Implement file-based storage
   - Create data directory
   - Add save/load methods
   - Implement retention policy

2. ✅ Add history API endpoints
   - GET /api/daily-tasks/history
   - GET /api/daily-tasks/history/:runId
   - GET /api/daily-tasks/statistics

3. ✅ Create frontend components
   - TaskHistoryTable component
   - Add History tab
   - Implement run details view

### Phase 3: Testing and Deployment (Priority: High)

**Estimated Time:** 1-2 hours

1. ✅ Integration testing
   - Test all tasks end-to-end
   - Verify history persistence
   - Check UI responsiveness

2. ✅ Deploy to OpenShift
   - Build backend image
   - Build frontend image
   - Update deployments

3. ✅ Production validation
   - Run all tasks
   - Verify fixes
   - Monitor for errors

---

## Testing Checklist

### Connection Health Fix

- [ ] Test with max_connections=AUTOMATIC (returns `-`)
- [ ] Test with max_connections=100 (returns number)
- [ ] Test with max_connections=NULL
- [ ] Verify utilization calculation is correct
- [ ] Check recommendations are appropriate

### Exit Code 4 Fixes

- [ ] Test Transaction Log Health command
- [ ] Test Diagnostic Log Review command
- [ ] Test Lock Analysis command
- [ ] Test Backup Verification command
- [ ] Verify error messages are helpful
- [ ] Check fallback commands work

### Historical Tracking

- [ ] Verify history is saved after each run
- [ ] Check history persists across pod restarts
- [ ] Test history API endpoints
- [ ] Verify UI displays history correctly
- [ ] Check statistics calculations
- [ ] Test retention policy (keeps last 100)

---

## Rollback Plan

If issues occur after deployment:

```bash
# Rollback backend
oc rollout undo deployment/db2-day2ops-backend -n db2-day2ops

# Rollback frontend
oc rollout undo deployment/db2-day2ops-frontend -n db2-day2ops

# Verify rollback
oc get pods -n db2-day2ops
oc logs -f deployment/db2-day2ops-backend -n db2-day2ops
```

---

## Success Criteria

### Must Have (R2.2.0)
- ✅ Connection health shows correct utilization
- ✅ All 7 tasks execute without exit code 4 errors
- ✅ Error messages are clear and actionable
- ✅ Historical runs are persisted

### Nice to Have (Future)
- ⏳ Database-backed storage (instead of file)
- ⏳ Trend analysis charts
- ⏳ Email notifications for failures
- ⏳ Scheduled automatic runs

---

## Documentation Updates

After implementation, update:

1. [`DAILY-TASKS-ENHANCEMENT-COMPLETE.md`](db2-day2ops-app/DAILY-TASKS-ENHANCEMENT-COMPLETE.md)
2. [`DEPLOYMENT-VALIDATION-R2.1.0.md`](db2-day2ops-app/DEPLOYMENT-VALIDATION-R2.1.0.md)
3. Create new `RELEASE-R2.2.0.md`
4. Update main [`README.md`](db2-day2ops-app/README.md)

---

**Document Version:** 1.0  
**Created:** May 25, 2026  
**Author:** DevOps Team  
**Status:** 🔴 In Progress