#!/bin/bash

# DB2 Day 2 Ops - Build and Push Container Images

set -e

# Configuration
REGISTRY="quay.io"
USERNAME="${QUAY_USERNAME:-your-username}"  # Set QUAY_USERNAME environment variable or edit here
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   DB2 Day 2 Ops - Build and Push Container Images        ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Registry: $REGISTRY"
echo "Username: $USERNAME"
echo "Tag: $IMAGE_TAG"
echo ""

# Check if username is set
if [ "$USERNAME" = "your-username" ]; then
    echo "❌ Error: Please set your Quay.io username"
    echo ""
    echo "Options:"
    echo "  1. Set environment variable: export QUAY_USERNAME=your-username"
    echo "  2. Edit this script and replace 'your-username' with your actual username"
    echo "  3. Run with: QUAY_USERNAME=your-username ./build-and-push.sh"
    echo ""
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if logged in to registry
echo "🔐 Checking registry login..."
if ! podman login $REGISTRY --get-login &> /dev/null; then
    echo "Not logged in to $REGISTRY"
    echo "Please login first:"
    echo "  podman login $REGISTRY"
    echo ""
    read -p "Press Enter to login now, or Ctrl+C to cancel..."
    podman login $REGISTRY
fi
echo "✅ Logged in to $REGISTRY"
echo ""

# Build backend image
echo "🐳 Step 1: Building backend image..."
cd backend
BACKEND_IMAGE="$REGISTRY/$USERNAME/db2-day2ops-backend:$IMAGE_TAG"
echo "Building: $BACKEND_IMAGE"
podman build -t $BACKEND_IMAGE -f Dockerfile .
echo "✅ Backend image built"
echo ""

# Push backend image
echo "📤 Step 2: Pushing backend image..."
podman push $BACKEND_IMAGE
echo "✅ Backend image pushed"
echo ""

# Build frontend image
echo "🐳 Step 3: Building frontend image..."
cd ../frontend
FRONTEND_IMAGE="$REGISTRY/$USERNAME/db2-day2ops-frontend:$IMAGE_TAG"
echo "Building: $FRONTEND_IMAGE"
podman build -t $FRONTEND_IMAGE -f Dockerfile .
echo "✅ Frontend image built"
echo ""

# Push frontend image
echo "📤 Step 4: Pushing frontend image..."
podman push $FRONTEND_IMAGE
echo "✅ Frontend image pushed"
echo ""

cd ..

# Update OpenShift deployments
echo "🚀 Step 5: Updating OpenShift deployments..."
echo "Updating backend deployment..."
oc set image deployment/db2-day2ops-backend \
    db2-day2ops-backend=$BACKEND_IMAGE \
    -n db2-day2ops

echo "Updating frontend deployment..."
oc set image deployment/db2-day2ops-frontend \
    db2-day2ops-frontend=$FRONTEND_IMAGE \
    -n db2-day2ops

echo "✅ Deployments updated"
echo ""

# Wait for rollout
echo "⏳ Step 6: Waiting for deployments to roll out..."
echo "Waiting for backend..."
oc rollout status deployment/db2-day2ops-backend -n db2-day2ops --timeout=5m || echo "Backend rollout may still be in progress"

echo "Waiting for frontend..."
oc rollout status deployment/db2-day2ops-frontend -n db2-day2ops --timeout=5m || echo "Frontend rollout may still be in progress"
echo ""

# Get pod status
echo "📊 Pod Status:"
oc get pods -n db2-day2ops
echo ""

# Get route
ROUTE_URL=$(oc get route db2-day2ops -n db2-day2ops -o jsonpath='{.spec.host}' 2>/dev/null || echo "")

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   ✅ Build and Push Complete!                             ║"
echo "║                                                           ║"
if [ -n "$ROUTE_URL" ]; then
echo "║   Application URL:                                        ║"
echo "║   https://$ROUTE_URL"
echo "║                                                           ║"
fi
echo "║   Images:                                                 ║"
echo "║   - $BACKEND_IMAGE"
echo "║   - $FRONTEND_IMAGE"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

if [ -n "$ROUTE_URL" ]; then
echo "🎉 Access your dashboard at: https://$ROUTE_URL"
echo ""
echo "📝 Useful commands:"
echo "   View backend logs:  oc logs -f deployment/db2-day2ops-backend -n db2-day2ops"
echo "   View frontend logs: oc logs -f deployment/db2-day2ops-frontend -n db2-day2ops"
echo "   View pods:          oc get pods -n db2-day2ops"
echo "   Restart backend:    oc rollout restart deployment/db2-day2ops-backend -n db2-day2ops"
echo "   Restart frontend:   oc rollout restart deployment/db2-day2ops-frontend -n db2-day2ops"
fi
echo ""

# Made with Bob
