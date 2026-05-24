# DB2 Day 2 Ops - Deployment Without External Registry

This guide shows how to deploy the frontend (and backend) to OpenShift **without using Quay.io or any external registry**.

## Overview

Instead of pushing images to an external registry, we:
1. Build images locally with podman
2. Import them directly into OpenShift's internal ImageStream
3. Deploy using the imported images

## Prerequisites

- ✅ OpenShift CLI (`oc`) installed and logged in
- ✅ Podman installed (version 5.8.0 detected)
- ✅ Node.js 18+ and npm
- ✅ Access to OpenShift cluster

## Quick Deploy - Frontend Only

If you only need to deploy/update the frontend:

```bash
cd db2-day2ops-app
chmod +x deploy-frontend-local.sh
./deploy-frontend-local.sh
```

This script will:
1. Build the React app
2. Create a container image with podman
3. Import the image to OpenShift
4. Deploy the frontend
5. Display the application URL

## Quick Deploy - Complete Application

To deploy both backend and frontend:

```bash
cd db2-day2ops-app
chmod +x deploy-both-local.sh
./deploy-both-local.sh
```

This script will:
1. Create OpenShift infrastructure (namespace, RBAC, config)
2. Build backend (TypeScript compilation + container image)
3. Build frontend (React build + container image)
4. Import both images to OpenShift
5. Deploy both applications
6. Display the application URL

## How It Works

### Method 1: Image Import (Default)

When the OpenShift internal registry is not exposed externally:

```bash
# Save image from podman
podman save db2-day2ops-frontend:latest | \
  oc import-image db2-day2ops-frontend:latest \
  --from=- \
  --confirm \
  -n db2-day2ops
```

This pipes the image directly from podman into OpenShift's ImageStream.

### Method 2: Internal Registry Push (If Available)

If your cluster has the internal registry exposed:

```bash
# Get registry URL
REGISTRY=$(oc get route default-route -n openshift-image-registry -o jsonpath='{.spec.host}')

# Login
oc whoami -t | podman login -u $(oc whoami) --password-stdin $REGISTRY

# Tag and push
podman tag db2-day2ops-frontend:latest $REGISTRY/db2-day2ops/db2-day2ops-frontend:latest
podman push $REGISTRY/db2-day2ops/db2-day2ops-frontend:latest
```

The deployment scripts automatically detect which method to use.

## Manual Deployment Steps

If you prefer to deploy manually:

### 1. Build Frontend Locally

```bash
cd db2-day2ops-app/frontend

# Install dependencies
npm install

# Build React app
GENERATE_SOURCEMAP=false npm run build

# Build container image
podman build -t db2-day2ops-frontend:latest .
```

### 2. Create ImageStream

```bash
oc project db2-day2ops

cat <<EOF | oc apply -f -
apiVersion: image.openshift.io/v1
kind: ImageStream
metadata:
  name: db2-day2ops-frontend
  namespace: db2-day2ops
EOF
```

### 3. Import Image

```bash
podman save db2-day2ops-frontend:latest | \
  oc import-image db2-day2ops-frontend:latest \
  --from=- \
  --confirm \
  -n db2-day2ops
```

### 4. Deploy

```bash
oc apply -f openshift/05-frontend-deployment.yaml
```

### 5. Wait for Rollout

```bash
oc rollout status deployment/db2-day2ops-frontend -n db2-day2ops
```

### 6. Get URL

```bash
oc get route db2-day2ops -n db2-day2ops -o jsonpath='{.spec.host}'
```

## Updating the Application

To update after making code changes:

### Frontend Only

```bash
cd db2-day2ops-app/frontend

# Rebuild
npm run build
podman build -t db2-day2ops-frontend:latest .

# Re-import
podman save db2-day2ops-frontend:latest | \
  oc import-image db2-day2ops-frontend:latest \
  --from=- \
  --confirm \
  -n db2-day2ops

# Trigger rollout
oc rollout restart deployment/db2-day2ops-frontend -n db2-day2ops
```

