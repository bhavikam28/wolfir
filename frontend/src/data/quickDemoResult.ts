/**
 * Client-side instant demo — no API call, no backend dependency.
 * Used when "Use full AI analysis" is OFF for truly instant demo (~0ms).
 */
import type { OrchestrationResponse } from '../types/incident';
import { demoAnalysisData } from './demoAnalysis';

function makeId(): string {
  return 'INC-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function getQuickDemoResult(scenarioId: string): OrchestrationResponse {
  const incidentId = makeId();
  return {
    incident_id: incidentId,
    status: 'completed',
    analysis_time_ms: 1200,
    agents: {
      temporal: { status: 'COMPLETED', model: 'amazon.nova-2-lite-v1:0' },
      risk_scorer: { status: 'COMPLETED', model: 'amazon.nova-micro-v1:0' },
      remediation: { status: 'COMPLETED', model: 'amazon.nova-2-lite-v1:0' },
      documentation: { status: 'COMPLETED', model: 'amazon.nova-2-lite-v1:0' },
    },
    results: {
      timeline: demoAnalysisData.timeline,
      risk_scores: [
        { event: 'CreateRole', risk_score: 45 },
        { event: 'AttachRolePolicy', risk_score: 78 },
        { event: 'AuthorizeSecurityGroupIngress', risk_score: 85 },
        { event: 'RunInstances', risk_score: 92 },
        { event: 'GuardDutyFinding', risk_score: 98 },
      ],
      remediation_plan: {
        steps: [
          { order: 1, action: 'Revoke IAM role session', severity: 'CRITICAL', details: 'Revoke active sessions for contractor-temp role' },
          { order: 2, action: 'Detach AdministratorAccess', severity: 'CRITICAL', details: 'Remove overly permissive policy' },
          { order: 3, action: 'Terminate suspicious EC2 instances', severity: 'HIGH', details: 'Stop and terminate mining instances' },
          { order: 4, action: 'Restore security group rules', severity: 'HIGH', details: 'Remove 0.0.0.0/0 SSH access' },
          { order: 5, action: 'Enable MFA for IAM', severity: 'MEDIUM', details: 'Require MFA for sensitive operations' },
        ],
        estimated_time_minutes: 15,
      },
      documentation: { summary: `Incident ${incidentId} — ${scenarioId}`, jira_ready: true },
    },
    model_used: 'instant-demo (client-side)',
    metadata: { scenario: scenarioId, quick_demo: true },
  };
}
