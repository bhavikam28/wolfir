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
   * Analyze REAL CloudTrail events from your AWS account
   */
  analyzeRealCloudTrail: async (daysBack: number = 7, maxEvents: number = 100, profile?: string): Promise<AnalysisResponse> => {
    const params = new URLSearchParams({
      days_back: daysBack.toString(),
      max_events: maxEvents.toString(),
    });
    if (profile) {
      params.append('profile', profile);
    }
    const response = await api.post<AnalysisResponse>(
      `/api/analysis/real-cloudtrail?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Health check for analysis service
   */
  healthCheck: async (): Promise<{ status: string }> => {
    const response = await api.get('/api/analysis/health');
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
        };

export const orchestrationAPI = {
  /**
   * Orchestrate full incident analysis using multiple agents
   */
  analyzeIncident: async (
    events: any[],
    diagram?: File,
    incidentType?: string
  ): Promise<OrchestrationResponse> => {
    const formData = new FormData();
    formData.append('events', JSON.stringify(events));
    if (incidentType) {
      formData.append('incident_type', incidentType);
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

export const voiceAPI = {
  /**
   * Send a voice query to Nova Sonic
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
   * List MCP tools
   */
  listTools: async (): Promise<any> => {
    const response = await api.get('/api/mcp/tools');
    return response.data;
  },

  /**
   * Call an MCP tool
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

export default api;
