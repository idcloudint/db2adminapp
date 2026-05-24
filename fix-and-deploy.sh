#!/bin/bash

# DB2 Day 2 Ops - Fix Registry and Deploy
# This script enables the internal registry if needed, then deploys

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   DB2 Day 2 Ops - Fix Registry and Deploy                ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
if ! command -v oc &> /dev/null; then
    echo "❌ Error: oc CLI not found"
    exit 1
fi

if ! oc whoami &> /dev/null; then
    echo "❌ Error: Not logged in to OpenShift"
    exit 1
fi

echo "✅ Logged in as: $(oc whoami)"
echo "✅ Cluster: $(oc whoami --show-server)"
echo ""

# Step 1: Check internal registry status
echo "🔍 Step 1: Checking internal registry status..."
REGISTRY_STATE=$(oc get configs.imageregistry.operator.openshift.io/cluster -o jsonpath='{.spec.managementState}' 2>/dev/null || echo "NotFound")

if [ "$REGISTRY_STATE" = "Removed" ] || [ "$REGISTRY_STATE" = "NotFound" ]; then
    echo "⚠️  Internal registry is not enabled (State: $REGISTRY_STATE)"
    echo ""
    echo "The OpenShift internal registry must be enabled for builds to work."
    echo "This requires cluster-admin permissions."
    echo ""
    read -p "Do you have cluster-admin access to enable the registry? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔧 Enabling internal registry..."
        
        # Enable the registry
        oc patch configs.imageregistry.operator.openshift.io/cluster --type merge --patch '{"spec":{"managementState":"Managed"}}'
        
        # Set storage to emptyDir for testing (not for production!)
        echo "⚠️  Setting storage to emptyDir (for testing only)"
        oc patch configs.imageregistry.operator.openshift.io/cluster --type merge --patch '{"spec":{"storage":{"emptyDir":{}}}}'
        
        echo "⏳ Waiting for registry to be ready..."
        sleep 10
        
        # Wait for registry pods
        oc wait --for=condition=available --timeout=300s deployment/image-registry -n openshift-image-registry || {
            echo "⚠️  Registry may still be starting. Continuing anyway..."
        }
        
        echo "✅ Internal registry enabled"
    else
        echo ""
        echo "❌ Cannot proceed without internal registry."
        echo ""
        echo "Options:"
        echo "1. Ask your cluster admin to enable the internal registry"
        echo "2. Use an external registry (Quay.io, Docker Hub)"
        echo "3. Use a different OpenShift cluster with registry enabled"
        echo ""
        exit 1
    fi
else
    echo "✅ Internal registry is enabled (State: $REGISTRY_STATE)"
fi
echo ""

# Step 2: Ensure namespace exists
echo "🏗️  Step 2: Creating infrastructure..."
oc apply -f openshift/01-namespace.yaml
oc apply -f openshift/02-rbac.yaml
oc apply -f openshift/03-config.yaml
oc project db2-day2ops
echo "✅ Infrastructure ready"
echo ""

# Step 3: Build applications locally
echo "📦 Step 3: Building applications..."

cd backend
echo "Building backend..."
npm install --silent
npm run build 2>&1 | grep -v "TS5107" || true
cd ..

cd frontend
echo "Building frontend..."
npm install --silent
GENERATE_SOURCEMAP=false npm run build 2>&1 | grep -v "eslint\|DeprecationWarning" || true
cd ..

echo "✅ Applications built"
echo ""

# Step 4: Clean up old builds if they exist
echo "🧹 Step 4: Cleaning up old resources..."
oc delete bc/db2-day2ops-backend bc/db2-day2ops-frontend -n db2-day2ops 2>/dev/null || echo "No old BuildConfigs to delete"
oc delete is/db2-day2ops-backend is/db2-day2ops-frontend -n db2-day2ops 2>/dev/null || echo "No old ImageStreams to delete"
sleep 2
echo "✅ Cleanup complete"
echo ""

# Step 5: Create BuildConfigs and ImageStreams
echo "📋 Step 5: Creating BuildConfigs..."

cat <<EOF | oc apply -f -
apiVersion: image.openshift.io/v1
kind: ImageStream
metadata:
  name: db2-day2ops-backend
  namespace: db2-day2ops
---
apiVersion: build.openshift.io/v1
kind: BuildConfig
metadata:
  name: db2-day2ops-backend
  namespace: db2-day2ops
spec:
  output:
    to:
      kind: ImageStreamTag
      name: db2-day2ops-backend:latest
  source:
    type: Binary
    binary: {}
  strategy:
    type: Docker
    dockerStrategy:
      dockerfilePath: Dockerfile
