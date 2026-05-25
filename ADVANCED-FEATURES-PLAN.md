# DB2 Day 2 Ops Dashboard - Advanced Features Implementation Plan

## Overview

This document outlines the implementation plan for adding advanced features to the DB2 Day 2 Operations Dashboard, including navigation menu, daily admin tasks automation, AI-powered root cause analysis, complex investigation with document search, and IBM Support log collection.

## Feature Requirements

### 1. Hamburger Navigation Menu
- **Purpose**: Provide easy navigation between different sections
- **Implementation**: Carbon Design System HeaderNavigation component
- **Pages**:
  1. Dashboard (existing)
  2. Daily Admin Tasks
  3. Root Cause Analysis
  4. Complex Investigation
  5. IBM Support Log Collector

### 2. Daily Admin Tasks Page
- **Purpose**: Automate daily DB2 health checks from db2day2ops.docx
- **Features**:
  - Button to run all daily tasks
  - Real-time progress indicator
  - Results display (pass/fail/warning)
  - Run history with timestamps
  - Export results to PDF/CSV
- **Tasks to Automate** (from db2day2ops.docx):
  - Instance and database availability check
  - Tablespace and storage health
  - Transaction log health
  - DB2 diagnostic log review
  - Connection health
  - Lock and blocking analysis
  - Backup verification

### 3. Root Cause Analysis (RCA) Page
- **Purpose**: AI-powered problem diagnosis
- **AI Integration**: Mistral AI API
- **API Key**: `oE8gysj6LEf0n77fbXbai6gwiWchWZKm`
- **Features**:
  - Text input for problem description
  - AI determines relevant DB2 commands to run
  - Execute commands automatically
  - Parse DB2 diagnostic logs
  - Display results in:
    - Technical language (for DBAs)
    - High-level language (for managers/beginners)
  - Suggested remediation steps
  - Save analysis history

### 4. Complex Investigation Page
- **Purpose**: Deep dive using IBM documentation
- **Integration**: MCP document crawler
- **Features**:
  - Search IBM DB2 documentation
  - Search IBM Support pages
  - AI-powered conclusion generation
  - Recommended commands with execute buttons
  - Command execution results
  - Investigation history
  - Export investigation report

### 5. IBM Support Log Collector
- **Purpose**: Collect logs for IBM Support cases
- **Storage**: NFS server
- **Features**:
  - One-click log collection
  - Collects:
    - db2diag.log
    - db2support output
    - Database configuration
    - Instance configuration
    - Recent backup history
    - HADR status (if applicable)
    - Package cache statistics
    - Lock wait information
    - Recent SQL errors
  - Progress indicator
  - Automatic compression (tar.gz)
  - Upload to NFS server
  - Download link generation
  - Collection history

## Architecture Design

### Frontend Architecture

```
src/
├── components/
│   ├── Navigation/
│   │   ├── HeaderNav.tsx          # Hamburger menu
│   │   └── SideNav.tsx            # Side navigation
│   ├── Dashboard/                 # Existing
│   │   ├── Dashboard.tsx
│   │   ├── HealthCard.tsx
│   │   └── CriticalAlert.tsx
│   ├── DailyTasks/
│   │   ├── DailyTasksPage.tsx     # Main page
│   │   ├── TaskRunner.tsx         # Task execution component
│   │   ├── TaskResults.tsx        # Results display
│   │   └── TaskHistory.tsx        # History table
│   ├── RootCauseAnalysis/
│   │   ├── RCAPage.tsx            # Main page
│   │   ├── ProblemInput.tsx       # Problem description input
│   │   ├── AIAnalysis.tsx         # AI analysis display
│   │   ├── CommandExecutor.tsx    # Command execution
│   │   └── RCAHistory.tsx         # Analysis history
│   ├── Investigation/
│   │   ├── InvestigationPage.tsx  # Main page
│   │   ├── DocumentSearch.tsx     # IBM doc search
│   │   ├── SearchResults.tsx      # Search results
│   │   ├── CommandPanel.tsx       # Execute commands
│   │   └── InvestigationReport.tsx # Report generation
│   └── LogCollector/
│       ├── LogCollectorPage.tsx   # Main page
│       ├── CollectionConfig.tsx   # Configure what to collect
│       ├── CollectionProgress.tsx # Progress indicator
│       └── CollectionHistory.tsx  # Collection history
├── services/
│   ├── api.service.ts             # Existing
│   ├── websocket.service.ts       # Existing
│   ├── dailyTasks.service.ts      # Daily tasks API
│   ├── mistralAI.service.ts       # Mistral AI integration
│   ├── mcp.service.ts             # MCP document crawler
│   └── logCollector.service.ts    # Log collection API
├── types/
│   ├── index.ts                   # Existing types
│   ├── dailyTasks.types.ts        # Daily tasks types
│   ├── rca.types.ts               # RCA types
│   ├── investigation.types.ts     # Investigation types
│   └── logCollector.types.ts      # Log collector types
└── App.tsx                        # Add routing
```

