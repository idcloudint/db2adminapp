#!/bin/bash

# DB2 Day 2 Ops - OpenShift Deployment Script

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   DB2 Day 2 Operations Dashboard - OpenShift Deployment  ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if oc is installed
if ! command -v oc &> /dev/null; then
    echo "❌ Error: oc CLI not found. Please install OpenShift CLI."
    exit 1
fi

# Check if logged in to OpenShift
if ! oc whoami &> /dev/null; then
    echo "❌ Error: Not logged in to OpenShift. Please run 'oc login' first."
    exit 1
fi

echo "✅ Logged in to OpenShift as: $(oc whoami)"
echo "✅ Current cluster: $(oc whoami --show-server)"
echo ""

# Step 1: Build Docker images
echo "📦 Step 1: Building Docker images..."
echo ""

echo "Building backend image..."
cd backend
docker build -t db2-day2ops-backend:latest .
cd ..
echo "✅ Backend image built"

echo "Building frontend image..."
cd frontend
docker build -t db2-day2ops-frontend:latest .
cd ..
echo "✅ Frontend image built"

echo ""

# Step 2: Create namespace
echo "🏗️  Step 2: Creating namespace..."
oc apply -f openshift/01-namespace.yaml
echo "✅ Namespace created"
echo ""

# Step 3: Create RBAC
echo "🔐 Step 3: Creating RBAC..."
oc apply -f openshift/02-rbac.yaml
echo "✅ RBAC created"
echo ""

# Step 4: Create ConfigMap and Secret
echo "⚙️  Step 4: Creating configuration..."
oc apply -f openshift/03-config.yaml
echo "✅ Configuration created"
echo ""

# Step 5: Load images to OpenShift
echo "📤 Step 5: Loading images to OpenShift..."

# Tag and push backend
echo "Pushing backend image..."
oc project db2-day2ops
oc import-image db2-day2ops-backend:latest --from=docker.io/library/db2-day2ops-backend:latest --confirm || \
docker save db2-day2ops-backend:latest | oc import-image db2-day2ops-backend:latest --from=- --confirm

# Tag and push frontend
echo "Pushing frontend image..."
oc import-image db2-day2ops-frontend:latest --from=docker.io/library/db2-day2ops-frontend:latest --confirm || \
docker save db2-day2ops-frontend:latest | oc import-image db2-day2ops-frontend:latest --from=- --confirm

echo "✅ Images loaded"
echo ""

# Step 6: Deploy backend
echo "🚀 Step 6: Deploying backend..."
oc apply -f openshift/04-backend-deployment.yaml
echo "✅ Backend deployed"
echo ""

# Step 7: Deploy frontend
echo "🚀 Step 7: Deploying frontend..."
oc apply -f openshift/05-frontend-deployment.yaml
echo "✅ Frontend deployed"
echo ""

# Step 8: Wait for deployments
echo "⏳ Step 8: Waiting for deployments to be ready..."
echo "Waiting for backend..."
oc wait --for=condition=available --timeout=300s deployment/db2-day2ops-backend -n db2-day2ops

echo "Waiting for frontend..."
oc wait --for=condition=available --timeout=300s deployment/db2-day2ops-frontend -n db2-day2ops

echo "✅ All deployments ready"
echo ""

# Step 9: Get route URL
echo "🌐 Step 9: Getting application URL..."
ROUTE_URL=$(oc get route db2-day2ops -n db2-day2ops -o jsonpath='{.spec.host}')
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   ✅ Deployment Complete!                                 ║"
echo "║                                                           ║"
echo "║   Application URL:                                        ║"
echo "║   https://$ROUTE_URL"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Step 10: Show pod status
echo "📊 Pod Status:"
oc get pods -n db2-day2ops
echo ""

echo "📝 To view logs:"
echo "   Backend:  oc logs -f deployment/db2-day2ops-backend -n db2-day2ops"
echo "   Frontend: oc logs -f deployment/db2-day2ops-frontend -n db2-day2ops"
echo ""

echo "🔍 To check application health:"
echo "   curl https://$ROUTE_URL"
echo ""

# Made with Bob
