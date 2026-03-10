/**
 * API client for Nova Sentinel backend
 */
import axios from 'axios';
import type { AnalysisRequest, AnalysisResponse, DemoScenario, OrchestrationResponse } from '../types/incident';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Root health check — use for backend connectivity (not service-specific) */
export const healthCheck = async (): Promise<boolean> => {
  try {
    const r = await api.get('/health', { timeout: 3000 });
    return r?.data?.status === 'healthy';
  } catch {
    return false;
  }
};

// For file uploads (FormData)
const apiFormData = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

export const analysisAPI = {
  /**
   * Analyze CloudTrail events and generate timeline
   */
  analyzeTimeline: async (request: AnalysisRequest): Promise<AnalysisResponse> => {
    const response = await api.post<AnalysisResponse>('/api/analysis/timeline', request);
    return response.data;
  },

  /**
   * Health check for analysis service
   */
  healthCheck: async (): Promise<{ status: string }> => {
    const response = await api.get('/api/analysis/health');
    return response.data;
  },

  /**
   * What-if scenario simulation — counterfactual analysis
   */
  whatIf: async (question: string, timelineJson: string, incidentType?: string): Promise<any> => {
    const response = await api.post('/api/analysis/what-if', {
      question,
      timeline_json: timelineJson,
      incident_type: incidentType,
    });
    return response.data;
  },
};

export const demoAPI = {
  /**
   * List available demo scenarios
   */
  listScenarios: async (): Promise<{ scenarios: DemoScenario[] }> => {
    const response = await api.get('/api/demo/scenarios');
    return response.data;
  },

  /**
   * Get crypto mining scenario events
   */
  getCryptoMiningScenario: async (): Promise<{ scenario: string; name: string; events: any[] }> => {
    const response = await api.get('/api/demo/scenarios/crypto-mining');
    return response.data;
  },

          /**
           * Get data exfiltration scenario events
           */
          getDataExfiltrationScenario: async (): Promise<{ scenario: string; name: string; events: any[] }> => {
            const response = await api.get('/api/demo/scenarios/data-exfiltration');
            return response.data;
          },

          /**
           * Get privilege escalation scenario events
           */
          getPrivilegeEscalationScenario: async (): Promise<{ scenario: string; name: string; events: any[] }> => {
            const response = await api.get('/api/demo/scenarios/privilege-escalation');
            return response.data;
          },

          /**
           * Get unauthorized access scenario events
           */
          getUnauthorizedAccessScenario: async (): Promise<{ scenario: string; name: string; events: any[] }> => {
            const response = await api.get('/api/demo/scenarios/unauthorized-access');
            return response.data;
          },

  /** Instant demo — pre-computed results, no Bedrock (~2s vs ~45s) */
  getQuickDemo: async (scenarioId: string): Promise<OrchestrationResponse> => {
    const response = await api.get(`/api/demo/quick/${scenarioId}`);
    return response.data;
  },
};