Or simply run:
```bash
./deploy-frontend-local.sh
```

### Both Backend and Frontend

```bash
./deploy-both-local.sh
```

## Troubleshooting

### Pods Not Starting

Check pod status:
```bash
oc get pods -n db2-day2ops
oc describe pod <pod-name> -n db2-day2ops
```

Check logs:
```bash
oc logs deployment/db2-day2ops-frontend -n db2-day2ops
```

### Image Import Failed

If image import fails, try:

1. **Check podman is working:**
   ```bash
   podman images | grep db2-day2ops
   ```

2. **Verify ImageStream exists:**
   ```bash
   oc get imagestream -n db2-day2ops
   ```

3. **Try alternative import method:**
   ```bash
   # Save to file first
   podman save db2-day2ops-frontend:latest -o /tmp/frontend.tar
   
   # Import from file
   oc import-image db2-day2ops-frontend:latest \
     --from=/tmp/frontend.tar \
     --confirm \
     -n db2-day2ops
   
   # Cleanup
   rm /tmp/frontend.tar
   ```

### Build Failures

**Frontend build fails:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Backend build fails:**
```bash
cd backend
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

### Deployment Not Updating

Force a new rollout:
```bash
oc rollout restart deployment/db2-day2ops-frontend -n db2-day2ops
oc rollout status deployment/db2-day2ops-frontend -n db2-day2ops
```

### Cannot Access Application

1. **Check route exists:**
   ```bash
   oc get route db2-day2ops -n db2-day2ops
   ```

2. **Check service:**
   ```bash
   oc get svc db2-day2ops-frontend -n db2-day2ops
   ```

3. **Test from inside cluster:**
   ```bash
   oc run test --image=curlimages/curl -it --rm -- \
     curl http://db2-day2ops-frontend:8080/health
   ```

## Advantages of This Approach

✅ **No external registry needed** - No Quay.io, Docker Hub, or other registry required  
✅ **Faster deployment** - No network upload/download of images  
✅ **More secure** - Images never leave your cluster  
✅ **Simpler setup** - No registry credentials to manage  
✅ **Works offline** - Deploy without internet access (after initial npm install)

## Comparison with External Registry

| Aspect | Local Build | External Registry |
|--------|-------------|-------------------|
| Setup complexity | Low | Medium |
| Build speed | Fast | Medium |
| Network usage | Minimal | High |
| Security | High | Medium |
| Sharing images | No | Yes |
| CI/CD integration | Manual | Easy |

## Production Considerations

For production deployments, consider:

1. **Use external registry** for:
   - Multi-cluster deployments
   - CI/CD pipelines
   - Image versioning and rollback
   - Team collaboration

2. **Use local builds** for:
   - Development and testing
   - Single-cluster deployments
   - Air-gapped environments
   - Quick iterations

## Next Steps

After successful deployment:

1. **Verify application is running:**
   ```bash
   oc get pods -n db2-day2ops
   ```

2. **Access the dashboard:**
   ```bash
   echo "https://$(oc get route db2-day2ops -n db2-day2ops -o jsonpath='{.spec.host}')"
   ```

3. **Monitor logs:**
   ```bash
   oc logs -f deployment/db2-day2ops-frontend -n db2-day2ops
   ```

4. **Test functionality:**
   - Open the URL in browser
   - Check pod health monitoring
   - Verify DB2 engine status
   - Test real-time updates

## Support

For issues:
- Check [`DEPLOYMENT-STATUS.md`](DEPLOYMENT-STATUS.md)
- Review [`DEPLOYMENT-GUIDE.md`](DEPLOYMENT-GUIDE.md)
- Examine pod logs: `oc logs -f deployment/db2-day2ops-frontend -n db2-day2ops`

---

**Last Updated:** 2026-05-24  
**Status:** Production Ready  
**Method:** Local Build + OpenShift ImageStream Import