### Backend Architecture

```
src/
├── index.ts                       # Existing
├── collectors/
│   ├── openshift.collector.ts     # Existing
│   ├── db2.collector.ts           # Existing
│   └── dailyTasks.collector.ts    # NEW: Daily tasks execution
├── services/
│   ├── health.service.ts          # Existing
│   ├── dailyTasks.service.ts      # NEW: Daily tasks orchestration
│   ├── mistralAI.service.ts       # NEW: Mistral AI integration
│   ├── mcp.service.ts             # NEW: MCP document crawler
│   ├── logCollector.service.ts    # NEW: Log collection
│   └── nfs.service.ts             # NEW: NFS storage operations
├── routes/
│   ├── health.routes.ts           # Existing
│   ├── dailyTasks.routes.ts       # NEW: Daily tasks endpoints
│   ├── rca.routes.ts              # NEW: RCA endpoints
│   ├── investigation.routes.ts    # NEW: Investigation endpoints
│   └── logCollector.routes.ts     # NEW: Log collector endpoints
├── utils/
│   ├── logger.ts                  # Existing
│   ├── db2Commands.ts             # NEW: DB2 command templates
│   └── logParser.ts               # NEW: Parse DB2 logs
└── config/
    └── index.ts                   # Add new config
```

## Implementation Phases

### Phase 1: Navigation & Routing (2-3 hours)
1. Install React Router DOM
2. Create HeaderNav component with hamburger menu
3. Create SideNav component
4. Set up routing in App.tsx
5. Create placeholder pages for each section
6. Test navigation flow

**Deliverables:**
- Working navigation menu
- All pages accessible via routes
- Responsive design

### Phase 2: Daily Admin Tasks (4-6 hours)
1. **Backend:**
   - Create `dailyTasks.collector.ts` to execute DB2 commands
   - Implement task execution logic
   - Create task history storage (in-memory or database)
   - Create REST API endpoints

2. **Frontend:**
   - Create DailyTasksPage component
   - Implement task runner with progress tracking
   - Display results with pass/fail indicators
   - Show task history table
   - Add export functionality

**Tasks to Implement:**
- Instance availability check
- Database availability check
- Tablespace utilization check
- Transaction log health check
- Diagnostic log review (last 24h)
- Connection count check
- Lock wait analysis
- Backup verification

**Deliverables:**
- Automated daily health checks
- Visual results display
- Run history tracking
- Export capability

### Phase 3: Root Cause Analysis with Mistral AI (6-8 hours)
1. **Backend:**
   - Create `mistralAI.service.ts` for API integration
   - Implement prompt engineering for DB2 problems
   - Create command determination logic
   - Execute commands and collect results
   - Parse DB2 diagnostic logs
   - Generate technical and high-level explanations
   - Store analysis history

2. **Frontend:**
   - Create RCAPage component
   - Problem description input with rich text
   - AI analysis display (loading, results)
   - Command execution panel
   - Dual-language results (technical + high-level)
   - Analysis history viewer

**Mistral AI Integration:**
```typescript
// Example prompt structure
const prompt = `
You are a DB2 database expert. Analyze this problem:
${problemDescription}

Current DB2 status:
${db2Status}

Determine:
1. What DB2 commands should be run to diagnose this issue
2. What logs should be checked
3. Likely root causes
4. Recommended remediation steps

Provide response in JSON format.
`;
```

**Deliverables:**
- AI-powered problem analysis
- Automatic command determination
- Dual-language explanations
- Analysis history

