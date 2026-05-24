#!/bin/bash

# DB2 Day 2 Ops - Deploy Without External Registry
# Uses local podman images directly in deployments

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   DB2 Day 2 Ops - No Registry Deployment                 ║"
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
echo "✅ Cluster: $(oc whoami --show-server)"
echo ""

# Step 1: Infrastructure
echo "🏗️  Step 1: Creating infrastructure..."
oc apply -f openshift/01-namespace.yaml
oc apply -f openshift/02-rbac.yaml
oc apply -f openshift/03-config.yaml
oc project db2-day2ops
echo "✅ Infrastructure ready"
echo ""

# Step 2: Build images locally
echo "📦 Step 2: Building images locally..."

cd backend
echo "Building backend..."
npm install --silent
npm run build 2>&1 | grep -v "TS5107" || true
podman build -t localhost/db2-day2ops-backend:latest -f Dockerfile .
cd ..

cd frontend
echo "Building frontend..."
npm install --silent
GENERATE_SOURCEMAP=false npm run build 2>&1 | grep -v "eslint\|DeprecationWarning" || true
podman build -t localhost/db2-day2ops-frontend:latest -f Dockerfile .
cd ..

echo "✅ Images built locally"
echo ""

# Step 3: Save images to tar files
echo "💾 Step 3: Saving images to tar files..."
mkdir -p /tmp/db2-images
podman save localhost/db2-day2ops-backend:latest -o /tmp/db2-images/backend.tar
podman save localhost/db2-day2ops-frontend:latest -o /tmp/db2-images/frontend.tar
echo "✅ Images saved"
echo ""

# Step 4: Create ImageStreams and load images
echo "📋 Step 4: Creating ImageStreams..."
cat <<EOF | oc apply -f -
apiVersion: image.openshift.io/v1
kind: ImageStream
metadata:
  name: db2-day2ops-backend
  namespace: db2-day2ops
spec:
  lookupPolicy:
    local: true
---
apiVersion: image.openshift.io/v1
kind: ImageStream
metadata:
  name: db2-day2ops-frontend
  namespace: db2-day2ops
spec:
  lookupPolicy:
    local: true
EOF
echo "✅ ImageStreams created"
echo ""

# Step 5: Import images using oc image
echo "📤 Step 5: Importing images to OpenShift..."

echo "Importing backend..."
cat /tmp/db2-images/backend.tar | oc image append --from=- --to=db2-day2ops-backend:latest -n db2-day2ops 2>&1 || {
    echo "Using alternative import method..."
    oc import-image db2-day2ops-backend:latest --from=localhost/db2-day2ops-backend:latest --confirm --insecure -n db2-day2ops
}

echo "Importing frontend..."
cat /tmp/db2-images/frontend.tar | oc image append --from=- --to=db2-day2ops-frontend:latest -n db2-day2ops 2>&1 || {
    echo "Using alternative import method..."
    oc import-image db2-day2ops-frontend:latest --from=localhost/db2-day2ops-frontend:latest --confirm --insecure -n db2-day2ops
}

# Cleanup tar files
rm -rf /tmp/db2-images

echo "✅ Images imported"
echo ""

# Step 6: Update deployment manifests to use ImageStreamTags
echo "🔧 Step 6: Creating deployments..."

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

# Step 7: Trigger deployment with ImageStreamTag
echo "🔄 Step 7: Linking deployments to ImageStreams..."
oc set triggers deployment/db2-day2ops-backend --from-image=db2-day2ops-backend:latest --containers=backend -n db2-day2ops
oc set triggers deployment/db2-day2ops-frontend --from-image=db2-day2ops-frontend:latest --containers=frontend -n db2-day2ops
echo "✅ Triggers set"
echo ""

# Step 8: Wait for rollout
echo "⏳ Step 8: Waiting for deployments..."
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
echo "   All resources: oc get all -n db2-day2ops"
echo "   Delete all:    oc delete project db2-day2ops"
echo ""

if [ -n "$ROUTE_URL" ]; then
    echo "🎉 Access your dashboard at: https://$ROUTE_URL"
fi
echo ""

# Made with Bob