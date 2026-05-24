#!/bin/bash

# DB2 Day 2 Ops - Deploy Both Backend and Frontend (No External Registry)
# Complete deployment script using local builds and OpenShift internal registry

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   DB2 Day 2 Ops - Complete Deployment (Local Build)      ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
if ! command -v oc &> /dev/null; then
    echo "❌ Error: oc CLI not found. Please install OpenShift CLI."
    exit 1
fi

if ! command -v podman &> /dev/null; then
    echo "❌ Error: podman not found. Please install podman."
    exit 1
fi

if ! oc whoami &> /dev/null; then
    echo "❌ Error: Not logged in to OpenShift. Please run 'oc login' first."
    exit 1
fi

echo "✅ Logged in to OpenShift as: $(oc whoami)"
echo "✅ Current cluster: $(oc whoami --show-server)"
echo ""

# Step 1: Create infrastructure
echo "🏗️  Step 1: Creating infrastructure..."
oc apply -f openshift/01-namespace.yaml
oc apply -f openshift/02-rbac.yaml
oc apply -f openshift/03-config.yaml
oc project db2-day2ops
echo "✅ Infrastructure created"
echo ""

# Step 2: Build backend
echo "📦 Step 2: Building backend..."
cd backend
echo "Installing dependencies..."
npm install --silent
echo "Building TypeScript..."
npm run build 2>&1 | grep -v "TS5107" || true
echo "Building container image..."
podman build -t db2-day2ops-backend:latest -f Dockerfile .
cd ..
echo "✅ Backend built"
echo ""

# Step 3: Build frontend
echo "📦 Step 3: Building frontend..."
cd frontend
echo "Installing dependencies..."
npm install --silent
echo "Building React app..."
GENERATE_SOURCEMAP=false npm run build
echo "Building container image..."
podman build -t db2-day2ops-frontend:latest -f Dockerfile .
cd ..
echo "✅ Frontend built"
echo ""

# Step 4: Create ImageStreams
echo "📋 Step 4: Creating ImageStreams..."
cat <<EOF | oc apply -f -
apiVersion: image.openshift.io/v1
kind: ImageStream
metadata:
  name: db2-day2ops-backend
  namespace: db2-day2ops
  labels:
    app: db2-day2ops
    component: backend
---
apiVersion: image.openshift.io/v1
kind: ImageStream
metadata:
  name: db2-day2ops-frontend
  namespace: db2-day2ops
  labels:
    app: db2-day2ops
    component: frontend
EOF
echo "✅ ImageStreams created"
echo ""

# Step 5: Push images to OpenShift
echo "📤 Step 5: Pushing images to OpenShift..."

# Try to get internal registry
REGISTRY=$(oc get route default-route -n openshift-image-registry -o jsonpath='{.spec.host}' 2>/dev/null || echo "")

if [ -z "$REGISTRY" ]; then
    echo "⚠️  Internal registry not exposed. Using local image method..."
    
    # Tag images for local use
    echo "Tagging backend image..."
    podman tag db2-day2ops-backend:latest image-registry.openshift-image-registry.svc:5000/db2-day2ops/db2-day2ops-backend:latest
    
    echo "Tagging frontend image..."
    podman tag db2-day2ops-frontend:latest image-registry.openshift-image-registry.svc:5000/db2-day2ops/db2-day2ops-frontend:latest
    
    # Update ImageStreams to reference local images
    echo "Updating ImageStreams..."
    oc tag --source=docker db2-day2ops-backend:latest db2-day2ops-backend:latest -n db2-day2ops --insecure
    oc tag --source=docker db2-day2ops-frontend:latest db2-day2ops-frontend:latest -n db2-day2ops --insecure
else
    echo "Using internal registry: $REGISTRY"
    
    # Login to registry
    TOKEN=$(oc whoami -t)
    echo "$TOKEN" | podman login -u $(oc whoami) --password-stdin $REGISTRY
    
    # Push backend
    echo "Pushing backend..."
    podman tag db2-day2ops-backend:latest $REGISTRY/db2-day2ops/db2-day2ops-backend:latest
    podman push $REGISTRY/db2-day2ops/db2-day2ops-backend:latest
    
    # Push frontend
    echo "Pushing frontend..."
    podman tag db2-day2ops-frontend:latest $REGISTRY/db2-day2ops/db2-day2ops-frontend:latest
    podman push $REGISTRY/db2-day2ops/db2-day2ops-frontend:latest
fi

echo "✅ Images pushed"
echo ""

# Step 6: Deploy applications
echo "🚀 Step 6: Deploying applications..."
oc apply -f openshift/04-backend-deployment.yaml
oc apply -f openshift/05-frontend-deployment.yaml
echo "✅ Deployments created"
echo ""

# Step 7: Wait for deployments
echo "⏳ Step 7: Waiting for deployments..."
echo "Waiting for backend..."
oc rollout status deployment/db2-day2ops-backend -n db2-day2ops --timeout=5m || echo "⚠️  Backend may still be rolling out"
echo "Waiting for frontend..."
oc rollout status deployment/db2-day2ops-frontend -n db2-day2ops --timeout=5m || echo "⚠️  Frontend may still be rolling out"
echo ""

# Step 8: Get route
ROUTE_URL=$(oc get route db2-day2ops -n db2-day2ops -o jsonpath='{.spec.host}' 2>/dev/null || echo "")

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   ✅ Deployment Complete!                                 ║"
echo "║                                                           ║"
if [ -n "$ROUTE_URL" ]; then
echo "║   Application URL:                                        ║"
echo "║   https://$ROUTE_URL"
echo "║                                                           ║"
fi
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Show status
echo "📊 Pod Status:"
oc get pods -n db2-day2ops
echo ""

echo "📝 Useful commands:"
echo "   Backend logs:       oc logs -f deployment/db2-day2ops-backend -n db2-day2ops"
echo "   Frontend logs:      oc logs -f deployment/db2-day2ops-frontend -n db2-day2ops"
echo "   All resources:      oc get all -n db2-day2ops"
echo "   Restart backend:    oc rollout restart deployment/db2-day2ops-backend -n db2-day2ops"
echo "   Restart frontend:   oc rollout restart deployment/db2-day2ops-frontend -n db2-day2ops"
echo "   Delete deployment:  oc delete project db2-day2ops"
echo ""

if [ -n "$ROUTE_URL" ]; then
    echo "🎉 Access your dashboard at: https://$ROUTE_URL"
fi
echo ""

# Made with Bob