### Phase 4: Complex Investigation with MCP (8-10 hours)
1. **Backend:**
   - Integrate MCP document crawler
   - Search IBM DB2 documentation
   - Search IBM Support pages
   - Parse and rank search results
   - Generate investigation conclusions
   - Execute recommended commands
   - Store investigation history

2. **Frontend:**
   - Create InvestigationPage component
   - Document search interface
   - Search results display with relevance ranking
   - Command recommendation panel
   - Execute buttons for each command
   - Investigation report generation
   - History viewer

**MCP Integration:**
- Search IBM DB2 Knowledge Center
- Search IBM Support forums
- Search IBM Technotes
- Rank results by relevance
- Extract command examples

**Deliverables:**
- Document search capability
- AI-powered conclusions
- Command execution
- Investigation reports

### Phase 5: IBM Support Log Collector (4-6 hours)
1. **Backend:**
   - Create `logCollector.service.ts`
   - Implement log collection logic:
     - db2diag.log (last 7 days)
     - db2support output
     - Database configuration
     - Instance configuration
     - Backup history
     - HADR status
     - Package cache stats
     - Lock information
   - Create `nfs.service.ts` for NFS operations
   - Compress collected logs (tar.gz)
   - Upload to NFS server
   - Generate download links
   - Store collection history

2. **Frontend:**
   - Create LogCollectorPage component
   - Collection configuration panel
   - Start collection button
   - Progress indicator
   - Download link display
   - Collection history table

**NFS Configuration:**
- NFS server mount point
- Directory structure
- File naming convention
- Retention policy

**Deliverables:**
- One-click log collection
- NFS storage integration
- Download capability
- Collection history

## Technical Specifications

### API Endpoints

#### Daily Tasks
```
POST   /api/daily-tasks/run          # Run all daily tasks
GET    /api/daily-tasks/status/:id   # Get task run status
GET    /api/daily-tasks/history      # Get run history
GET    /api/daily-tasks/results/:id  # Get specific run results
```

#### Root Cause Analysis
```
POST   /api/rca/analyze              # Submit problem for analysis
GET    /api/rca/status/:id           # Get analysis status
POST   /api/rca/execute-command      # Execute recommended command
GET    /api/rca/history              # Get analysis history
GET    /api/rca/results/:id          # Get specific analysis
```

#### Investigation
```
POST   /api/investigation/search     # Search IBM documentation
GET    /api/investigation/results/:id # Get search results
POST   /api/investigation/execute    # Execute command
GET    /api/investigation/history    # Get investigation history
GET    /api/investigation/report/:id # Generate report
```

#### Log Collector
```
POST   /api/logs/collect             # Start log collection
GET    /api/logs/status/:id          # Get collection status
GET    /api/logs/download/:id        # Download collected logs
GET    /api/logs/history             # Get collection history
DELETE /api/logs/:id                 # Delete old collection
```

### Data Models

#### DailyTaskRun
```typescript
interface DailyTaskRun {
  id: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  tasks: TaskResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

interface TaskResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details: any;
  duration: number;
}
```

#### RCAAnalysis
```typescript
interface RCAAnalysis {
  id: string;
  timestamp: Date;
  problemDescription: string;
  aiAnalysis: {
    commands: string[];
    logChecks: string[];
    rootCauses: string[];
    remediation: string[];
  };
  commandResults: CommandResult[];
  technicalExplanation: string;
  highLevelExplanation: string;
  status: 'analyzing' | 'completed' | 'failed';
}
```

#### Investigation
```typescript
interface Investigation {
  id: string;
  timestamp: Date;
  query: string;
  searchResults: SearchResult[];
  conclusion: string;
  recommendedCommands: string[];
  commandResults: CommandResult[];
  status: 'searching' | 'completed' | 'failed';
}
```

#### LogCollection
```typescript
interface LogCollection {
  id: string;
  timestamp: Date;
  status: 'collecting' | 'compressing' | 'uploading' | 'completed' | 'failed';
  files: string[];
  size: number;
  nfsPath: string;
  downloadUrl: string;
}
```

## Configuration Requirements

### Environment Variables

