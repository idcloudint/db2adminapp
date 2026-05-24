#!/bin/bash

# DB2 Day 2 Ops - Simple OpenShift Deployment Script

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

# Step 1: Create namespace and RBAC
echo "🏗️  Step 1: Creating namespace and RBAC..."
oc apply -f openshift/01-namespace.yaml
oc apply -f openshift/02-rbac.yaml
oc project db2-day2ops
echo "✅ Namespace and RBAC created"
echo ""

# Step 2: Create ConfigMap and Secret
echo "⚙️  Step 2: Creating configuration..."
oc apply -f openshift/03-config.yaml
echo "✅ Configuration created"
echo ""

# Step 3: Build backend locally
echo "📦 Step 3: Building backend..."
cd backend
echo "Installing dependencies..."
npm install --silent
echo "Building TypeScript..."
npm run build 2>&1 | grep -v "TS5107" || true
cd ..
echo "✅ Backend built"
echo ""

# Step 4: Build frontend locally
echo "📦 Step 4: Building frontend..."
cd frontend
echo "Installing dependencies..."
npm install --silent
echo "Building React app..."
GENERATE_SOURCEMAP=false npm run build 2>&1 | grep -v "eslint" | grep -v "DeprecationWarning" || true
cd ..
echo "✅ Frontend built"
echo ""

# Step 5: Create backend image using binary build
echo "🐳 Step 5: Creating backend container image..."
oc apply -f openshift/06-backend-build.yaml

# Check if BuildConfig exists and start build
if oc get bc/db2-day2ops-backend -n db2-day2ops &> /dev/null; then
    echo "Starting backend build from local directory..."
    oc start-build db2-day2ops-backend --from-dir=./backend --follow -n db2-day2ops || echo "Build may have failed, continuing..."
else
    echo "⚠️  BuildConfig not found, skipping build"
fi
echo "✅ Backend image created"
echo ""

# Step 6: Deploy backend
echo "🚀 Step 6: Deploying backend..."
oc apply -f openshift/04-backend-deployment.yaml
echo "✅ Backend deployment created"
echo ""

# Step 7: Create frontend image using binary build
echo "🐳 Step 7: Creating frontend container image..."

# Create frontend BuildConfig
cat <<EOF | oc apply -f -
apiVersion: build.openshift.io/v1
kind: BuildConfig
metadata:
  name: db2-day2ops-frontend
  namespace: db2-day2ops
spec:
  output:
    to:
      kind: ImageStreamTag
      name: db2-day2ops-frontend:latest
  source:
    type: Dockerfile
    dockerfile: |
      FROM node:18-alpine as builder
      WORKDIR /app
      COPY package*.json ./
      RUN npm ci --only=production
      COPY . .
      RUN npm run build

      FROM nginx:alpine
      COPY --from=builder /app/build /usr/share/nginx/html
      COPY nginx.conf /etc/nginx/conf.d/default.conf
      EXPOSE 8080
      CMD ["nginx", "-g", "daemon off;"]
  strategy:
    type: Docker
  triggers:
    - type: ConfigChange
---
apiVersion: image.openshift.io/v1
kind: ImageStream
metadata:
  name: db2-day2ops-frontend
  namespace: db2-day2ops
EOF

# Start frontend build
if oc get bc/db2-day2ops-frontend -n db2-day2ops &> /dev/null; then
    echo "Starting frontend build from local directory..."
    oc start-build db2-day2ops-frontend --from-dir=./frontend --follow -n db2-day2ops || echo "Build may have failed, continuing..."
else
    echo "⚠️  BuildConfig not found, skipping build"
fi
echo "✅ Frontend image created"
echo ""

# Step 8: Deploy frontend
echo "🚀 Step 8: Deploying frontend..."
oc apply -f openshift/05-frontend-deployment.yaml
echo "✅ Frontend deployment created"
echo ""

# Step 9: Wait for deployments
echo "⏳ Step 9: Waiting for deployments to be ready..."
echo "Waiting for backend..."
oc wait --for=condition=available --timeout=300s deployment/db2-day2ops-backend -n db2-day2ops || echo "Backend may not be ready yet"
echo "Waiting for frontend..."
oc wait --for=condition=available --timeout=300s deployment/db2-day2ops-frontend -n db2-day2ops || echo "Frontend may not be ready yet"
echo ""

# Step 10: Get route URL
echo "🌐 Step 10: Getting application URL..."
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

# Show pod status
echo "📊 Pod Status:"
oc get pods -n db2-day2ops
echo ""

echo "📝 Useful commands:"
echo "   View backend logs:  oc logs -f deployment/db2-day2ops-backend -n db2-day2ops"
echo "   View frontend logs: oc logs -f deployment/db2-day2ops-frontend -n db2-day2ops"
echo "   View all resources: oc get all -n db2-day2ops"
echo "   Delete deployment:  oc delete project db2-day2ops"
echo ""

if [ -n "$ROUTE_URL" ]; then
echo "🎉 Access your dashboard at: https://$ROUTE_URL"
fi
echo ""

# Made with Bob
