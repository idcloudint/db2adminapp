# Daily Tasks Implementation Status

## Current Status: PARTIALLY WORKING ✅

### What's Working
1. ✅ **API Integration**: Frontend can call backend API without network errors
2. ✅ **Kubernetes API**: Backend successfully uses K8s API to discover DB2 pod
3. ✅ **Pod Discovery**: Dynamically finds DB2 pod using label selector (`app=db2`)
4. ✅ **Command Execution**: Successfully executes commands in DB2 pod via WebSocket
5. ✅ **First Task Passing**: "Instance and Database Availability" returns correct results

### Test Results (Latest Run)
```json
{
    "runId": "b4037452-d582-41ec-9071-ab149f9847a1",
    "totalTasks": 7,
    "passed": 1,
    "warnings": 0,
    "failed": 0,
    "errors": 6
}
```

### Task-by-Task Status

#### ✅ PASSING (1/7)
1. **Instance and Database Availability** 
   - Command: `db2 list active databases`
   - Status: ✅ PASS
   - Output: Shows SAMPLE database with 2 active connections

#### ❌ FAILING (6/7) - Exit Status 4
2. **Tablespace Health Check**
   - Command: `db2 "SELECT TBSP_NAME..."`
   - Error: `exit status 4`
   - Reason: Needs database connection

3. **Transaction Log Health**
   - Command: `db2 "SELECT LOG_UTILIZATION_PERCENT..."`
   - Error: `exit status 4`
   - Reason: Needs database connection

4. **DB2 Diagnostic Log Review**
   - Command: `db2diag -rc 3 -H 24`
   - Error: `exit status 4`
   - Reason: May need different approach

5. **Connection Health**
   - Command: `db2 "SELECT COUNT(*) AS ACTIVE_CONNECTIONS..."`
   - Error: `exit status 4`
   - Reason: Needs database connection

6. **Lock and Blocking Analysis**
   - Command: `db2 "SELECT AGENT_ID, LOCK_WAIT_TIME..."`
   - Error: `exit status 4`
   - Reason: Needs database connection

7. **Backup Verification**
   - Command: `db2 "SELECT DBNAME, START_TIME..."`
   - Error: `exit status 4`
   - Reason: Needs database connection

## Root Cause Analysis

### Exit Status 4 Explanation
DB2 exit status 4 typically means:
- **SQL0104N**: An unexpected token was found
- **SQL1024N**: A database connection does not exist
- **SQL1032N**: No start database manager command was issued

### The Issue
Commands that query database tables need an active database connection. The commands should be:
```bash
db2 connect to SAMPLE
db2 "SELECT ..."
db2 terminate
```

Instead of just:
```bash
db2 "SELECT ..."
```

## Solution Options

### Option 1: Wrap Commands with Connection (RECOMMENDED)
Modify each SQL command to include connection:
```typescript
const command = `db2 connect to ${config.db2.database} && db2 "${sqlQuery}" && db2 terminate`;
```

**Pros:**
- Each task is independent
- Handles connection failures gracefully
- Clean separation of concerns

**Cons:**
- Slightly more overhead per task
- Multiple connections

### Option 2: Single Connection for All Tasks
Connect once, run all queries, disconnect:
```typescript
async runAllTasks() {
  await execInDB2Pod(`db2 connect to ${config.db2.database}`);
  // Run all tasks
  await execInDB2Pod(`db2 terminate`);
}
```

**Pros:**
- More efficient (single connection)
- Faster execution

**Cons:**
- If connection fails, all tasks fail
- More complex error handling

### Option 3: Use db2 -x Flag
Use non-interactive mode:
```bash
db2 -x "connect to SAMPLE; SELECT ...; terminate"
```

**Pros:**
- Single command
- Cleaner syntax

**Cons:**
- May have parsing issues with complex queries

## Recommended Fix

Update `daily-tasks.service.ts` to wrap SQL commands with connection:

```typescript
private readonly tasks: DailyTask[] = [
  {
    id: 'instance-availability',
    name: 'Instance and Database Availability',
    description: 'Check if DB2 instance and databases are available',
    category: 'availability',
    command: 'db2 list active databases'  // No connection needed
  },
  {
    id: 'tablespace-health',
    name: 'Tablespace Health Check',
    description: 'Check tablespace usage and status',
    category: 'storage',
    command: `db2 connect to SAMPLE && db2 "SELECT TBSP_NAME, TBSP_STATE, TBSP_USED_PAGES, TBSP_TOTAL_PAGES, DECIMAL((FLOAT(TBSP_USED_PAGES)/FLOAT(TBSP_TOTAL_PAGES))*100,5,2) AS PCT_USED FROM TABLE(MON_GET_TABLESPACE(NULL,-2)) ORDER BY PCT_USED DESC" && db2 terminate`,
    threshold: {
      warning: 80,
      critical: 90
    }
  },
  // ... update all other SQL-based tasks similarly
];
```

## Implementation Steps

1. ✅ Fix API URL configuration (DONE)
2. ✅ Implement Kubernetes API integration (DONE)
3. ✅ Test pod discovery and command execution (DONE)
4. ⏳ Wrap SQL commands with database connection
5. ⏳ Test all 7 tasks
6. ⏳ Verify thresholds and analysis logic
7. ⏳ Document final results

## Next Actions

1. Update task commands to include `db2 connect to SAMPLE`
2. Rebuild backend
3. Test all tasks
4. Verify results in UI
5. Update documentation

## Technical Details

### Kubernetes API Integration
- **Library**: `@kubernetes/client-node` v0.21.0
- **Method**: `k8sExec.exec()` with WebSocket
- **Pod Discovery**: `listNamespacedPod()` with label selector
- **Namespace**: `db2-community`
- **Pod Label**: `app=db2`
- **Pod Name**: Dynamically discovered (e.g., `db2-resilient-0`)

### Command Execution
```typescript
const wrappedCommand = ['su', '-', 'db2inst1', '-c', command];
await k8sExec.exec(namespace, podName, '', wrappedCommand, ...);
```

### Configuration
```typescript
db2: {
  namespace: 'db2-community',
  podLabel: 'app=db2',
  database: 'SAMPLE',
  user: 'db2inst1'
}
```

## Testing

### Manual Test
```bash
curl -X POST https://db2-day2ops-db2-day2ops.apps.itz-n182c5.hub01-lb.techzone.ibm.com/api/daily-tasks/run
```

### Expected Result (After Fix)
```json
{
  "totalTasks": 7,
  "passed": 7,
  "warnings": 0,
  "failed": 0,
  "errors": 0
}
```

## Related Files
- [`backend/src/services/daily-tasks.service.ts`](backend/src/services/daily-tasks.service.ts) - Main implementation
- [`backend/src/config/index.ts`](backend/src/config/index.ts) - Configuration
- [`frontend/src/components/DailyTasks/DailyTasksPage.tsx`](frontend/src/components/DailyTasks/DailyTasksPage.tsx) - UI component

## References
- [DB2 Exit Codes](https://www.ibm.com/docs/en/db2/11.5?topic=codes-sqlstate-messages)
- [Kubernetes Client Node](https://github.com/kubernetes-client/javascript)
- [DB2 Command Reference](https://www.ibm.com/docs/en/db2/11.5?topic=commands-db2-command)