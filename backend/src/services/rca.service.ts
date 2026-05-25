import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import config from '../config';
import {
  RCARequest,
  RCAAnalysis,
  CommandResult,
  DiagnosticLogAnalysis,
  RemediationStep,
  RCAHistory
} from '../types/rca.types';

const execAsync = promisify(exec);

class RCAService {
  private readonly mistralApiKey = 'oE8gysj6LEf0n77fbXbai6gwiWchWZKm';
  private readonly mistralApiUrl = 'https://api.mistral.ai/v1/chat/completions';
  private rcaHistory: RCAHistory[] = [];

  /**
   * Perform root cause analysis
   */
  async analyzeRootCause(request: RCARequest): Promise<RCAAnalysis> {
    const analysisId = uuidv4();
    const timestamp = new Date();

    logger.info('Starting RCA', { analysisId, problem: request.problemDescription });

    try {
      // Step 1: Get AI analysis and recommended commands
      const aiAnalysis = await this.getAIAnalysis(request);

      // Step 2: Execute recommended commands
      const commandResults = await this.executeCommands(aiAnalysis.recommendedCommands);

      // Step 3: Analyze diagnostic logs
      const diagnosticLogAnalysis = await this.analyzeDiagnosticLogs();

      // Step 4: Generate remediation steps
      const remediationSteps = await this.generateRemediationSteps(
        request,
        aiAnalysis,
        commandResults,
        diagnosticLogAnalysis
      );

      const analysis: RCAAnalysis = {
        id: analysisId,
        timestamp,
        problemDescription: request.problemDescription,
        aiAnalysis,
        commandResults,
        diagnosticLogAnalysis,
        remediationSteps,
        status: 'complete'
      };

      // Add to history
      this.rcaHistory.unshift({
        id: analysisId,
        timestamp,
        problemDescription: request.problemDescription,
        status: 'complete',
        summary: aiAnalysis.technicalSummary.substring(0, 200) + '...'
      });

      // Keep only last 50 analyses
      if (this.rcaHistory.length > 50) {
        this.rcaHistory = this.rcaHistory.slice(0, 50);
      }

      logger.info('RCA completed', { analysisId });

      return analysis;

    } catch (error: any) {
      logger.error('RCA failed', { analysisId, error: error.message });
      
      const failedAnalysis: RCAAnalysis = {
        id: analysisId,
        timestamp,
        problemDescription: request.problemDescription,
        aiAnalysis: {
          technicalSummary: 'Analysis failed',
          executiveSummary: 'Unable to complete analysis',
          likelyRootCauses: [],
          recommendedCommands: [],
          confidence: 0
        },
        remediationSteps: [],
        status: 'error'
      };

      return failedAnalysis;
    }
  }

