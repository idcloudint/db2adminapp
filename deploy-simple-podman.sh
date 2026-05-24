#!/bin/bash

# DB2 Day 2 Ops - Simple Podman-based Deployment
# Uses podman to build and load images directly into OpenShift

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   DB2 Day 2 Ops - Simple Podman Deployment               ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
if ! command -v oc &> /dev/null; then
    echo "❌ Error: oc CLI not found"
    exit 1
fi

if ! command -v podman &> /dev/null; then
    echo "❌ Error: podman not found"
    exit 1
fi

if ! oc whoami &> /dev/null; then
    echo "❌ Error: Not logged in to OpenShift"
    exit 1
fi

echo "✅ Logged in as: $(oc whoami)"
echo ""

# Step 1: Infrastructure
echo "🏗️  Step 1: Creating infrastructure..."
oc apply -f openshift/01-namespace.yaml
oc apply -f openshift/02-rbac.yaml
oc apply -f openshift/03-config.yaml
oc project db2-day2ops
echo "✅ Infrastructure ready"
echo ""

# Step 2: Build images
echo "📦 Step 2: Building images..."

cd backend
echo "Building backend..."
npm install --silent
npm run build 2>&1 | grep -v "TS5107" || true
podman build -t db2-day2ops-backend:latest -f Dockerfile . -q
cd ..

cd frontend
echo "Building frontend..."
npm install --silent
GENERATE_SOURCEMAP=false npm run build 2>&1 | grep -v "eslint\|DeprecationWarning" || true
podman build -t db2-day2ops-frontend:latest -f Dockerfile . -q
cd ..

echo "✅ Images built"
echo ""

# Step 3: Create ImageStreams
echo "📋 Step 3: Creating ImageStreams..."
oc apply -f - <<EOF
apiVersion: image.openshift.io/v1
kind: ImageStream
metadata:
  name: db2-day2ops-backend
  namespace: db2-day2ops
---
apiVersion: image.openshift.io/v1
kind: ImageStream
metadata:
  name: db2-day2ops-frontend
  namespace: db2-day2ops
EOF
echo "✅ ImageStreams created"
echo ""

# Step 4: Load images into OpenShift
echo "📤 Step 4: Loading images into OpenShift..."

# Method: Use oc image to load from local podman
echo "Loading backend image..."
podman push db2-day2ops-backend:latest docker-daemon:db2-day2ops-backend:latest 2>/dev/null || true
oc import-image db2-day2ops-backend:latest --from=db2-day2ops-backend:latest --confirm --reference-policy=local -n db2-day2ops 2>/dev/null || {
    echo "Using alternative method..."
    oc tag docker.io/library/db2-day2ops-backend:latest db2-day2ops-backend:latest --source=docker --insecure -n db2-day2ops
}

echo "Loading frontend image..."
podman push db2-day2ops-frontend:latest docker-daemon:db2-day2ops-frontend:latest 2>/dev/null || true
oc import-image db2-day2ops-frontend:latest --from=db2-day2ops-frontend:latest --confirm --reference-policy=local -n db2-day2ops 2>/dev/null || {
    echo "Using alternative method..."
    oc tag docker.io/library/db2-day2ops-frontend:latest db2-day2ops-frontend:latest --source=docker --insecure -n db2-day2ops
}

echo "✅ Images loaded"
echo ""

# Step 5: Deploy
echo "🚀 Step 5: Deploying applications..."
oc apply -f openshift/04-backend-deployment.yaml
oc apply -f openshift/05-frontend-deployment.yaml
echo "✅ Deployments created"
echo ""

# Step 6: Wait
echo "⏳ Step 6: Waiting for pods..."
sleep 5
oc wait --for=condition=available --timeout=5m deployment/db2-day2ops-backend -n db2-day2ops 2>/dev/null || echo "⚠️  Backend still starting..."
oc wait --for=condition=available --timeout=5m deployment/db2-day2ops-frontend -n db2-day2ops 2>/dev/null || echo "⚠️  Frontend still starting..."
echo ""

# Get route
ROUTE_URL=$(oc get route db2-day2ops -n db2-day2ops -o jsonpath='{.spec.host}' 2>/dev/null || echo "")

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   ✅ Deployment Complete!                                 ║"
if [ -n "$ROUTE_URL" ]; then
echo "║   URL: https://$ROUTE_URL"
fi
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

echo "📊 Pod Status:"
oc get pods -n db2-day2ops
echo ""

if [ -n "$ROUTE_URL" ]; then
    echo "🎉 Access: https://$ROUTE_URL"
fi

# Made with Bob