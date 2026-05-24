# Quick Deploy - No External Registry Required

## TL;DR - One Command

```bash
cd db2-day2ops-app
./deploy-both-local.sh
```

## What This Does

1. ✅ Builds backend (TypeScript → Node.js container)
2. ✅ Builds frontend (React → nginx container)  
3. ✅ Loads images into OpenShift ImageStreams
4. ✅ Deploys both applications
5. ✅ Creates route for external access

## No External Registry Needed

This method uses:
- **Local podman builds** - Images built on your machine
- **OpenShift ImageStreams** - Images stored in cluster
- **Direct image tagging** - No push/pull to external registry

## Prerequisites

- ✅ OpenShift CLI (`oc`) - logged in
- ✅ Podman 5.8+ installed
- ✅ Node.js 18+ and npm

## Alternative Scripts

### Frontend Only
```bash
./deploy-frontend-local.sh
```

### Simpler Method
```bash
./deploy-simple-podman.sh
```

## After Deployment

### Get Application URL
```bash
oc get route db2-day2ops -n db2-day2ops -o jsonpath='{.spec.host}'
```

### Check Status
```bash
oc get pods -n db2-day2ops
```

### View Logs
```bash
# Backend
oc logs -f deployment/db2-day2ops-backend -n db2-day2ops

# Frontend
oc logs -f deployment/db2-day2ops-frontend -n db2-day2ops
```

### Update After Code Changes
Just run the script again:
```bash
./deploy-both-local.sh
```

## Troubleshooting

### Pods in ImagePullBackOff
```bash
# Check ImageStreams
oc get imagestream -n db2-day2ops

# Rebuild and redeploy
./deploy-both-local.sh
```

### Build Failures
```bash
# Clean and rebuild
cd frontend
rm -rf node_modules build
npm install
npm run build

cd ../backend
rm -rf node_modules dist
npm install
npm run build
```

### Deployment Not Updating
```bash
# Force restart
oc rollout restart deployment/db2-day2ops-backend -n db2-day2ops
oc rollout restart deployment/db2-day2ops-frontend -n db2-day2ops
```

## How It Works

```
┌─────────────────┐
│  Your Machine   │
│                 │
│  1. npm build   │
│  2. podman build│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   OpenShift     │
│                 │
│  3. ImageStream │
│  4. Deployment  │
│  5. Route       │
└─────────────────┘
```

## Why This Works

- **No registry authentication** - Uses local images
- **Fast iteration** - Build and deploy in minutes
- **Secure** - Images never leave your network
- **Simple** - One script does everything

## Production Note

For production, consider using an external registry (Quay.io, Docker Hub) for:
- Image versioning
- Multi-cluster deployments
- CI/CD pipelines
- Team collaboration

But for development and testing, this local method is perfect!

---

**Created:** 2026-05-24  
**Method:** Local Podman + OpenShift ImageStreams  
**No External Registry Required** ✅