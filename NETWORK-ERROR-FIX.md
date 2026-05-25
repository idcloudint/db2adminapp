# Network Error Fix - API URL Configuration

## Issue Description
**Problem**: Network errors when accessing Daily Admin Tasks, RCA, Investigation, and Log Collector features  
**Error**: `Error: Network Error` when making API calls  
**Root Cause**: Frontend components were using `http://localhost:3001` as default API_URL, which doesn't exist in production

## Solution Applied

### Changes Made
Fixed API URL configuration in 4 frontend page components to use relative URLs instead of localhost:

1. **DailyTasksPage.tsx** (Line 19)
   - Before: `const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';`
   - After: `const API_URL = process.env.REACT_APP_API_URL || '';`

2. **RCAPage.tsx** (Line 19)
   - Before: `const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';`
   - After: `const API_URL = process.env.REACT_APP_API_URL || '';`

3. **InvestigationPage.tsx** (Line 19)
   - Before: `const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';`
   - After: `const API_URL = process.env.REACT_APP_API_URL || '';`

4. **LogCollectorPage.tsx** (Line 19)
   - Before: `const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';`
   - After: `const API_URL = process.env.REACT_APP_API_URL || '';`

### Why This Works

**In Development**:
- Can set `REACT_APP_API_URL=http://localhost:3001` in `.env` file
- Frontend makes direct calls to backend on localhost

**In Production (OpenShift)**:
- Uses empty string as default (relative URLs)
- Nginx reverse proxy intercepts `/api/*` requests
- Proxies them to backend service: `http://db2-day2ops-backend:3001`
- Same-origin requests avoid CORS issues

### Nginx Configuration
The nginx configuration in `frontend/nginx.conf` handles the proxying:

```nginx
location /api/ {
    proxy_pass http://db2-day2ops-backend:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Deployment Steps

### 1. Commit Changes
```bash
cd db2-day2ops-app
git add -A
git commit -m "Fix API URL configuration for production"
git push origin main
```

### 2. Rebuild Frontend
```bash
oc start-build db2-day2ops-frontend -n db2-day2ops --follow
```

### 3. Verify Deployment
```bash
# Check new pod is running
oc get pods -n db2-day2ops | grep db2-day2ops-frontend

# Get application URL
oc get route db2-day2ops -n db2-day2ops -o jsonpath='{.spec.host}'
```

## Testing Verification

### Access Application
URL: https://db2-day2ops-db2-day2ops.apps.itz-n182c5.hub01-lb.techzone.ibm.com

### Test Each Feature

#### 1. Daily Admin Tasks
- Navigate to "Daily Admin Tasks" from hamburger menu
- Click "Run All Tasks" button
- **Expected**: Tasks execute successfully, no network errors
- **Verify**: Task results display in the UI

#### 2. Root Cause Analysis (RCA)
- Navigate to "Root Cause Analysis"
- Enter a problem description (e.g., "Database connection timeout")
- Click "Analyze" button
- **Expected**: Analysis results appear, no network errors
- **Verify**: Recommendations and potential causes display

#### 3. Investigation & Search
- Navigate to "Investigation & Search"
- Enter a search query (e.g., "backup")
- Click "Search" button
- **Expected**: Search results appear, no network errors
- **Verify**: Relevant documentation snippets display

#### 4. Log Collector
- Navigate to "Log Collector"
- Select log types (DB2 Logs, Pod Logs, etc.)
- Click "Collect Logs" button
- **Expected**: Log collection starts, no network errors
- **Verify**: Collection status updates appear

#### 5. Dashboard (Baseline)
- Navigate to "Dashboard" (home page)
- **Expected**: Health metrics load and update
- **Verify**: WebSocket connection established, real-time updates work

### Browser Developer Tools Check
Open browser DevTools (F12) → Network tab:
- All API calls should show status 200 (success)
- No failed requests with status 0 or "Network Error"
- API calls should be to relative paths: `/api/daily-tasks/run`, `/api/rca/analyze`, etc.

## Rollback Plan (If Needed)

If issues persist, rollback to previous build:

```bash
# List recent builds
oc get builds -n db2-day2ops | grep frontend

# Rollback to previous successful build (e.g., build 19)
oc rollout undo deployment/db2-day2ops-frontend -n db2-day2ops

# Or specify a specific revision
oc rollout undo deployment/db2-day2ops-frontend --to-revision=19 -n db2-day2ops
```

## Additional Notes

### Development Environment
For local development, create `.env` file in frontend directory:
```
REACT_APP_API_URL=http://localhost:3001
```

### Production Environment
No environment variables needed - uses relative URLs by default.

### Localhost References
Remaining localhost references in the codebase are acceptable:
- **Documentation files**: Examples for local development
- **Git commit logs**: Historical records
- **Build cache**: Temporary build artifacts

## Related Files
- [`frontend/src/components/DailyTasks/DailyTasksPage.tsx`](frontend/src/components/DailyTasks/DailyTasksPage.tsx)
- [`frontend/src/components/RCA/RCAPage.tsx`](frontend/src/components/RCA/RCAPage.tsx)
- [`frontend/src/components/Investigation/InvestigationPage.tsx`](frontend/src/components/Investigation/InvestigationPage.tsx)
- [`frontend/src/components/LogCollector/LogCollectorPage.tsx`](frontend/src/components/LogCollector/LogCollectorPage.tsx)
- [`frontend/nginx.conf`](frontend/nginx.conf)

## Status
✅ **Fixed and Deployed**
- Commit: `0659bae` - "Fix API URL configuration for production"
- Build: `db2-day2ops-frontend-20` (Completed)
- Deployment: Running on OpenShift
- Testing: Ready for verification