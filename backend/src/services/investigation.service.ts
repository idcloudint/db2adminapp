import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import config from '../config';
import {
  InvestigationRequest,
  InvestigationResult,
  SearchResult,
  RecommendedCommand,
  CommandExecutionResult,
  InvestigationHistory,
  MCPSearchRequest,
  MCPSearchResponse
} from '../types/investigation.types';

const execAsync = promisify(exec);

class InvestigationService {
  private readonly mistralApiKey = 'oE8gysj6LEf0n77fbXbai6gwiWchWZKm';
  private readonly mistralApiUrl = 'https://api.mistral.ai/v1/chat/completions';
  private investigationHistory: InvestigationHistory[] = [];

  // MCP server endpoints (these would be configured based on your MCP setup)
  private readonly mcpEndpoints = {
    ibmDocs: 'https://www.ibm.com/docs/en/db2',
    ibmSupport: 'https://www.ibm.com/support/pages',
    knowledgeCenter: 'https://www.ibm.com/support/knowledgecenter'
  };

  /**
   * Perform complex investigation
   */
  async investigate(request: InvestigationRequest): Promise<InvestigationResult> {
    const investigationId = uuidv4();
    const timestamp = new Date();

    logger.info('Starting investigation', { investigationId, query: request.query });

    try {
      // Step 1: Search documentation using MCP
      const searchResults = await this.searchDocumentation(request);

      // Step 2: Get AI conclusion based on search results
      const aiConclusion = await this.generateAIConclusion(request, searchResults);

      // Step 3: Generate recommended commands if requested
      let recommendedCommands: RecommendedCommand[] = [];
      if (request.includeCommands) {
        recommendedCommands = await this.generateRecommendedCommands(request, searchResults, aiConclusion);
      }

      const investigation: InvestigationResult = {
        id: investigationId,
        timestamp,
        query: request.query,
        searchResults,
        aiConclusion,
        recommendedCommands,
        status: 'complete'
      };

      // Add to history
      this.investigationHistory.unshift({
        id: investigationId,
        timestamp,
        query: request.query,
        status: 'complete',
        summary: aiConclusion.summary.substring(0, 200) + '...'
      });

      // Keep only last 50 investigations
      if (this.investigationHistory.length > 50) {
        this.investigationHistory = this.investigationHistory.slice(0, 50);
      }

      logger.info('Investigation completed', { investigationId });

      return investigation;

    } catch (error: any) {
      logger.error('Investigation failed', { investigationId, error: error.message });
      
      const failedInvestigation: InvestigationResult = {
        id: investigationId,
        timestamp,
        query: request.query,
        searchResults: [],
        aiConclusion: {
          summary: 'Investigation failed',
          keyFindings: [],
          recommendedActions: [],
          confidence: 0
        },
        status: 'error'
      };

      return failedInvestigation;
    }
  }

