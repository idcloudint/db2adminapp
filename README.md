# DB2 Day 2 Operations Dashboard

A real-time monitoring dashboard for DB2 Community Edition on OpenShift with beginner-friendly explanations and critical alert system.

## 🎯 Features

### ✅ Implemented
- **Real-time Updates** - WebSocket connection updates data every 60 seconds without page refresh
- **Pod Health Monitoring** - Tracks DB2 container status, restarts, and events
- **DB2 Engine Monitoring** - Monitors database engine, connections, and state
- **Critical Alert System** - Big red warning overlay for critical issues
- **Traffic Light System** - Green/Yellow/Red/Gray status indicators
- **Beginner-Friendly** - Plain English explanations and recommendations
- **Carbon Design System** - Professional IBM look and feel
- **Responsive Design** - Works on desktop, tablet, and mobile

### 🚧 Coming Soon
- Storage monitoring (PVC, tablespaces, transaction logs)
- Backup validation and reporting
- Incident tracking with evidence collection
- DBA dictionary with term explanations
- Daily reports and metrics
- Safety guardrails for dangerous operations

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│   React Frontend (Port 3000)            │
│   - Carbon Design System                │
│   - Real-time WebSocket updates         │
│   - Critical alert overlays             │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│   Node.js Backend (Port 3001)           │
│   - Express REST API                    │
│   - WebSocket Server                    │
│   - Health collectors                   │
└────────────┬────────────────────────────┘
             │
        ┌────┴────┐
        ▼         ▼
┌─────────────┐ ┌──────────────┐
│  OpenShift  │ │  DB2 Pod     │
│  API        │ │  (SAMPLE DB) │
└─────────────┘ └──────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Access to OpenShift cluster with DB2 Community Edition
- DB2 SAMPLE database running

### Installation

1. **Clone or navigate to the project:**
```bash
cd db2-day2ops-app
```

2. **Start both backend and frontend:**
```bash
./start-dev.sh
```

This will:
- Install dependencies if needed
- Start backend on http://localhost:3001
- Start frontend on http://localhost:3000
- Open browser automatically

### Manual Start

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend (in another terminal):**
```bash
cd frontend
npm install
npm start
```

## 📋 Configuration

### Backend Configuration

Edit `backend/.env`:

```bash
# Server
PORT=3001
NODE_ENV=development

# DB2 Connection
DB2_NAMESPACE=db2-community
DB2_POD_LABEL=app=db2
DB2_SERVICE=db2-service
DB2_PORT=50000
DB2_DATABASE=SAMPLE
DB2_USER=db2inst1
DB2_PASSWORD=db2inst1-pwd

# OpenShift
KUBECONFIG_PATH=  # Leave empty for in-cluster, or path to kubeconfig

# Collection Intervals (milliseconds)
COLLECTION_INTERVAL_POD=60000
COLLECTION_INTERVAL_DB2=60000

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Frontend Configuration

Edit `frontend/.env`:

```bash
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=ws://localhost:3001/ws
```

## 🎨 User Interface

### Dashboard Layout

1. **Header**
   - Application title
   - Real-time connection indicator (spinning icon when connected)

2. **Overall Status Banner**
   - System-wide health status
   - Critical issue count

3. **Health Cards Grid**
   - Pod Health Card
   - DB2 Engine Card
   - Storage Card (placeholder)
   - Backup Card (placeholder)

4. **Footer**
   - Last update timestamp
   - Auto-update notification

### Critical Alert System

When a critical issue is detected:
- **Full-screen red overlay** appears
- **Large warning icon** pulses
- **"CRITICAL ALERT"** title in big letters
- **Issue description** in plain English
- **Immediate action required** notification
- **Dismissible** but reappears if issue persists

### Health Status Colors

- 🟢 **Green (Healthy)** - Everything working perfectly
- 🟡 **Yellow (Warning)** - Minor issues, system functional
- 🔴 **Red (Critical)** - Major problems, immediate action needed
- ⚪ **Gray (Unknown)** - Cannot determine status

## 📊 API Endpoints

### REST API

```
GET  /health                    # Server health check
GET  /api/health/summary        # Overall health summary
GET  /api/health/pod            # Pod health only
GET  /api/health/db2            # DB2 health only
GET  /api/health/storage        # Storage health
GET  /api/health/backup         # Backup health
```

### WebSocket

```
WS   /ws                        # Real-time updates

Messages:
- health_update: New health data
- heartbeat: Keep-alive ping
```

## 🔧 Development

### Project Structure

```
db2-day2ops-app/
├── backend/
│   ├── src/
│   │   ├── collectors/         # Data collectors
│   │   ├── services/           # Business logic
│   │   ├── routes/             # API routes
│   │   ├── types/              # TypeScript types
│   │   ├── utils/              # Utilities
│   │   ├── config/             # Configuration
│   │   └── index.ts            # Main server
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── services/           # API & WebSocket
│   │   ├── types/              # TypeScript types
│   │   ├── App.tsx             # Main app
│   │   └── App.scss            # Styles
│   ├── package.json
│   └── tsconfig.json
├── openshift/                  # Deployment manifests (TBD)
├── docs/                       # Documentation
└── start-dev.sh               # Development startup script
```

### Adding New Features

1. **Backend Collector:**
   - Create collector in `backend/src/collectors/`
   - Add to health service
   - Create API route

2. **Frontend Component:**
   - Create component in `frontend/src/components/`
   - Add to Dashboard
   - Style with Carbon Design

### Building for Production

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve the build/ directory
```

## 🐛 Troubleshooting

### Backend won't start
- Check if port 3001 is available
- Verify OpenShift connection
- Check DB2 pod is running

### Frontend won't connect
- Ensure backend is running
- Check CORS settings
- Verify WebSocket URL

### No data showing
- Check backend logs
- Verify DB2 pod label matches config
- Test OpenShift API access

### Critical alert won't dismiss
- Fix the underlying critical issue
- Alert will reappear until issue is resolved

## 📚 Documentation

- [Implementation Plan](../DB2-DAY2OPS-APP-PLAN.md)
- [Quick Start Guide](../DB2-DAY2OPS-APP-QUICKSTART.md)
- [Backend Status](BACKEND-IMPLEMENTATION-STATUS.md)

## 🎯 Roadmap

### Phase 1: Foundation ✅
- Backend API with health collectors
- Frontend with real-time updates
- Critical alert system

### Phase 2: Enhanced Monitoring (Next)
- Storage monitoring
- Backup validation
- Incident tracking

### Phase 3: Intelligence
- Recommendation engine
- Daily reports
- Trend analysis

### Phase 4: Assistant Features
- DBA dictionary
- Contextual help
- Guided troubleshooting

### Phase 5: Safety & Security
- Read-only mode
- Approval workflows
- Audit logging

## 🤝 Contributing

This is an internal tool. For questions or issues, contact the development team.

## 📄 License

Internal use only.

---

**Version:** 1.0.0  
**Last Updated:** 2026-05-24  
**Status:** Phase 1 Complete, Phase 2 In Progress