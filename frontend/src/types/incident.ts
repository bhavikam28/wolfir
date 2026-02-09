/**
 * TypeScript types for incidents and timeline analysis
 */

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus = 
  | 'DETECTED' 
  | 'ANALYZING' 
  | 'ANALYZED' 
  | 'REMEDIATING' 
  | 'REMEDIATED' 
  | 'DOCUMENTED' 
  | 'CLOSED';

export interface TimelineEvent {
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  details?: string;
  significance?: string;
  severity?: SeverityLevel;
  raw_event?: any;
}

export interface Timeline {
  events: TimelineEvent[];
  root_cause?: string;
  attack_pattern?: string;
  blast_radius?: string;
  confidence: number;
  analysis_summary?: string;
}

export interface AnalysisRequest {
  events: any[];
  incident_type?: string;
  resource_id?: string;
}

export interface AnalysisResponse {
  incident_id: string;
  timeline: Timeline;
  analysis_time_ms: number;
  model_used: string;
}

export type AgentStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface AgentState {
  status: AgentStatus;
  started_at?: string;
  error?: string;
  reason?: string;
}

export interface OrchestrationResponse {
  incident_id: string;
  status: 'completed' | 'failed' | 'running';
  analysis_time_ms: number;
  agents: {
    temporal?: AgentState;
    visual?: AgentState;
    risk_scorer?: AgentState;
    remediation?: AgentState;
  };
  results: {
    timeline?: Timeline;
    visual?: any;
    risk_scores?: Array<{ event: string; risk: any }>;
    remediation_plan?: any;
  };
}

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  severity: SeverityLevel;
  event_count: number;
}
