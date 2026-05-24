# DB2 Day 2 Ops Dashboard - Deployment Guide

## Prerequisites

- OpenShift cluster access with cluster-admin or sufficient permissions
- `oc` CLI installed and configured
- `docker` or `podman` installed for building images
- DB2 Community Edition running in `db2-community` namespace

## Quick Deployment

### One-Command Deployment

```bash
cd db2-day2ops-app
./deploy.sh
```

This script will:
1. Build Docker images for backend and frontend
2. Create namespace `db2-day2ops`
3. Set up RBAC (ServiceAccount, ClusterRole, ClusterRoleBinding)
4. Create ConfigMap and Secret
5. Deploy backend and frontend
6. Create OpenShift Route
7. Display application URL

## Manual Deployment Steps

### Step 1: Login to OpenShift

```bash
oc login <your-openshift-cluster>
```

### Step 2: Build Docker Images

**Backend:**
```bash
cd backend
docker build -t db2-day2ops-backend:latest .
cd ..
```

**Frontend:**
```bash
cd frontend
docker build -t db2-day2ops-frontend:latest .
cd ..
```

### Step 3: Create Namespace

```bash
oc apply -f openshift/01-namespace.yaml
```

### Step 4: Create RBAC

```bash
oc apply -f openshift/02-rbac.yaml
```

This creates:
- ServiceAccount: `db2-day2ops-backend`
- ClusterRole: `db2-day2ops-monitor` (read pods, events, PVCs, exec into pods)
- ClusterRoleBinding: Binds the role to the service account

### Step 5: Create Configuration

```bash
oc apply -f openshift/03-config.yaml
```

This creates:
- ConfigMap: `db2-day2ops-backend-config` (environment variables)
- Secret: `db2-day2ops-backend-secret` (DB2 password)

### Step 6: Load Images to OpenShift

**Option A: Using OpenShift Internal Registry**
```bash
oc project db2-day2ops

# Tag images
docker tag db2-day2ops-backend:latest default-route-openshift-image-registry.apps.<cluster>/db2-day2ops/backend:latest
docker tag db2-day2ops-frontend:latest default-route-openshift-image-registry.apps.<cluster>/db2-day2ops/frontend:latest

# Push images
docker push default-route-openshift-image-registry.apps.<cluster>/db2-day2ops/backend:latest
docker push default-route-openshift-image-registry.apps.<cluster>/db2-day2ops/frontend:latest
```

**Option B: Using Image Streams**
```bash
oc project db2-day2ops
oc import-image db2-day2ops-backend:latest --from=db2-day2ops-backend:latest --confirm
oc import-image db2-day2ops-frontend:latest --from=db2-day2ops-frontend:latest --confirm
```

### Step 7: Deploy Backend

```bash
oc apply -f openshift/04-backend-deployment.yaml
```

Wait for backend to be ready:
```bash
oc wait --for=condition=available --timeout=300s deployment/db2-day2ops-backend -n db2-day2ops
```

### Step 8: Deploy Frontend

```bash
oc apply -f openshift/05-frontend-deployment.yaml
```

Wait for frontend to be ready:
```bash
oc wait --for=condition=available --timeout=300s deployment/db2-day2ops-frontend -n db2-day2ops
```

### Step 9: Get Application URL

```bash
oc get route db2-day2ops -n db2-day2ops -o jsonpath='{.spec.host}'
```

Access the application at: `https://<route-host>`

## Verification

### Check Pod Status

```bash
oc get pods -n db2-day2ops
```

Expected output:
```
NAME                                     READY   STATUS    RESTARTS   AGE
db2-day2ops-backend-xxxxxxxxxx-xxxxx     1/1     Running   0          2m
db2-day2ops-frontend-xxxxxxxxxx-xxxxx    1/1     Running   0          2m
```

### Check Logs

**Backend logs:**
```bash
oc logs -f deployment/db2-day2ops-backend -n db2-day2ops
```

**Frontend logs:**
```bash
oc logs -f deployment/db2-day2ops-frontend -n db2-day2ops
```

### Test Backend API

```bash
BACKEND_POD=$(oc get pod -n db2-day2ops -l component=backend -o jsonpath='{.items[0].metadata.name}')
oc exec -n db2-day2ops $BACKEND_POD -- curl -s http://localhost:3001/health
```

Expected: `{"status":"ok","timestamp":"..."}`

### Test Frontend

```bash
ROUTE_URL=$(oc get route db2-day2ops -n db2-day2ops -o jsonpath='{.spec.host}')
curl -k https://$ROUTE_URL/health
```

Expected: `healthy`

## Configuration

### Update DB2 Connection

Edit the ConfigMap:
```bash
oc edit configmap db2-day2ops-backend-config -n db2-day2ops
```

Update these values:
- `DB2_NAMESPACE`: Namespace where DB2 is running
- `DB2_POD_LABEL`: Label selector for DB2 pod
- `DB2_DATABASE`: Database name
- `DB2_USER`: Database user

Edit the Secret for password:
```bash
oc edit secret db2-day2ops-backend-secret -n db2-day2ops
```