```bash
# Mistral AI
MISTRAL_API_KEY=oE8gysj6LEf0n77fbXbai6gwiWchWZKm
MISTRAL_API_URL=https://api.mistral.ai/v1

# MCP Document Crawler
MCP_SERVER_URL=http://mcp-server:3000
MCP_TIMEOUT=30000

# NFS Storage
NFS_SERVER=nfs-server.example.com
NFS_MOUNT_PATH=/mnt/db2-logs
NFS_BASE_PATH=/db2-support-logs
NFS_RETENTION_DAYS=90

# DB2 Configuration (existing)
DB2_NAMESPACE=db2-community
DB2_POD_LABEL=app=db2
DB2_DATABASE=SAMPLE
DB2_USER=db2inst1
```

### OpenShift Resources

#### NFS PersistentVolume
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: db2-logs-pv
spec:
  capacity:
    storage: 100Gi
  accessModes:
    - ReadWriteMany
  nfs:
    server: nfs-server.example.com
    path: /exports/db2-logs
```

#### NFS PersistentVolumeClaim
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db2-logs-pvc
  namespace: db2-day2ops
spec:
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 100Gi
```

## Dependencies

### New NPM Packages

**Backend:**
```json
{
  "@mistralai/mistralai": "^0.1.0",
  "tar": "^6.2.0",
  "archiver": "^6.0.0",
  "node-nfs": "^1.0.0"
}
```

**Frontend:**
```json
{
  "react-router-dom": "^6.20.0",
  "@carbon/react": "^1.45.0",
  "react-markdown": "^9.0.0",
  "recharts": "^2.10.0"
}
```

## Testing Strategy

### Unit Tests
- Daily tasks execution logic
- Mistral AI prompt generation
- Log parsing functions
- NFS operations

### Integration Tests
- End-to-end daily tasks flow
- RCA with AI integration
- Document search and command execution
- Log collection and NFS upload

### User Acceptance Tests
- Navigation flow
- Daily tasks execution and results
- RCA problem submission and analysis
- Investigation search and execution
- Log collection and download

## Security Considerations

1. **API Key Protection:**
   - Store Mistral AI key in Kubernetes Secret
   - Never expose in frontend code
   - Rotate keys regularly

2. **Command Execution:**
   - Whitelist allowed DB2 commands
   - Validate command parameters
   - Log all command executions
   - Implement rate limiting

3. **NFS Access:**
   - Restrict write permissions
   - Implement file size limits
   - Automatic cleanup of old files
   - Audit log access

4. **AI Integration:**
   - Sanitize user inputs
   - Validate AI responses
   - Implement timeout mechanisms
   - Monitor API usage

## Performance Considerations

1. **Daily Tasks:**
   - Run tasks asynchronously
   - Implement task queuing
   - Cache results for 5 minutes
   - Limit concurrent executions

2. **AI Analysis:**
   - Implement request queuing
   - Set timeout limits (30s)
   - Cache similar analyses
   - Rate limit per user

3. **Document Search:**
   - Implement search result caching
   - Limit results per page
   - Async loading of details
   - Debounce search input

4. **Log Collection:**
   - Stream large files
   - Compress before upload
   - Background processing
   - Progress updates via WebSocket

## Rollout Plan

### Week 1: Navigation & Daily Tasks
- Implement navigation menu
- Create daily tasks backend
- Create daily tasks frontend
- Test and refine

### Week 2: Root Cause Analysis
- Integrate Mistral AI
- Implement RCA backend
- Create RCA frontend
- Test AI responses

### Week 3: Complex Investigation
- Integrate MCP crawler
- Implement investigation backend
- Create investigation frontend
- Test document search

### Week 4: Log Collector & Polish
- Implement log collection
- Set up NFS integration
- Create log collector frontend
- Final testing and bug fixes
- Documentation updates
- Deployment

## Success Metrics

1. **Daily Tasks:**
   - Task execution time < 2 minutes
   - 100% task completion rate
   - Clear pass/fail indicators

2. **Root Cause Analysis:**
   - AI response time < 10 seconds
   - Relevant command suggestions > 80%
   - User satisfaction > 4/5

3. **Investigation:**
   - Search results relevance > 75%
   - Command execution success > 90%
   - Investigation time reduction > 50%

4. **Log Collector:**
   - Collection time < 5 minutes
   - Upload success rate > 99%
   - File size < 100MB compressed

## Documentation Deliverables

1. User Guide for each feature
2. API documentation
3. Configuration guide
4. Troubleshooting guide
5. Video tutorials
6. Admin guide for NFS setup

---

**Next Steps:**
1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Iterative development and testing
5. User feedback and refinement
6. Production deployment
