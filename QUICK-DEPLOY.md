# DB2 Day 2 Ops Dashboard - Quick Deploy Guide

## Prerequisites

- ✅ Podman installed (version 5.8.0 detected)
- ✅ OpenShift CLI (oc) installed and logged in
- ✅ Quay.io account (or Docker Hub)
- ✅ Application infrastructure deployed to OpenShift

## Quick Deploy Steps

### 1. Set Your Quay.io Username

```bash
export QUAY_USERNAME=your-actual-username
```

Or edit [`build-and-push.sh`](build-and-push.sh) and replace `your-username` with your actual Quay.io username.

### 2. Login to Quay.io

```bash
podman login quay.io
```

Enter your Quay.io credentials when prompted.

### 3. Build and Push Images

```bash
cd db2-day2ops-app
./build-and-push.sh
```

This script will:
1. Build backend container image
2. Push backend to Quay.io
3. Build frontend container image
4. Push frontend to Quay.io
5. Update OpenShift deployments with new images
6. Wait for rollout to complete
7. Display application URL

### 4. Verify Deployment

```bash
# Check pod status
oc get pods -n db2-day2ops

# View backend logs
oc logs -f deployment/db2-day2ops-backend -n db2-day2ops

# View frontend logs
oc logs -f deployment/db2-day2ops-frontend -n db2-day2ops
```

### 5. Access Dashboard

Open your browser to:
```
https://db2-day2ops-db2-day2ops.apps.itz-n182c5.hub01-lb.techzone.ibm.com
```

## Alternative: Using Docker Hub

If you prefer Docker Hub over Quay.io:

```bash
# Edit build-and-push.sh
# Change: REGISTRY="quay.io"
# To:     REGISTRY="docker.io"

# Set username
export QUAY_USERNAME=your-dockerhub-username

# Login
podman login docker.io

# Run script
./build-and-push.sh
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod events
oc describe pod <pod-name> -n db2-day2ops

# Check deployment status
oc get deployment -n db2-day2ops
oc describe deployment db2-day2ops-backend -n db2-day2ops
```

### Image Pull Errors

Make sure your Quay.io repositories are **public** or configure image pull secrets:

```bash
# Make repositories public in Quay.io web UI
# Or create image pull secret:
oc create secret docker-registry quay-secret \
  --docker-server=quay.io \
  --docker-username=your-username \
  --docker-password=your-password \
  -n db2-day2ops

# Link secret to service account
oc secrets link db2-day2ops-backend quay-secret --for=pull -n db2-day2ops
```

### Backend Can't Connect to DB2

Check the ConfigMap settings:

```bash
oc get configmap db2-day2ops-backend-config -n db2-day2ops -o yaml
```

Verify:
- `DB2_NAMESPACE`: Should be the namespace where DB2 is running
- `DB2_POD_LABEL`: Should match your DB2 pod labels
- `DB2_DATABASE`: Should be your database name (e.g., SAMPLE)

### WebSocket Connection Issues

Check if the backend is running and accessible:

```bash
# Test backend health endpoint
oc port-forward deployment/db2-day2ops-backend 3001:3001 -n db2-day2ops

# In another terminal
curl http://localhost:3001/health
```

## Manual Build (Without Script)

If you prefer to build manually:

```bash
cd db2-day2ops-app

# Build backend
cd backend
podman build -t quay.io/your-username/db2-day2ops-backend:latest .
podman push quay.io/your-username/db2-day2ops-backend:latest

# Build frontend
cd ../frontend
podman build -t quay.io/your-username/db2-day2ops-frontend:latest .
podman push quay.io/your-username/db2-day2ops-frontend:latest

# Update deployments
oc set image deployment/db2-day2ops-backend \
  db2-day2ops-backend=quay.io/your-username/db2-day2ops-backend:latest \
  -n db2-day2ops

oc set image deployment/db2-day2ops-frontend \
  db2-day2ops-frontend=quay.io/your-username/db2-day2ops-frontend:latest \
  -n db2-day2ops
```

## Next Steps

Once deployed:

1. **Test Pod Health Monitoring**: Check if the dashboard shows your DB2 pod status
2. **Test DB2 Engine Monitoring**: Verify DB2 connection status is displayed
3. **Test Real-Time Updates**: Watch the dashboard update automatically every 60 seconds
4. **Test Critical Alerts**: If DB2 has issues, verify the big red warning appears
5. **Test WebSocket**: Open browser console and check for WebSocket connection

## Useful Commands

```bash
# Restart deployments
oc rollout restart deployment/db2-day2ops-backend -n db2-day2ops
oc rollout restart deployment/db2-day2ops-frontend -n db2-day2ops

# Scale deployments
oc scale deployment/db2-day2ops-backend --replicas=2 -n db2-day2ops

# View all resources
oc get all -n db2-day2ops

# Delete deployment (cleanup)
oc delete project db2-day2ops
```

## Support

For issues or questions, check:
- [`DEPLOYMENT-STATUS.md`](DEPLOYMENT-STATUS.md) - Detailed deployment information
- [`README.md`](README.md) - Application overview
- [`DEPLOYMENT-GUIDE.md`](DEPLOYMENT-GUIDE.md) - Complete deployment guide

---
*Last Updated: 2026-05-24*