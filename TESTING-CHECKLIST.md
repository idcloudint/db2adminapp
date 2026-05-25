# DB2 Day 2 Operations Dashboard - Testing Checklist

## Application Information
- **Version**: R2.0.0
- **URL**: https://db2-day2ops-db2-day2ops.apps.itz-n182c5.hub01-lb.techzone.ibm.com
- **Namespace**: db2-day2ops
- **Last Build**: frontend-20, backend-20 (May 25, 2026)

## Pre-Testing Setup

### 1. Verify Deployment Status
```bash
# Check all pods are running
oc get pods -n db2-day2ops

# Expected output:
# db2-day2ops-backend-xxx    1/1  Running
# db2-day2ops-frontend-xxx   1/1  Running
```

### 2. Check Backend Logs
```bash
# View backend logs for any startup errors
oc logs -f deployment/db2-day2ops-backend -n db2-day2ops
```

### 3. Open Browser Developer Tools
- Press F12 to open DevTools
- Go to Network tab
- Clear any existing logs
- Keep DevTools open during testing

---

## Feature Testing

### ✅ Test 1: Dashboard (Home Page)

**Purpose**: Verify real-time monitoring and WebSocket connection

**Steps**:
1. Navigate to application URL
2. Wait for dashboard to load (3-5 seconds)
3. Observe health metrics cards

**Expected Results**:
- [ ] Dashboard loads without errors
- [ ] Health metrics display (Pod Health, DB2 Health, etc.)
- [ ] Status indicators show (Healthy/Warning/Critical)
- [ ] Real-time updates occur (metrics refresh every 30s)
- [ ] WebSocket connection established (check Network tab → WS)
- [ ] No console errors in browser DevTools

**API Calls to Verify**:
- `GET /api/health` - Initial health data
- `WS /ws` - WebSocket connection for real-time updates

---

### ✅ Test 2: Daily Admin Tasks

**Purpose**: Verify task execution and result display

**Steps**:
1. Click hamburger menu (☰) in top-left
2. Select "Daily Admin Tasks"
3. Review available tasks list
4. Click "Run All Tasks" button
5. Wait for execution to complete

**Expected Results**:
- [ ] Page loads without network errors
- [ ] Task list displays with descriptions
- [ ] "Run All Tasks" button is clickable
- [ ] Loading indicator appears during execution
- [ ] Task results display after completion
- [ ] Each task shows status (Success/Failed)
- [ ] Execution time is displayed
- [ ] No "Network Error" messages

**API Calls to Verify**:
- `GET /api/daily-tasks` - List available tasks
- `POST /api/daily-tasks/run` - Execute all tasks
- Response status: 200 OK

**Sample Tasks**:
- Database backup verification
- Tablespace monitoring
- Connection pool check
- Log rotation check
- Performance metrics collection

---

### ✅ Test 3: Root Cause Analysis (RCA)

**Purpose**: Verify AI-powered problem analysis

**Steps**:
1. Navigate to "Root Cause Analysis" from menu
2. Enter problem description in text area
3. Example: "Database connection timeout after 30 seconds"
4. Click "Analyze" button
5. Wait for analysis results

**Expected Results**:
- [ ] Page loads without network errors
- [ ] Text area accepts input
- [ ] "Analyze" button is enabled
- [ ] Loading indicator appears during analysis
- [ ] Analysis results display with:
  - [ ] Problem summary
  - [ ] Potential root causes (3-5 items)
  - [ ] Recommended actions
  - [ ] Related documentation links
- [ ] No "Network Error" messages

**API Calls to Verify**:
- `POST /api/rca/analyze` - Analyze problem
- Request body: `{ "problem": "..." }`
- Response status: 200 OK

**Test Cases**:
1. Connection timeout issues
2. High CPU usage
3. Slow query performance
4. Tablespace full errors
5. Lock contention problems

---

### ✅ Test 4: Investigation & Search

**Purpose**: Verify documentation search functionality

**Steps**:
1. Navigate to "Investigation & Search" from menu
2. Enter search query in search box
3. Example queries:
   - "backup"
   - "performance tuning"
   - "connection pool"
   - "tablespace"
4. Click "Search" button
5. Review search results

**Expected Results**:
- [ ] Page loads without network errors
- [ ] Search box accepts input
- [ ] "Search" button is enabled
- [ ] Loading indicator appears during search
- [ ] Search results display with:
  - [ ] Relevant documentation snippets
  - [ ] File paths or sources
  - [ ] Highlighted search terms
  - [ ] Relevance scores (if applicable)
- [ ] No "Network Error" messages

**API Calls to Verify**:
- `POST /api/investigation/search` - Search documentation
- Request body: `{ "query": "..." }`
- Response status: 200 OK

**Search Categories**:
- DB2 configuration
- Performance optimization
- Backup and recovery
- Troubleshooting guides
- Best practices

---

### ✅ Test 5: Log Collector

**Purpose**: Verify log collection from multiple sources

**Steps**:
1. Navigate to "Log Collector" from menu
2. Review available log types
3. Select one or more log types:
   - [ ] DB2 Diagnostic Logs
   - [ ] Pod Logs
   - [ ] Application Logs
   - [ ] System Logs
4. Click "Collect Logs" button
5. Wait for collection to complete

**Expected Results**:
- [ ] Page loads without network errors
- [ ] Log type checkboxes are selectable
- [ ] "Collect Logs" button is enabled
- [ ] Loading indicator appears during collection
- [ ] Collection status updates display
- [ ] Collected logs are downloadable or viewable
- [ ] No "Network Error" messages