export const orchestrationAPI = {
  /**
   * Single-call AWS mode: fetch CloudTrail server-side and run full orchestration.
   */
  analyzeFromCloudTrail: async (
    daysBack: number,
    maxEvents: number,
    profile?: string,
    accountId?: string
  ): Promise<OrchestrationResponse & { status?: string; message?: string }> => {
    const params = new URLSearchParams({
      days_back: daysBack.toString(),
      max_events: maxEvents.toString(),
      account_id: accountId || 'demo-account',
    });
    if (profile) params.append('profile', profile);
    const response = await api.post(
      `/api/orchestration/analyze-from-cloudtrail?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Orchestrate full incident analysis using multiple agents
   */
  analyzeIncident: async (
    events: any[],
    diagram?: File,
    incidentType?: string,
    accountId?: string
  ): Promise<OrchestrationResponse> => {
    const formData = new FormData();
    formData.append('events', JSON.stringify(events));
    if (incidentType) {
      formData.append('incident_type', incidentType);
    }
    if (accountId) {
      formData.append('account_id', accountId);
    }
    if (diagram) {
      formData.append('diagram', diagram);
    }

    const response = await apiFormData.post<OrchestrationResponse>(
      '/api/orchestration/analyze-incident',
      formData
    );
    return response.data;
  },

  /**
   * Get incident state by ID
   */
  getIncidentState: async (incidentId: string): Promise<any> => {
    const response = await api.get(`/api/orchestration/incident/${incidentId}`);
    return response.data;
  },

  /**
   * List all incidents
   */
  listIncidents: async (): Promise<{ count: number; incidents: any[] }> => {
    const response = await api.get('/api/orchestration/incidents');
    return response.data;
  },

  /**
   * Agentic query — Agent autonomously plans and executes tools.
   * Agent autonomously plans and executes tools based on the prompt.
   * Supports conversation history for multi-turn context.
   */
  agentQuery: async (
    prompt: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<{ response: string; framework: string; mode: string }> => {
    const response = await api.post('/api/orchestration/agent-query', {
      prompt,
      conversation_history: conversationHistory ?? [],
    });
    return response.data;
  },

  /**
   * Proactive security health check — runs 5 agent queries (IAM, CloudTrail, Billing, Security Hub).
   * No incident required.
   */
  runSecurityHealthCheck: async (
    profile?: string,
    accountId?: string
  ): Promise<{ results: Array<{ query: string; response: string; category: string; error?: boolean }>; account_id: string }> => {
    const params = new URLSearchParams({ account_id: accountId || 'demo-account' });
    if (profile) params.append('profile', profile);
    const response = await api.post(`/api/orchestration/security-health-check?${params.toString()}`);
    return response.data;
  },
};

export const visualAPI = {
  /**
   * Analyze an architecture diagram
   */
  analyzeDiagram: async (diagram: File, context?: string): Promise<any> => {
    const formData = new FormData();
    formData.append('diagram', diagram);
    if (context) {
      formData.append('context', context);
    }

    const response = await apiFormData.post('/api/visual/analyze-diagram', formData);
    return response.data;
  },
};

export const threatModelAPI = {
  generate: async (description: string, visualAnalysis?: any, includeAiThreats = true): Promise<any> => {
    const response = await api.post('/api/visual/threat-model', {
      architecture_description: description,
      visual_analysis_json: visualAnalysis ? JSON.stringify(visualAnalysis) : null,
      include_ai_threats: includeAiThreats,
    });
    return response.data;
  },
};

export const authAPI = {
  /**
   * Test AWS connection with a specific profile
   */
  testConnection: async (profile?: string): Promise<{ connected: boolean; account_id?: string; permissions?: any }> => {
    const params = profile ? `?profile=${encodeURIComponent(profile)}` : '';
    const response = await api.get(`/api/auth/test-connection${params}`);
    return response.data;
  },

  /**
   * List available AWS CLI profiles
   */
  listProfiles: async (): Promise<{ profiles: string[]; default_available: boolean }> => {
    const response = await api.get('/api/auth/available-profiles');
    return response.data;
  },
};

export const documentationAPI = {
  /**
   * Generate documentation for JIRA, Slack, and Confluence
   */
  generateDocumentation: async (
    incidentId: string,
    incidentAnalysis: any,
    timeline?: any,
    remediationPlan?: any
  ): Promise<any> => {
    const response = await api.post('/api/documentation/generate', {
      incident_id: incidentId,
      incident_analysis: incidentAnalysis,
      timeline: timeline,
      remediation_plan: remediationPlan,
    });
    return response.data;
  },
};

export const remediationAPI = {
  executeStep: async (stepId: string, incidentId: string, action: string, target: string, demoMode = false): Promise<any> => {
    const params = new URLSearchParams({ incident_id: incidentId, action, target, demo_mode: String(demoMode) });
    const response = await api.post(`/api/remediation/execute/${stepId}?${params}`);
    return response.data;
  },
  getExecutionProofs: async (incidentId: string): Promise<{ proofs: any[] }> => {
    const response = await api.get(`/api/remediation/execution-proof/${incidentId}`);
    return response.data;
  },
};

export const incidentHistoryAPI = {
  list: async (accountId: string = 'demo-account'): Promise<{ count: number; incidents: any[] }> => {
    const response = await api.get(`/api/incidents?account_id=${encodeURIComponent(accountId)}`);
    return response.data;
  },
  stats: async (accountId: string = 'demo-account'): Promise<any> => {
    const response = await api.get(`/api/incidents/stats?account_id=${encodeURIComponent(accountId)}`);
    return response.data;
  },
  correlations: async (accountId: string = 'demo-account'): Promise<any> => {
    const response = await api.get(`/api/incidents/correlations?account_id=${encodeURIComponent(accountId)}`);
    return response.data;
  },
  getIncident: async (incidentId: string, accountId: string = 'demo-account'): Promise<any> => {
    const response = await api.get(`/api/incidents/${incidentId}?account_id=${encodeURIComponent(accountId)}`);
    return response.data;
  },
  search: async (query: string, accountId: string = 'demo-account'): Promise<{ count: number; incidents: any[] }> => {
    const response = await api.post('/api/incidents/search', { query, account_id: accountId });
    return response.data;
  },
  similar: async (incidentId: string, accountId: string = 'demo-account', limit = 5): Promise<{ similar: Array<{ similarity: number; incident: any }>; model?: string }> => {
    const response = await api.get(`/api/incidents/${encodeURIComponent(incidentId)}/similar`, {
      params: { account_id: accountId, limit },
    });
    return response.data;
  },
};

export const threatIntelAPI = {
  lookup: async (ip: string): Promise<any> => {
    const response = await api.post('/api/threat-intel/lookup', { ip });
    return response.data;
  },
  enrichTimeline: async (events: any[]): Promise<{ cache: Array<{ ip: string; reputation: any }> }> => {
    const response = await api.post('/api/threat-intel/enrich-timeline', { events });
    return response.data;
  },
};

export const reportAPI = {
  exportPdf: async (incidentId: string, markdown: string, coverImageBase64?: string | null): Promise<Blob> => {
    const response = await api.post('/api/report/export-pdf', {
      incident_id: incidentId,
      markdown,
      cover_image_base64: coverImageBase64 || undefined,
    }, { responseType: 'blob' });
    return response.data;
  },

  executiveBriefing: async (data: {
    incident_type: string;
    root_cause: string;
    severity: string;
    blast_radius: string;
    cost_estimate: string;
    top_recommendation: string;
    incident_id: string;
  }): Promise<{
    executive_summary: string;
    image_base64: string | null;
    incident_id: string;
    severity: string;
    cost_estimate: string;
    blast_radius: string;
    top_recommendation: string;
  }> => {
    const response = await api.post('/api/report/executive-briefing', data);
    return response.data;
  },
};

export const voiceAPI = {
  /**
   * Send a voice query to Aria (Nova 2 Lite)
   */
  query: async (
    queryText: string,
    incidentContext?: any
  ): Promise<any> => {
    const response = await api.post('/api/voice/query', {
      query: queryText,
      incident_context: incidentContext,
    });
    return response.data;
  },

  /**
   * Generate voice summary of incident
   */
  summary: async (incidentData: any): Promise<any> => {
    const response = await api.post('/api/voice/summary', {
      incident_data: incidentData,
    });
    return response.data;
  },

  /**
   * Health check for voice service
   */
  healthCheck: async (): Promise<any> => {
    const response = await api.get('/api/voice/health');
    return response.data;
  },
};

export const novaActAPI = {
  /**
   * Generate remediation automation plan using Nova Act
   */
  generateRemediationAutomation: async (
    incidentType: string,
    rootCause: string,
    affectedResources: string[],
    remediationSteps: any[]
  ): Promise<any> => {
    const response = await api.post('/api/nova-act/remediation-automation', {
      incident_type: incidentType,
      root_cause: rootCause,
      affected_resources: affectedResources,
      remediation_steps: remediationSteps,
    });
    return response.data;
  },

  /**
   * Generate JIRA automation plan
   */
  generateJiraAutomation: async (
    incidentId: string,
    summary: string,
    description: string,
    severity: string
  ): Promise<any> => {
    const response = await api.post('/api/nova-act/jira-automation', {
      incident_id: incidentId,
      summary,
      description,
      severity,
    });
    return response.data;
  },
};

export const mcpAPI = {
  /**
   * Get MCP server info
   */
  getServerInfo: async (): Promise<any> => {
    const response = await api.get('/api/mcp/server-info');
    return response.data;
  },

  /**
   * List MCP tools (includes all AWS MCP server tools)
   */
  listTools: async (): Promise<any> => {
    const response = await api.get('/api/mcp/tools');
    return response.data;
  },

  /**
   * Call an MCP tool by name
   */
  callTool: async (toolName: string, args: any): Promise<any> => {
    const response = await api.post('/api/mcp/call-tool', {
      tool_name: toolName,
      arguments: args,
    });
    return response.data;
  },

  /**
   * List Strands agent tools
   */
  listStrandsTools: async (): Promise<any> => {
    const response = await api.get('/api/mcp/strands/tools');
    return response.data;
  },

  /**
   * Run Strands-orchestrated analysis
   */
  strandsAnalyze: async (events: any[], incidentType?: string, voiceQuery?: string): Promise<any> => {
    const response = await api.post('/api/mcp/strands/analyze', {
      events,
      incident_type: incidentType || 'Unknown',
      voice_query: voiceQuery,
    });
    return response.data;
  },

  /**
   * Health check for MCP/Strands services
   */
  healthCheck: async (): Promise<any> => {
    const response = await api.get('/api/mcp/health');
    return response.data;
  },
};

// ================================================================
// AWS MCP SERVER APIs
// ================================================================

export const cloudtrailMCPAPI = {
  /**
   * Lookup CloudTrail events using the CloudTrail MCP server
   */
  lookupEvents: async (category: string = 'all', daysBack: number = 7, maxResults: number = 50): Promise<any> => {
    const response = await api.get('/api/mcp/cloudtrail/events', {
      params: { category, days_back: daysBack, max_results: maxResults },
    });
    return response.data;
  },

  /**
   * Get CloudTrail trail status
   */
  getTrailStatus: async (): Promise<any> => {
    const response = await api.get('/api/mcp/cloudtrail/trail-status');
    return response.data;
  },

  /**
   * Scan for CloudTrail anomalies
   */
  scanAnomalies: async (daysBack: number = 1): Promise<any> => {
    const response = await api.get('/api/mcp/cloudtrail/anomalies', {
      params: { days_back: daysBack },
    });
    return response.data;
  },
};

export const iamMCPAPI = {
  /**
   * Audit IAM users
   */
  auditUsers: async (): Promise<any> => {
    const response = await api.get('/api/mcp/iam/audit-users');
    return response.data;
  },

  /**
   * Audit IAM roles
   */
  auditRoles: async (): Promise<any> => {
    const response = await api.get('/api/mcp/iam/audit-roles');
    return response.data;
  },

  /**
   * Get IAM account summary
   */
  getAccountSummary: async (): Promise<any> => {
    const response = await api.get('/api/mcp/iam/account-summary');
    return response.data;
  },

  /**
   * Analyze a specific IAM policy
   */
  analyzePolicy: async (policyArn: string): Promise<any> => {
    const response = await api.post('/api/mcp/iam/analyze-policy', null, {
      params: { policy_arn: policyArn },
    });
    return response.data;
  },
};

export const cloudwatchMCPAPI = {
  /**
   * Get CloudWatch security alarms
   */
  getAlarms: async (): Promise<any> => {
    const response = await api.get('/api/mcp/cloudwatch/alarms');
    return response.data;
  },

  /**
   * Get API call volume metrics
   */
  getApiMetrics: async (hoursBack: number = 24): Promise<any> => {
    const response = await api.get('/api/mcp/cloudwatch/api-metrics', {
      params: { hours_back: hoursBack },
    });
    return response.data;
  },

  /**
   * Get EC2 security metrics (crypto-mining, exfiltration detection)
   */
  getEC2Security: async (hoursBack: number = 6): Promise<any> => {
    const response = await api.get('/api/mcp/cloudwatch/ec2-security', {
      params: { hours_back: hoursBack },
    });
    return response.data;
  },

  /**
   * Check for billing anomalies
   */
  getBillingAnomalies: async (daysBack: number = 7): Promise<any> => {
    const response = await api.get('/api/mcp/cloudwatch/billing', {
      params: { days_back: daysBack },
    });
    return response.data;
  },
};

export const securityhubMCPAPI = {
  /**
   * Get Security Hub findings (GuardDuty, Inspector, etc.)
   */
  getFindings: async (severity?: string, maxResults: number = 50, daysBack?: number): Promise<any> => {
    const response = await api.get('/api/mcp/securityhub/findings', {
      params: { severity, max_results: maxResults, days_back: daysBack },
    });
    return response.data;
  },
};

export const novaCanvasMCPAPI = {
  /**
   * Generate an image using Nova Canvas MCP server
   */
  generateImage: async (prompt: string, options?: {
    negativePrompt?: string;
    width?: number;
    height?: number;
    quality?: string;
    cfgScale?: number;
    seed?: number;
    numImages?: number;
  }): Promise<any> => {
    const response = await api.post('/api/mcp/nova-canvas/generate', {
      prompt,
      negative_prompt: options?.negativePrompt || '',
      width: options?.width || 1024,
      height: options?.height || 1024,
      quality: options?.quality || 'standard',
      cfg_scale: options?.cfgScale || 8.0,
      seed: options?.seed || 0,
      num_images: options?.numImages || 1,
    });
    return response.data;
  },

  /**
   * Generate security report cover using Nova Canvas
   */
  generateReportCover: async (
    incidentType: string,
    severity: string = 'CRITICAL',
    incidentId: string = 'INC-000000',
    attackPattern: string = '',
    affectedServices: string[] = [],
  ): Promise<any> => {
    const response = await api.post('/api/mcp/nova-canvas/report-cover', {
      incident_type: incidentType,
      severity,
      incident_id: incidentId,
      attack_pattern: attackPattern,
      affected_services: affectedServices,
    });
    return response.data;
  },

  /**
   * Generate attack path visualization using Nova Canvas
   */
  generateAttackPathVisual: async (attackStages: string[], severity: string = 'CRITICAL'): Promise<any> => {
    const response = await api.post('/api/mcp/nova-canvas/attack-path', {
      attack_stages: attackStages,
      severity,
    });
    return response.data;
  },
};

export default api;
