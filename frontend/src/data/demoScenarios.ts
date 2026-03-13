/**
 * Default demo scenarios — always shown in demo mode.
 * Used as initial state and fallback when backend /api/demo/scenarios is unavailable.
 */
import type { DemoScenario } from '../types/incident';

export const DEFAULT_DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'crypto-mining',
    name: 'Cryptocurrency Mining Attack',
    description: 'Compromised IAM role used to launch crypto mining instances',
    severity: 'CRITICAL',
    event_count: 9,
  },
  {
    id: 'data-exfiltration',
    name: 'Data Exfiltration',
    description: 'Unauthorized access and download of sensitive data',
    severity: 'HIGH',
    event_count: 3,
  },
  {
    id: 'privilege-escalation',
    name: 'Privilege Escalation',
    description: 'IAM user escalates privileges through role assumption',
    severity: 'CRITICAL',
    event_count: 4,
  },
  {
    id: 'unauthorized-access',
    name: 'Unauthorized Access',
    description: 'External actor accessing sensitive resources',
    severity: 'HIGH',
    event_count: 3,
  },
  {
    id: 'shadow-ai',
    name: 'Shadow AI / LLM Abuse',
    description: 'Ungoverned Bedrock InvokeModel, prompt injection, OWASP LLM Top 10',
    severity: 'CRITICAL',
    event_count: 5,
  },
];