**API Calls to Verify**:
- `POST /api/logs/collect` - Start log collection
- Request body: `{ "logTypes": [...] }`
- Response status: 200 OK

**Log Sources**:
- DB2 instance logs (db2diag.log)
- OpenShift pod logs
- Application backend logs
- System event logs

---

### ✅ Test 6: Navigation & UI

**Purpose**: Verify overall UI functionality

**Steps**:
1. Test hamburger menu open/close
2. Navigate between all pages
3. Test responsive design (resize browser)
4. Test all buttons and links

**Expected Results**:
- [ ] Hamburger menu opens/closes smoothly
- [ ] All menu items are clickable
- [ ] Page transitions work correctly
- [ ] Back button works as expected
- [ ] UI is responsive on different screen sizes
- [ ] Carbon Design System styling is consistent
- [ ] No broken links or buttons

**Navigation Items**:
- Dashboard (Home)
- Daily Admin Tasks
- Root Cause Analysis
- Investigation & Search
- Log Collector

---

## Network Verification

### Browser DevTools - Network Tab

**Check for**:
- [ ] All API calls return status 200 (success)
- [ ] No failed requests (status 0 or "Network Error")
- [ ] API calls use relative paths: `/api/*`
- [ ] WebSocket connection established: `ws://` or `wss://`
- [ ] No CORS errors in console

**Expected API Endpoints**:
```
GET  /api/health
GET  /api/daily-tasks
POST /api/daily-tasks/run
POST /api/rca/analyze
POST /api/investigation/search
POST /api/logs/collect
WS   /ws
```

---

## Performance Testing

### Response Times
- [ ] Dashboard loads in < 3 seconds
- [ ] Page navigation in < 1 second
- [ ] API calls respond in < 5 seconds
- [ ] WebSocket updates in < 1 second

### Resource Usage
```bash
# Check pod resource usage
oc top pods -n db2-day2ops

# Expected:
# Backend: < 500Mi memory, < 0.5 CPU
# Frontend: < 100Mi memory, < 0.1 CPU
```

---

## Error Handling Testing

### Test Error Scenarios

**1. Backend Unavailable**
- Stop backend pod temporarily
- Verify frontend shows appropriate error messages
- Restart backend and verify recovery

**2. Invalid Input**
- Enter invalid data in forms
- Verify validation messages appear
- Verify no crashes occur

**3. Network Timeout**
- Simulate slow network (DevTools → Network → Throttling)
- Verify loading indicators work
- Verify timeout messages are user-friendly

---

## Security Testing

### Authentication & Authorization
- [ ] Application requires authentication (if configured)
- [ ] Unauthorized access is blocked
- [ ] Session management works correctly

### Data Protection
- [ ] Sensitive data is not exposed in logs
- [ ] API responses don't leak internal details
- [ ] HTTPS is enforced (check URL protocol)

---

## Regression Testing

### Previous Issues
- [x] Network Error in Daily Tasks - **FIXED** (R2.0.0)
- [x] Network Error in Log Collector - **FIXED** (R2.0.0)
- [x] API URL localhost issue - **FIXED** (R2.0.0)

### Verify Fixes
- [ ] Daily Tasks execute without network errors
- [ ] Log Collector works without network errors
- [ ] All API calls use correct URLs (relative paths)

---

## Post-Testing

### 1. Document Results
Create test report with:
- Test date and time
- Tester name
- Pass/fail status for each test
- Screenshots of any issues
- Browser and version used

### 2. Report Issues
If any test fails:
1. Capture screenshot
2. Copy error message from console
3. Note steps to reproduce
4. Check backend logs for errors
5. Create issue in GitHub repository

### 3. Update Documentation
- Update TESTING-CHECKLIST.md with results
- Add any new test cases discovered
- Document workarounds for known issues

---

## Quick Test Commands

```bash
# Check deployment status
oc get all -n db2-day2ops

# View backend logs
oc logs -f deployment/db2-day2ops-backend -n db2-day2ops

# View frontend logs
oc logs -f deployment/db2-day2ops-frontend -n db2-day2ops

# Test API endpoint directly
curl https://db2-day2ops-db2-day2ops.apps.itz-n182c5.hub01-lb.techzone.ibm.com/api/health

# Check WebSocket connection
wscat -c wss://db2-day2ops-db2-day2ops.apps.itz-n182c5.hub01-lb.techzone.ibm.com/ws
```

---

## Test Sign-Off

**Tested By**: _________________  
**Date**: _________________  
**Version**: R2.0.0  
**Overall Status**: ⬜ PASS  ⬜ FAIL  ⬜ PARTIAL  

**Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## Next Steps After Testing

### If All Tests Pass ✅
1. Update R2.0.0 release notes with test results
2. Tag release as stable
3. Notify stakeholders of successful deployment
4. Schedule production rollout (if applicable)

### If Tests Fail ❌
1. Document all failures in detail
2. Create GitHub issues for each problem
3. Prioritize fixes (critical/high/medium/low)
4. Plan hotfix release if needed
5. Retest after fixes are deployed

---

## Related Documents
- [NETWORK-ERROR-FIX.md](NETWORK-ERROR-FIX.md) - API URL configuration fix
- [R2.0.0-DEPLOYMENT-SUCCESS.md](R2.0.0-DEPLOYMENT-SUCCESS.md) - Deployment guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - General deployment instructions
- [README.md](README.md) - Application overview