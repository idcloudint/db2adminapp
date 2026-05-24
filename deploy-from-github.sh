#!/bin/bash

# DB2 Day 2 Ops - Deploy from GitHub Repository
# Git repo → OpenShift BuildConfig → ImageStream → Deployment

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Configuration
GITHUB_REPO="https://github.com/idcloudint/db2adminapp.git"
GITHUB_BRANCH="main"
NAMESPACE="db2-day2ops"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║   DB2 Day 2 Ops - Deploy from GitHub                     ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Repository: $GITHUB_REPO"
echo "Branch: $GITHUB_BRANCH"
echo "Namespace: $NAMESPACE"
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

# Step 1: Create infrastructure
echo "🏗️  Step 1: Creating infrastructure..."
oc apply -f - <<EOF
---
apiVersion: v1
kind: Namespace
metadata:
  name: $NAMESPACE
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: db2-day2ops-backend
  namespace: $NAMESPACE
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: db2-day2ops-monitor
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log", "pods/exec"]
    verbs: ["get", "list", "watch", "create"]
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["persistentvolumeclaims"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: db2-day2ops-monitor-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: db2-day2ops-monitor
subjects:
  - kind: ServiceAccount
    name: db2-day2ops-backend
    namespace: $NAMESPACE
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: db2-day2ops-backend-config
  namespace: $NAMESPACE
data:
  PORT: "3001"
  NODE_ENV: "production"
  DB2_NAMESPACE: "db2-community"
  DB2_POD_LABEL: "app=db2"
  DB2_SERVICE: "db2-service"
  DB2_PORT: "50000"
  DB2_DATABASE: "SAMPLE"
  DB2_USER: "db2inst1"
  COLLECTION_INTERVAL_POD: "60000"
  COLLECTION_INTERVAL_DB2: "60000"
  COLLECTION_INTERVAL_STORAGE: "120000"
  COLLECTION_INTERVAL_BACKUP: "300000"
  CORS_ORIGIN: "*"
---
apiVersion: v1
kind: Secret
metadata:
  name: db2-day2ops-backend-secret
  namespace: $NAMESPACE
type: Opaque
stringData:
  DB2_PASSWORD: "db2inst1-pwd"
EOF

oc project $NAMESPACE
echo "✅ Infrastructure created"
echo ""

# Step 2: Create BuildConfig for Frontend
echo "🔨 Step 2: Creating Frontend BuildConfig..."
oc apply -f - <<EOF
---
apiVersion: image.openshift.io/v1
kind: ImageStream
metadata:
  name: db2-day2ops-frontend
  namespace: $NAMESPACE
  labels:
    app: db2-day2ops
    component: frontend
---
apiVersion: build.openshift.io/v1
kind: BuildConfig
metadata:
  name: db2-day2ops-frontend
  namespace: $NAMESPACE
  labels:
    app: db2-day2ops
    component: frontend
spec:
  output:
    to:
      kind: ImageStreamTag
      name: db2-day2ops-frontend:latest
  source:
    type: Git
    git:
      uri: $GITHUB_REPO
      ref: $GITHUB_BRANCH
    contextDir: frontend
  strategy:
    type: Docker
    dockerStrategy:
      dockerfilePath: Dockerfile
  triggers:
    - type: ConfigChange
    - type: ImageChange
EOF

echo "✅ Frontend BuildConfig created"
echo ""

# Step 3: Create BuildConfig for Backend
echo "🔨 Step 3: Creating Backend BuildConfig..."
oc apply -f - <<EOF
---
apiVersion: image.openshift.io/v1
kind: ImageStream
metadata:
  name: db2-day2ops-backend
  namespace: $NAMESPACE
  labels:
    app: db2-day2ops
    component: backend
---
apiVersion: build.openshift.io/v1
kind: BuildConfig
metadata:
  name: db2-day2ops-backend
  namespace: $NAMESPACE
  labels:
    app: db2-day2ops
    component: backend
spec:
  output:
    to:
      kind: ImageStreamTag
      name: db2-day2ops-backend:latest
  source:
    type: Git
    git:
      uri: $GITHUB_REPO
      ref: $GITHUB_BRANCH
    contextDir: backend
  strategy:
    type: Docker
    dockerStrategy:
      dockerfilePath: Dockerfile
  triggers:
    - type: ConfigChange
    - type: ImageChange
EOF

echo "✅ Backend BuildConfig created"
echo ""

# Step 4: Start builds
echo "🚀 Step 4: Starting builds..."

echo "Building backend..."
oc start-build db2-day2ops-backend --follow -n $NAMESPACE

echo ""
echo "Building frontend..."
oc start-build db2-day2ops-frontend --follow -n $NAMESPACE

echo "✅ Builds completed"
echo ""

# Step 5: Create Deployments
echo "📦 Step 5: Creating deployments..."
oc apply -f - <<EOF
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: db2-day2ops-backend
  namespace: $NAMESPACE
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
          image: image-registry.openshift-image-registry.svc:5000/$NAMESPACE/db2-day2ops-backend:latest
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
          readinessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: db2-day2ops-backend
  namespace: $NAMESPACE
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
  namespace: $NAMESPACE
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
          image: image-registry.openshift-image-registry.svc:5000/$NAMESPACE/db2-day2ops-frontend:latest
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
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: db2-day2ops-frontend
  namespace: $NAMESPACE
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
  namespace: $NAMESPACE
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

# Step 6: Configure image triggers
echo "🔄 Step 6: Configuring automatic updates..."
oc set triggers deployment/db2-day2ops-backend --from-image=$NAMESPACE/db2-day2ops-backend:latest --containers=backend -n $NAMESPACE
oc set triggers deployment/db2-day2ops-frontend --from-image=$NAMESPACE/db2-day2ops-frontend:latest --containers=frontend -n $NAMESPACE
echo "✅ Triggers configured"
echo ""

# Step 7: Wait for rollout
echo "⏳ Step 7: Waiting for deployments..."
sleep 5
oc rollout status deployment/db2-day2ops-backend -n $NAMESPACE --timeout=5m || echo "⚠️  Backend may still be starting"
oc rollout status deployment/db2-day2ops-frontend -n $NAMESPACE --timeout=5m || echo "⚠️  Frontend may still be starting"
echo ""

# Get route
ROUTE_URL=$(oc get route db2-day2ops -n $NAMESPACE -o jsonpath='{.spec.host}' 2>/dev/null || echo "")

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
oc get pods -n $NAMESPACE
echo ""

echo "📝 Useful commands:"
echo "   Backend logs:   oc logs -f deployment/db2-day2ops-backend -n $NAMESPACE"
echo "   Frontend logs:  oc logs -f deployment/db2-day2ops-frontend -n $NAMESPACE"
echo "   Rebuild backend: oc start-build db2-day2ops-backend -n $NAMESPACE"
echo "   Rebuild frontend: oc start-build db2-day2ops-frontend -n $NAMESPACE"
echo "   All resources:  oc get all -n $NAMESPACE"
echo ""

if [ -n "$ROUTE_URL" ]; then
    echo "🎉 Access your dashboard at: https://$ROUTE_URL"
fi
echo ""

echo "📌 To update the application after code changes:"
echo "   1. Push changes to GitHub"
echo "   2. Run: oc start-build db2-day2ops-frontend -n $NAMESPACE"
echo "   3. Run: oc start-build db2-day2ops-backend -n $NAMESPACE"
echo ""

# Made with Bob