---
apiVersion: image.openshift.io/v1
kind: ImageStream
metadata:
  name: db2-day2ops-frontend
  namespace: db2-day2ops
---
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
    type: Binary
    binary: {}
  strategy:
    type: Docker
    dockerStrategy:
      dockerfilePath: Dockerfile
EOF

echo "✅ BuildConfigs created"
echo ""

# Step 6: Start binary builds
echo "🔨 Step 6: Building container images..."

echo "Building backend image..."
oc start-build db2-day2ops-backend --from-dir=./backend --follow -n db2-day2ops

echo "Building frontend image..."
oc start-build db2-day2ops-frontend --from-dir=./frontend --follow -n db2-day2ops

echo "✅ Images built"
echo ""

# Step 7: Deploy applications
echo "🚀 Step 7: Deploying applications..."

cat <<EOF | oc apply -f -
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: db2-day2ops-backend
  namespace: db2-day2ops
  labels:
    app: db2-day2ops
    component: backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: db2-day2ops
      component: backend
  template:
    metadata:
      labels:
        app: db2-day2ops
        component: backend
    spec:
      serviceAccountName: db2-day2ops-backend
      containers:
        - name: backend
          image: db2-day2ops-backend:latest
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: 3001
              protocol: TCP
          envFrom:
            - configMapRef:
                name: db2-day2ops-backend-config
            - secretRef:
                name: db2-day2ops-backend-secret
          resources:
            requests:
              memory: "256Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 30
            periodSeconds: 30
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          volumeMounts:
            - name: logs
              mountPath: /app/logs
      volumes:
        - name: logs
          emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: db2-day2ops-backend
  namespace: db2-day2ops
  labels:
    app: db2-day2ops
    component: backend
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 3001
      targetPort: 3001
      protocol: TCP
  selector:
    app: db2-day2ops
    component: backend
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: db2-day2ops-frontend
  namespace: db2-day2ops
  labels:
    app: db2-day2ops
    component: frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: db2-day2ops
      component: frontend
  template:
    metadata:
      labels:
        app: db2-day2ops
        component: frontend
    spec:
      containers:
        - name: frontend
          image: db2-day2ops-frontend:latest
          imagePullPolicy: Always
          ports:
            - name: http
              containerPort: 8080
              protocol: TCP
          resources:
            requests:
              memory: "128Mi"
              cpu: "50m"
            limits:
              memory: "256Mi"
              cpu: "200m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 30
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
---
apiVersion: v1
kind: Service
metadata:
  name: db2-day2ops-frontend
  namespace: db2-day2ops
  labels:
    app: db2-day2ops
    component: frontend
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 8080
      targetPort: 8080
      protocol: TCP
  selector:
    app: db2-day2ops
    component: frontend
---
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: db2-day2ops
  namespace: db2-day2ops
  labels:
    app: db2-day2ops
spec:
  to:
    kind: Service
    name: db2-day2ops-frontend
    weight: 100
  port:
    targetPort: http
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
  wildcardPolicy: None
EOF

echo "✅ Deployments created"
echo ""

# Step 8: Set image triggers
echo "🔄 Step 8: Configuring automatic updates..."
oc set triggers deployment/db2-day2ops-backend --from-image=db2-day2ops-backend:latest --containers=backend -n db2-day2ops
oc set triggers deployment/db2-day2ops-frontend --from-image=db2-day2ops-frontend:latest --containers=frontend -n db2-day2ops
echo "✅ Triggers configured"
echo ""

# Step 9: Wait for rollout
echo "⏳ Step 9: Waiting for deployments..."
sleep 5
oc rollout status deployment/db2-day2ops-backend -n db2-day2ops --timeout=5m || echo "⚠️  Backend may still be starting"
oc rollout status deployment/db2-day2ops-frontend -n db2-day2ops --timeout=5m || echo "⚠️  Frontend may still be starting"
echo ""

# Get route
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

echo "📊 Pod Status:"
oc get pods -n db2-day2ops
echo ""

echo "📝 Useful commands:"
echo "   Backend logs:  oc logs -f deployment/db2-day2ops-backend -n db2-day2ops"
echo "   Frontend logs: oc logs -f deployment/db2-day2ops-frontend -n db2-day2ops"
echo "   Rebuild:       oc start-build db2-day2ops-backend --from-dir=./backend --follow"
echo "   All resources: oc get all -n db2-day2ops"
echo ""

if [ -n "$ROUTE_URL" ]; then
    echo "🎉 Access your dashboard at: https://$ROUTE_URL"
fi
echo ""

# Made with Bob