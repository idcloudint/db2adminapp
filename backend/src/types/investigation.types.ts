// Complex Investigation Types

export interface InvestigationRequest {
  query: string;
  searchScope: 'documentation' | 'support' | 'both';
  includeCommands?: boolean;
}

export interface InvestigationResult {
  id: string;
  timestamp: Date;
  query: string;
  searchResults: SearchResult[];
  aiConclusion: {
    summary: string;
    keyFindings: string[];
    recommendedActions: string[];
    confidence: number;
  };
  recommendedCommands?: RecommendedCommand[];
  commandResults?: CommandExecutionResult[];
  status: 'searching' | 'analyzing' | 'complete' | 'error';
}

export interface SearchResult {
  source: 'ibm_docs' | 'ibm_support' | 'knowledge_center';
  title: string;
  url: string;
  snippet: string;
  relevance: number;
  lastUpdated?: Date;
}

export interface RecommendedCommand {
  id: string;
  command: string;
  description: string;
  purpose: string;
  risk: 'low' | 'medium' | 'high';
  expectedOutput: string;
}

export interface CommandExecutionResult {
  commandId: string;
  command: string;
  output: string;
  exitCode: number;
  timestamp: Date;
  duration: number;
  error?: string;
}

export interface InvestigationHistory {
  id: string;
  timestamp: Date;
  query: string;
  status: string;
  summary: string;
}

export interface MCPSearchRequest {
  query: string;
  sources: string[];
  maxResults?: number;
}

export interface MCPSearchResponse {
  results: SearchResult[];
  totalFound: number;
  searchTime: number;
}

// Made with Bob