After changes, restart backend:
```bash
oc rollout restart deployment/db2-day2ops-backend -n db2-day2ops
```

### Scale Replicas

```bash
# Scale backend
oc scale deployment/db2-day2ops-backend --replicas=2 -n db2-day2ops

# Scale frontend
oc scale deployment/db2-day2ops-frontend --replicas=2 -n db2-day2ops
```

## Troubleshooting

### Backend Pod Not Starting

1. Check logs:
```bash
oc logs deployment/db2-day2ops-backend -n db2-day2ops
```

2. Check events:
```bash
oc get events -n db2-day2ops --sort-by='.lastTimestamp'
```

3. Common issues:
   - **RBAC permissions**: Verify ClusterRoleBinding is created
   - **DB2 connection**: Check DB2 pod is running in `db2-community` namespace
   - **Image pull**: Verify images are available

### Frontend Not Loading

1. Check if backend is accessible:
```bash
oc exec -n db2-day2ops deployment/db2-day2ops-frontend -- wget -O- http://db2-day2ops-backend:3001/health
```

2. Check nginx logs:
```bash
oc logs deployment/db2-day2ops-frontend -n db2-day2ops
```

### WebSocket Connection Failing

1. Verify backend service:
```bash
oc get svc db2-day2ops-backend -n db2-day2ops
```

2. Test WebSocket from frontend pod:
```bash
oc exec -n db2-day2ops deployment/db2-day2ops-frontend -- wget --spider ws://db2-day2ops-backend:3001/ws
```

### Cannot Access DB2 Pod

1. Verify RBAC permissions:
```bash
oc auth can-i get pods --as=system:serviceaccount:db2-day2ops:db2-day2ops-backend -n db2-community
oc auth can-i create pods/exec --as=system:serviceaccount:db2-day2ops:db2-day2ops-backend -n db2-community
```

2. Check DB2 pod exists:
```bash
oc get pods -n db2-community -l app=db2
```

## Monitoring

### View Real-Time Logs

```bash
# Backend
oc logs -f deployment/db2-day2ops-backend -n db2-day2ops

# Frontend
oc logs -f deployment/db2-day2ops-frontend -n db2-day2ops
```

### Check Resource Usage

```bash
oc adm top pods -n db2-day2ops
```

### View Metrics

```bash
# Backend metrics
oc exec -n db2-day2ops deployment/db2-day2ops-backend -- curl -s http://localhost:3001/health

# Pod status
oc get pods -n db2-day2ops -o wide
```

## Updating the Application

### Update Backend

1. Build new image:
```bash
cd backend
docker build -t db2-day2ops-backend:v2 .
```

2. Update deployment:
```bash
oc set image deployment/db2-day2ops-backend backend=db2-day2ops-backend:v2 -n db2-day2ops
```

3. Watch rollout:
```bash
oc rollout status deployment/db2-day2ops-backend -n db2-day2ops
```

### Update Frontend

1. Build new image:
```bash
cd frontend
docker build -t db2-day2ops-frontend:v2 .
```

2. Update deployment:
```bash
oc set image deployment/db2-day2ops-frontend frontend=db2-day2ops-frontend:v2 -n db2-day2ops
```

3. Watch rollout:
```bash
oc rollout status deployment/db2-day2ops-frontend -n db2-day2ops
```

## Uninstalling

### Remove All Resources

```bash
oc delete namespace db2-day2ops
oc delete clusterrolebinding db2-day2ops-monitor-binding
oc delete clusterrole db2-day2ops-monitor
```

### Remove Images

```bash
docker rmi db2-day2ops-backend:latest
docker rmi db2-day2ops-frontend:latest
```

## Security Considerations

1. **RBAC**: Backend has read-only access to pods and events, exec access for monitoring
2. **Secrets**: DB2 password stored in Kubernetes Secret
3. **Network**: Backend and frontend communicate via ClusterIP services
4. **TLS**: Route uses edge termination for HTTPS
5. **Non-root**: Both containers run as non-root users

## Performance Tuning

### Adjust Collection Intervals

Edit ConfigMap to change how often data is collected:
```yaml
COLLECTION_INTERVAL_POD: "30000"     # 30 seconds
COLLECTION_INTERVAL_DB2: "30000"     # 30 seconds
COLLECTION_INTERVAL_STORAGE: "60000" # 1 minute
```

### Increase Resources

Edit deployment to allocate more resources:
```bash
oc set resources deployment/db2-day2ops-backend -n db2-day2ops \
  --requests=cpu=200m,memory=512Mi \
  --limits=cpu=1000m,memory=1Gi
```

## Support

For issues or questions:
1. Check logs: `oc logs deployment/db2-day2ops-backend -n db2-day2ops`
2. Check events: `oc get events -n db2-day2ops`
3. Verify RBAC: `oc auth can-i --list --as=system:serviceaccount:db2-day2ops:db2-day2ops-backend`
4. Test connectivity: `oc exec -n db2-day2ops deployment/db2-day2ops-backend -- curl http://localhost:3001/health`

---

**Document Version:** 1.0  
**Last Updated:** 2026-05-24  
**Status:** Production Ready