  /**
   * Get AI analysis from Mistral
   */
  private async getAIAnalysis(request: RCARequest): Promise<{
    technicalSummary: string;
    executiveSummary: string;
    likelyRootCauses: string[];
    recommendedCommands: string[];
    confidence: number;
  }> {
    const prompt = `You are a DB2 database expert. Analyze the following problem and provide:
1. A technical summary for DBAs
2. An executive summary for managers
3. Likely root causes
4. Recommended DB2 commands to diagnose the issue
5. Your confidence level (0-100)

Problem: ${request.problemDescription}
${request.severity ? `Severity: ${request.severity}` : ''}
${request.affectedComponents ? `Affected Components: ${request.affectedComponents.join(', ')}` : ''}

Provide your response in JSON format with keys: technicalSummary, executiveSummary, likelyRootCauses (array), recommendedCommands (array), confidence (number).`;

    try {
      const response = await axios.post(
        this.mistralApiUrl,
        {
          model: 'mistral-large-latest',
          messages: [
            {
              role: 'system',
              content: 'You are an expert DB2 database administrator with deep knowledge of troubleshooting and root cause analysis.'
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
      
      // Try to parse JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          technicalSummary: parsed.technicalSummary || 'No technical summary provided',
          executiveSummary: parsed.executiveSummary || 'No executive summary provided',
          likelyRootCauses: parsed.likelyRootCauses || [],
          recommendedCommands: parsed.recommendedCommands || [],
          confidence: parsed.confidence || 50
        };
      }

      // Fallback if JSON parsing fails
      return {
        technicalSummary: content,
        executiveSummary: 'Please review the technical summary',
        likelyRootCauses: ['Unable to determine specific causes'],
        recommendedCommands: ['db2 get snapshot for database on SAMPLE'],
        confidence: 30
      };

    } catch (error: any) {
      logger.error('Mistral AI API call failed', { error: error.message });
      throw new Error('Failed to get AI analysis');
    }
  }

  /**
   * Execute diagnostic commands
   */
  private async executeCommands(commands: string[]): Promise<CommandResult[]> {
    const results: CommandResult[] = [];

    for (const command of commands.slice(0, 5)) { // Limit to 5 commands
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

        results.push({
          command,
          output: stdout || stderr,
          exitCode: 0,
          timestamp: new Date(),
          duration
        });

      } catch (error: any) {
        results.push({
          command,
          output: error.message,
          exitCode: error.code || 1,
          timestamp: new Date(),
          duration: 0
        });
      }
    }

    return results;
  }

  /**
   * Analyze DB2 diagnostic logs
   */
  private async analyzeDiagnosticLogs(): Promise<DiagnosticLogAnalysis> {
    try {
      const { stdout } = await execAsync('db2diag -rc 3 -H 24', {
        timeout: 30000,
        env: {
          ...process.env,
          DB2INSTANCE: config.db2.user
        }
      });

      const lines = stdout.split('\n');
      const errors = lines.filter(line => line.includes('LEVEL: Error'));
      const warnings = lines.filter(line => line.includes('LEVEL: Warning'));

      const recentErrors = errors.slice(0, 10).map(line => ({
        timestamp: new Date(),
        level: 'ERROR' as const,
        message: line.substring(0, 200),
        details: line
      }));

      // Identify patterns
      const patterns: string[] = [];
      const errorMessages = errors.map(e => e.toLowerCase());
      
      if (errorMessages.some(e => e.includes('deadlock'))) {
        patterns.push('Deadlock detected');
      }
      if (errorMessages.some(e => e.includes('tablespace'))) {
        patterns.push('Tablespace issues');
      }
      if (errorMessages.some(e => e.includes('connection'))) {
        patterns.push('Connection problems');
      }
      if (errorMessages.some(e => e.includes('memory'))) {
        patterns.push('Memory issues');
      }

      return {
        errorCount: errors.length,
        warningCount: warnings.length,
        recentErrors,
        patterns
      };

    } catch (error: any) {
      logger.error('Failed to analyze diagnostic logs', { error: error.message });
      return {
        errorCount: 0,
        warningCount: 0,
        recentErrors: [],
        patterns: []
      };
    }
  }

  /**
   * Generate remediation steps using AI
   */
  private async generateRemediationSteps(
    request: RCARequest,
    aiAnalysis: any,
    commandResults: CommandResult[],
    diagnosticLogAnalysis: DiagnosticLogAnalysis
  ): Promise<RemediationStep[]> {
    const prompt = `Based on the following DB2 problem analysis, provide step-by-step remediation instructions:

Problem: ${request.problemDescription}
Root Causes: ${aiAnalysis.likelyRootCauses.join(', ')}
Command Results: ${commandResults.map(r => `${r.command}: ${r.output.substring(0, 100)}`).join('\n')}
Diagnostic Log Errors: ${diagnosticLogAnalysis.errorCount}
Patterns: ${diagnosticLogAnalysis.patterns.join(', ')}

Provide 3-5 remediation steps in JSON format as an array with keys: step (number), description, command (optional), risk (low/medium/high), estimatedTime.`;

    try {
      const response = await axios.post(
        this.mistralApiUrl,
        {
          model: 'mistral-large-latest',
          messages: [
            {
              role: 'system',
              content: 'You are an expert DB2 database administrator providing remediation guidance.'
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

      // Fallback remediation steps
      return [
        {
          step: 1,
          description: 'Review the diagnostic log analysis and command outputs',
          risk: 'low',
          estimatedTime: '5 minutes'
        },
        {
          step: 2,
          description: 'Verify database connectivity and instance status',
          command: 'db2 list active databases',
          risk: 'low',
          estimatedTime: '2 minutes'
        },
        {
          step: 3,
          description: 'Check for resource constraints (CPU, memory, disk)',
          command: 'db2 get snapshot for database on SAMPLE',
          risk: 'low',
          estimatedTime: '5 minutes'
        }
      ];

    } catch (error: any) {
      logger.error('Failed to generate remediation steps', { error: error.message });
      return [];
    }
  }

  /**
   * Get RCA history
   */
  getHistory(): RCAHistory[] {
    return this.rcaHistory;
  }

  /**
   * Get specific RCA by ID
   */
  getById(id: string): RCAHistory | null {
    return this.rcaHistory.find(rca => rca.id === id) || null;
  }
}

export default new RCAService();

// Made with Bob