  /**
   * Search IBM documentation using MCP document crawler
   */
  private async searchDocumentation(request: InvestigationRequest): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    try {
      // Simulate MCP document search
      // In a real implementation, this would call the MCP server
      const searchQuery = request.query;
      
      // Search IBM Docs
      if (request.searchScope === 'documentation' || request.searchScope === 'both') {
        const docsResults = await this.searchIBMDocs(searchQuery);
        results.push(...docsResults);
      }

      // Search IBM Support
      if (request.searchScope === 'support' || request.searchScope === 'both') {
        const supportResults = await this.searchIBMSupport(searchQuery);
        results.push(...supportResults);
      }

      // Sort by relevance
      results.sort((a, b) => b.relevance - a.relevance);

      return results.slice(0, 10); // Return top 10 results

    } catch (error: any) {
      logger.error('Documentation search failed', { error: error.message });
      return [];
    }
  }

  /**
   * Search IBM Docs (simulated MCP call)
   */
  private async searchIBMDocs(query: string): Promise<SearchResult[]> {
    // In a real implementation, this would use MCP to crawl IBM documentation
    // For now, we'll return simulated results based on common DB2 topics
    
    const commonTopics = [
      {
        title: 'DB2 Performance Tuning Guide',
        url: 'https://www.ibm.com/docs/en/db2/11.5?topic=performance-tuning',
        snippet: 'Learn how to optimize DB2 database performance through proper configuration and monitoring.',
        relevance: 0.9
      },
      {
        title: 'DB2 Troubleshooting and Problem Determination',
        url: 'https://www.ibm.com/docs/en/db2/11.5?topic=troubleshooting',
        snippet: 'Comprehensive guide to diagnosing and resolving DB2 issues.',
        relevance: 0.85
      },
      {
        title: 'DB2 High Availability Disaster Recovery (HADR)',
        url: 'https://www.ibm.com/docs/en/db2/11.5?topic=hadr',
        snippet: 'Configure and manage HADR for DB2 database high availability.',
        relevance: 0.8
      }
    ];

    // Filter based on query keywords
    const queryLower = query.toLowerCase();
    return commonTopics
      .filter(topic => 
        topic.title.toLowerCase().includes(queryLower) ||
        topic.snippet.toLowerCase().includes(queryLower)
      )
      .map(topic => ({
        source: 'ibm_docs' as const,
        ...topic,
        lastUpdated: new Date()
      }));
  }

  /**
   * Search IBM Support (simulated MCP call)
   */
  private async searchIBMSupport(query: string): Promise<SearchResult[]> {
    // Simulated IBM Support search results
    const supportArticles = [
      {
        title: 'Common DB2 Error Codes and Solutions',
        url: 'https://www.ibm.com/support/pages/db2-error-codes',
        snippet: 'Reference guide for DB2 SQL error codes and their resolutions.',
        relevance: 0.88
      },
      {
        title: 'DB2 Memory Configuration Best Practices',
        url: 'https://www.ibm.com/support/pages/db2-memory-config',
        snippet: 'Guidelines for configuring DB2 memory parameters for optimal performance.',
        relevance: 0.82
      }
    ];

    const queryLower = query.toLowerCase();
    return supportArticles
      .filter(article => 
        article.title.toLowerCase().includes(queryLower) ||
        article.snippet.toLowerCase().includes(queryLower)
      )
      .map(article => ({
        source: 'ibm_support' as const,
        ...article,
        lastUpdated: new Date()
      }));
  }

  /**
   * Generate AI conclusion based on search results
   */
  private async generateAIConclusion(
    request: InvestigationRequest,
    searchResults: SearchResult[]
  ): Promise<{
    summary: string;
    keyFindings: string[];
    recommendedActions: string[];
    confidence: number;
  }> {
    const searchContext = searchResults
      .map(r => `${r.title}: ${r.snippet}`)
      .join('\n');

    const prompt = `Based on the following IBM DB2 documentation search results, provide a comprehensive analysis:

Query: ${request.query}

Search Results:
${searchContext}

Provide your analysis in JSON format with keys:
- summary: A comprehensive summary of findings
- keyFindings: Array of 3-5 key findings
- recommendedActions: Array of 3-5 recommended actions
- confidence: Your confidence level (0-100)`;

    try {
      const response = await axios.post(
        this.mistralApiUrl,
        {
          model: 'mistral-large-latest',
          messages: [
            {
              role: 'system',
              content: 'You are an expert DB2 database administrator analyzing IBM documentation to provide actionable insights.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.mistralApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback
      return {
        summary: content,
        keyFindings: ['Review the search results for detailed information'],
        recommendedActions: ['Consult IBM documentation for specific guidance'],
        confidence: 50
      };

    } catch (error: any) {
      logger.error('Failed to generate AI conclusion', { error: error.message });
      return {
        summary: 'Unable to generate AI conclusion',
        keyFindings: [],
        recommendedActions: [],
        confidence: 0
      };
    }
  }

  /**
   * Generate recommended commands
   */
  private async generateRecommendedCommands(
    request: InvestigationRequest,
    searchResults: SearchResult[],
    aiConclusion: any
  ): Promise<RecommendedCommand[]> {
    const prompt = `Based on this DB2 investigation, recommend 3-5 diagnostic commands:

Query: ${request.query}
Key Findings: ${aiConclusion.keyFindings.join(', ')}

Provide commands in JSON array format with keys: id, command, description, purpose, risk (low/medium/high), expectedOutput.`;

    try {
      const response = await axios.post(
        this.mistralApiUrl,
        {
          model: 'mistral-large-latest',
          messages: [
            {
              role: 'system',
              content: 'You are an expert DB2 DBA recommending diagnostic commands.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1500
        },
        {
          headers: {
            'Authorization': `Bearer ${this.mistralApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback commands
      return [
        {
          id: uuidv4(),
          command: 'db2 get snapshot for database on SAMPLE',
          description: 'Get database snapshot',
          purpose: 'Collect current database metrics and status',
          risk: 'low',
          expectedOutput: 'Database snapshot with performance metrics'
        }
      ];

    } catch (error: any) {
      logger.error('Failed to generate recommended commands', { error: error.message });
      return [];
    }
  }

  /**
   * Execute a recommended command
   */
  async executeCommand(commandId: string, command: string): Promise<CommandExecutionResult> {
    try {
      const startTime = Date.now();
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000,
        env: {
          ...process.env,
          DB2INSTANCE: config.db2.user
        }
      });
      const duration = Date.now() - startTime;

      return {
        commandId,
        command,
        output: stdout || stderr,
        exitCode: 0,
        timestamp: new Date(),
        duration
      };

    } catch (error: any) {
      return {
        commandId,
        command,
        output: error.message,
        exitCode: error.code || 1,
        timestamp: new Date(),
        duration: 0,
        error: error.message
      };
    }
  }

  /**
   * Get investigation history
   */
  getHistory(): InvestigationHistory[] {
    return this.investigationHistory;
  }

  /**
   * Get specific investigation by ID
   */
  getById(id: string): InvestigationHistory | null {
    return this.investigationHistory.find(inv => inv.id === id) || null;
  }
}

export default new InvestigationService();

// Made with Bob
