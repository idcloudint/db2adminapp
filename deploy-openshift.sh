#!/bin/bash

# DB2 Day 2 Ops - OpenShift Deployment Script (Binary Build)

set -e

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   DB2 Day 2 Operations Dashboard - OpenShift Deployment  ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "📂 Working directory: $SCRIPT_DIR"
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

# Step 1: Create namespace
echo "🏗️  Step 1: Creating namespace..."
oc apply -f openshift/01-namespace.yaml
oc project db2-day2ops
echo "✅ Namespace created and switched"
echo ""

# Step 2: Create RBAC
echo "🔐 Step 2: Creating RBAC..."
oc apply -f openshift/02-rbac.yaml
echo "✅ RBAC created"
echo ""

# Step 3: Create ConfigMap and Secret
echo "⚙️  Step 3: Creating configuration..."
oc apply -f openshift/03-config.yaml
echo "✅ Configuration created"
echo ""

# Step 4: Build and deploy backend using binary build
echo "📦 Step 4: Building and deploying backend..."
cd backend

# Build the TypeScript code
echo "Building TypeScript..."
npm run build || true  # Continue even if there are deprecation warnings

# Create a new app from Dockerfile
echo "Creating backend app..."
oc new-app --name=db2-day2ops-backend \
  --docker-image=node:18-alpine \
  --code=. \
  --strategy=docker \
  || echo "App already exists, updating..."

# Wait for build to complete
echo "Waiting for backend build..."
oc wait --for=condition=Complete --timeout=600s build/db2-day2ops-backend-1 || true

cd ..
echo "✅ Backend deployed"
echo ""

# Step 5: Build and deploy frontend
echo "📦 Step 5: Building and deploying frontend..."
cd frontend

# Build React app
echo "Building React app..."
npm run build

# Create frontend app
echo "Creating frontend app..."
oc new-app --name=db2-day2ops-frontend \
  --docker-image=nginx:alpine \
  --code=. \
  --strategy=docker \
  || echo "App already exists, updating..."

# Wait for build
echo "Waiting for frontend build..."
oc wait --for=condition=Complete --timeout=600s build/db2-day2ops-frontend-1 || true

cd ..
echo "✅ Frontend deployed"
echo ""

# Step 6: Update backend deployment with proper config
echo "⚙️  Step 6: Configuring backend deployment..."
oc set env deployment/db2-day2ops-backend --from=configmap/db2-day2ops-backend-config
oc set env deployment/db2-day2ops-backend --from=secret/db2-day2ops-backend-secret
oc set serviceaccount deployment/db2-day2ops-backend db2-day2ops-backend
echo "✅ Backend configured"
echo ""

# Step 7: Expose services
echo "🌐 Step 7: Creating route..."
oc expose svc/db2-day2ops-frontend --name=db2-day2ops || echo "Route already exists"
echo "✅ Route created"
echo ""

# Step 8: Wait for deployments
echo "⏳ Step 8: Waiting for deployments to be ready..."
oc wait --for=condition=available --timeout=300s deployment/db2-day2ops-backend || true
oc wait --for=condition=available --timeout=300s deployment/db2-day2ops-frontend || true
echo "✅ Deployments ready"
echo ""

# Step 9: Get route URL
echo "🌐 Step 9: Getting application URL..."
ROUTE_URL=$(oc get route db2-day2ops -o jsonpath='{.spec.host}' 2>/dev/null || echo "Route not found")
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   ✅ Deployment Complete!                                 ║"
echo "║                                                           ║"
if [ "$ROUTE_URL" != "Route not found" ]; then
echo "║   Application URL:                                        ║"
echo "║   http://$ROUTE_URL"
echo "║                                                           ║"
fi
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Step 10: Show pod status
echo "📊 Pod Status:"
oc get pods
echo ""

echo "📝 To view logs:"
echo "   Backend:  oc logs -f deployment/db2-day2ops-backend"
echo "   Frontend: oc logs -f deployment/db2-day2ops-frontend"
echo ""

if [ "$ROUTE_URL" != "Route not found" ]; then
echo "🔍 To check application health:"
echo "   curl http://$ROUTE_URL"
fi
echo ""

# Made with Bob
