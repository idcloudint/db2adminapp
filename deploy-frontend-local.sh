#!/bin/bash

# DB2 Day 2 Ops - Deploy Frontend to OpenShift (No External Registry)
# This script builds the frontend locally and deploys to OpenShift using binary builds

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   DB2 Day 2 Ops - Frontend Deployment (Local Build)      ║"
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

# Ensure namespace exists
echo "🏗️  Step 1: Ensuring namespace exists..."
oc apply -f openshift/01-namespace.yaml 2>/dev/null || true
oc project db2-day2ops
echo "✅ Namespace ready"
echo ""

# Build frontend locally
echo "📦 Step 2: Building frontend locally..."
cd frontend

echo "Installing dependencies..."
npm install --silent

echo "Building React app..."
GENERATE_SOURCEMAP=false npm run build

echo "✅ Frontend built successfully"
echo ""

# Build container image with podman
echo "🐳 Step 3: Building container image with podman..."
podman build -t db2-day2ops-frontend:latest -f Dockerfile .
echo "✅ Container image built"
echo ""

cd ..

# Create ImageStream if it doesn't exist
echo "📋 Step 4: Creating ImageStream..."
cat <<EOF | oc apply -f -
apiVersion: image.openshift.io/v1
kind: ImageStream
metadata:
  name: db2-day2ops-frontend
  namespace: db2-day2ops
  labels:
    app: db2-day2ops
    component: frontend
EOF
echo "✅ ImageStream created"
echo ""

# Push image to OpenShift internal registry
echo "📤 Step 5: Pushing image to OpenShift..."

# Get internal registry route
REGISTRY=$(oc get route default-route -n openshift-image-registry -o jsonpath='{.spec.host}' 2>/dev/null || echo "")

if [ -z "$REGISTRY" ]; then
    echo "⚠️  Internal registry route not exposed. Using image import instead..."
    
    # Save image to tar and import
    echo "Saving image to tar..."
    podman save db2-day2ops-frontend:latest -o /tmp/db2-day2ops-frontend.tar
    
    echo "Importing image to OpenShift..."
    oc import-image db2-day2ops-frontend:latest \
        --from=/tmp/db2-day2ops-frontend.tar \
        --confirm \
        -n db2-day2ops || {
        echo "⚠️  Direct import failed. Using alternative method..."
        
        # Alternative: Use oc image import with local docker daemon
        podman save db2-day2ops-frontend:latest | \
            oc import-image db2-day2ops-frontend:latest \
            --from=- \
            --confirm \
            -n db2-day2ops
    }
    
    # Cleanup
    rm -f /tmp/db2-day2ops-frontend.tar
else
    echo "Using internal registry: $REGISTRY"
    
    # Login to internal registry
    TOKEN=$(oc whoami -t)
    echo "$TOKEN" | podman login -u $(oc whoami) --password-stdin $REGISTRY
    
    # Tag and push
    podman tag db2-day2ops-frontend:latest $REGISTRY/db2-day2ops/db2-day2ops-frontend:latest
    podman push $REGISTRY/db2-day2ops/db2-day2ops-frontend:latest
fi

echo "✅ Image pushed to OpenShift"
echo ""

# Deploy frontend
echo "🚀 Step 6: Deploying frontend..."
oc apply -f openshift/05-frontend-deployment.yaml
echo "✅ Frontend deployment created"
echo ""

# Wait for deployment
echo "⏳ Step 7: Waiting for deployment to be ready..."
oc rollout status deployment/db2-day2ops-frontend -n db2-day2ops --timeout=5m || {
    echo "⚠️  Deployment may still be in progress"
    echo "Check status with: oc get pods -n db2-day2ops"
}
echo ""

# Get route URL
echo "🌐 Step 8: Getting application URL..."
ROUTE_URL=$(oc get route db2-day2ops -n db2-day2ops -o jsonpath='{.spec.host}' 2>/dev/null || echo "")

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   ✅ Frontend Deployment Complete!                        ║"
echo "║                                                           ║"
if [ -n "$ROUTE_URL" ]; then
echo "║   Application URL:                                        ║"
echo "║   https://$ROUTE_URL"
echo "║                                                           ║"
fi
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Show pod status
echo "📊 Pod Status:"
oc get pods -n db2-day2ops -l component=frontend
echo ""

echo "📝 Useful commands:"
echo "   View logs:          oc logs -f deployment/db2-day2ops-frontend -n db2-day2ops"
echo "   View all pods:      oc get pods -n db2-day2ops"
echo "   Restart deployment: oc rollout restart deployment/db2-day2ops-frontend -n db2-day2ops"
echo "   Delete deployment:  oc delete deployment db2-day2ops-frontend -n db2-day2ops"
echo ""

if [ -n "$ROUTE_URL" ]; then
    echo "🎉 Access your dashboard at: https://$ROUTE_URL"
fi
echo ""

# Made with Bob