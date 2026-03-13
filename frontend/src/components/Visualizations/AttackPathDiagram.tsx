/**
 * Attack Path Diagram - Dashboard Analysis View
 * Dynamic graph from real CloudTrail timeline, with static fallback for demo.
 * Minimap, search, export PNG/SVG, pinch-zoom, MITRE ATT&CK links
 */
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { Timeline } from '../../types/incident';
import type { OrchestrationResponse } from '../../types/incident';
import { motion } from 'framer-motion';
import {
  Shield, AlertTriangle, Key, Network,
  Wifi, Server, User, Database, Eye, Lock, Cloud, Zap,
  ZoomIn, ZoomOut, Maximize2, Minimize2, Search, Download,
  Play, Pause, RotateCcw, Globe, MapPin
} from 'lucide-react';
import { IconAttackPath, IconLock, IconShield } from '../ui/MinimalIcons';
import {
  AmazonCloudFront,
  AmazonApiGateway,
  AmazonVirtualPrivateCloud,
  AwsCloudTrail,
  AmazonEc2,
  AwsIdentityAndAccessManagement,
  AmazonRds,
  AwsShield,
  AwsSecretsManager,
  AmazonSimpleStorageService,
} from '@nxavis/aws-icons';
import { threatIntelAPI } from '../../services/api';

const IPV4_REGEX = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/;

// ─── MITRE ATT&CK mappings ────────────────────────────────────────────────────

/** MITRE ATT&CK technique reference — name, why it matters, link */
const MITRE_MAP: Record<string, { name: string; desc: string; url: string }> = {
  T1078: { name: 'Valid Accounts', desc: 'Adversary uses stolen/compromised credentials to access resources. High impact — bypasses detection.', url: 'https://attack.mitre.org/techniques/T1078/' },
  T1098: { name: 'Account Manipulation', desc: 'Adversary modifies account permissions to maintain access or escalate privileges.', url: 'https://attack.mitre.org/techniques/T1098/' },
  T1190: { name: 'Exploit Public-Facing Application', desc: 'Initial access via vulnerable web app, API, or service exposed to the internet.', url: 'https://attack.mitre.org/techniques/T1190/' },
  T1021: { name: 'Remote Services', desc: 'Access via SSH, RDP, or other remote services. Common for lateral movement.', url: 'https://attack.mitre.org/techniques/T1021/' },
  T1041: { name: 'Exfiltration Over C2 Channel', desc: 'Data theft through command-and-control channel. Indicates data loss risk.', url: 'https://attack.mitre.org/techniques/T1041/' },
  T1552: { name: 'Unsecured Credentials', desc: 'Accessing stored credentials (Secrets Manager, config files). Enables privilege escalation.', url: 'https://attack.mitre.org/techniques/T1552/' },
  T1562: { name: 'Impair Defenses', desc: 'Adversary disables or evades security tools (CloudTrail, GuardDuty). Reduces visibility.', url: 'https://attack.mitre.org/techniques/T1562/' },
  T1578: { name: 'Modify Cloud Compute', desc: 'Adversary creates or modifies cloud compute resources to execute malicious workloads.', url: 'https://attack.mitre.org/techniques/T1578/' },
  T1136: { name: 'Create Account', desc: 'Adversary creates new accounts to establish persistence.', url: 'https://attack.mitre.org/techniques/T1136/' },
  T1531: { name: 'Account Access Removal', desc: 'Adversary removes access to accounts to disrupt operations or cover tracks.', url: 'https://attack.mitre.org/techniques/T1531/' },
  T1530: { name: 'Data from Cloud Storage', desc: 'Adversary accesses data from cloud storage (S3, etc.) for exfiltration.', url: 'https://attack.mitre.org/techniques/T1530/' },
};

/** MITRE technique metadata (ID → name, desc, url). LLM provides the ID; we only store reference data. */

// ─── Types ─────────────────────────────────────────────────────────────────────

interface NodeDef {
  id: string;
  x: number;
  y: number;
  icon: any;
  label: string;
  subLabel: string;
  detail: string;
  color: string;
  bg: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  ring?: boolean;
  mitreId?: string;
  resourceId?: string;
  riskScore?: number; // 0–100, shown on critical/high nodes
  timestamp?: string; // ISO or display string for replay
}

interface EdgeDef {
  from: string;
  to: string;
  color: string;
  label?: string;
  delay: number;
}

function extractIpFromNode(node: { label?: string; subLabel?: string; resourceId?: string; detail?: string } | undefined): string | null {
  if (!node) return null;
  const text = [node.label, node.subLabel, node.resourceId, node.detail].filter(Boolean).join(' ');
  const match = text.match(IPV4_REGEX);
  return match ? match[0] : null;
}

// ─── Dynamic AWS service detection (ARN/eventSource parsing, no hardcoded services) ─

/** Extract AWS service from ARN (arn:aws:SERVICE:region:...) or eventSource (bedrock.amazonaws.com) */
function extractService(arnOrSource: string): string {
  if (!arnOrSource?.trim()) return '';
  const s = arnOrSource.toLowerCase();
  const arnMatch = s.match(/^arn:aws:([a-z0-9-]+):/);
  if (arnMatch) return arnMatch[1];
  const sourceMatch = s.match(/([a-z0-9-]+)\.amazonaws\.com/);
  if (sourceMatch) return sourceMatch[1];
  return '';
}

/** AWS service → official AWS Architecture Icon (from @nxavis/aws-icons).
 * We use a curated map for common services (EC2, S3, IAM, RDS, etc.). For the 200+ AWS services
 * we don't map individually — fallback: SERVICE_CATEGORIES → Lucide (Server, Database, Network, etc.).
 * No MCP/agentic: icons are resolved at compile time. Add more to AWS_SERVICE_ICONS as needed. */
const AWS_SERVICE_ICONS: Record<string, React.ComponentType<Record<string, unknown>>> = {
  ec2: AmazonEc2,
  s3: AmazonSimpleStorageService,
  iam: AwsIdentityAndAccessManagement,
  rds: AmazonRds,
  cloudtrail: AwsCloudTrail,
  secretsmanager: AwsSecretsManager,
  vpc: AmazonVirtualPrivateCloud,
};
const AWS_ICON_SET = new Set([
  ...Object.values(AWS_SERVICE_ICONS),
  AmazonCloudFront,
  AmazonApiGateway,
]);

/** Generic (non-AWS) terms → Lucide icons. Use for Internet, IP, etc. */
const GENERIC_TERM_ICONS: Record<string, React.ComponentType<Record<string, unknown>>> = {
  internet: Globe,
  external: Globe,
  ip: MapPin,
  'ip address': MapPin,
  'external origin': Globe,
  'entry point': Network,
  attacker: AlertTriangle,
  unknown: User,
};

/** Map service name to icon category — fallback when no AWS icon. */
const SERVICE_TO_ICON: Record<string, any> = {
  compute: Server,
  storage: Database,
  identity: User,
  ai_ml: Zap,
  database: Database,
  network: Wifi,
  monitoring: Eye,
  encryption: Key,
  other: Network,
};
const SERVICE_CATEGORIES: Record<string, keyof typeof SERVICE_TO_ICON> = {
  ec2: 'compute', lambda: 'compute', batch: 'compute', fargate: 'compute', eks: 'compute', ecs: 'compute',
  s3: 'storage', glacier: 'storage', ebs: 'storage',
  iam: 'identity', sts: 'identity', cognito: 'identity',
  bedrock: 'ai_ml', sagemaker: 'ai_ml', rekognition: 'ai_ml', comprehend: 'ai_ml', transcribe: 'ai_ml', polly: 'ai_ml', translate: 'ai_ml', kendra: 'ai_ml', lex: 'ai_ml',
  rds: 'database', dynamodb: 'database', opensearch: 'database', elasticache: 'database', documentdb: 'database', keyspaces: 'database', redshift: 'database',
  vpc: 'network', cloudfront: 'network',
  cloudtrail: 'monitoring', cloudwatch: 'monitoring', guardduty: 'monitoring', securityhub: 'monitoring', config: 'monitoring',
  kms: 'encryption', secretsmanager: 'encryption', cloudhsm: 'encryption',
};

function getIconCategory(service: string): keyof typeof SERVICE_TO_ICON {
  const cat = SERVICE_CATEGORIES[service];
  return cat || 'other';
}

function getIconForGenericTerm(label: string): React.ComponentType<Record<string, unknown>> | null {
  const key = label.toLowerCase().trim();
  if (GENERIC_TERM_ICONS[key]) return GENERIC_TERM_ICONS[key];
  if (/^internet$/i.test(key) || key === 'external origin') return Globe;
  if (IPV4_REGEX.test(label) || /\bip\b|ip address|external ip/i.test(key)) return MapPin;
  return null;
}

function getIconForActor(actor: string, severity?: string): any {
  const a = actor.toLowerCase();
  const sev = (severity || '').toUpperCase();
  if (IPV4_REGEX.test(actor)) return Globe;
  if (a.includes('internet') || a.includes('external') && !a.includes('.amazonaws.com')) return Globe;
  if (a.includes('root')) {
    // Root user: AlertTriangle for HIGH/CRITICAL (threat), Shield for MEDIUM/LOW (best-practice violation)
    return sev === 'HIGH' || sev === 'CRITICAL' ? AlertTriangle : Shield;
  }
  if (a.includes('.amazonaws.com')) return Cloud;
  if (a.includes('role/')) return Shield;
  if (a.includes('user/')) return User;
  return User;
}

function getIconForResource(resource: string, action: string): any {
  const generic = getIconForGenericTerm(resource);
  if (generic) return generic;
  const service = extractService(resource) || extractService(action);
  if (service) {
    const awsIcon = AWS_SERVICE_ICONS[service];
    if (awsIcon) return awsIcon;
    const cat = getIconCategory(service);
    return SERVICE_TO_ICON[cat] ?? Network;
  }
  const r = resource.toLowerCase();
  const act = action.toLowerCase();
  if (r.includes('role') || r.includes('policy') || act.includes('role') || act.includes('policy')) return Shield;
  if (r.includes('user') || act.includes('user')) return User;
  if (r.includes('instance') || act.includes('runinstances')) return Server;
  if (r.includes('securitygroup') || r.includes('security-group')) return Lock;
  if (r.includes('bucket') || act.includes('object')) return Database;
  return Network;
}

/** Severity colors — attack-focused red/rose (matches attack visualization) */
const SEVERITY_STYLES: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: '#DC2626', bg: '#FEE2E2' },
  HIGH:     { color: '#EA580C', bg: '#FFEDD5' },
  MEDIUM:   { color: '#B91C1C', bg: '#FEF2F2' },
  LOW:      { color: '#64748B', bg: '#F8FAFC' },
};

/** Humanize long/cryptic resource strings into readable labels (real CloudTrail + demo) */
function humanizeLabel(s: string, maxLen = 24): string {
  if (!s) return 'Unknown Resource';
  const cleaned = s.replace(/^\(+|\)+$/g, '').trim() || s;
  const lower = cleaned.toLowerCase();
  if (lower === 'unknown' || lower === 'unknown resource') return 'Resource';
  if (/service-linked\s*channel/i.test(cleaned)) return 'Service-linked channel';
  if (/resource-explorer|\.amazonaws\.com/i.test(cleaned)) return cleaned.length <= maxLen ? cleaned : 'Resource Explorer';
  // Real CloudTrail: "EC2 Instance", "S3 Bucket: x", "IAM Role: y" — keep type prefix
  if (/^ec2\s*instance/i.test(cleaned)) return cleaned.length <= maxLen ? cleaned : 'EC2 Instance';
  if (/^s3\s*bucket:\s*/i.test(cleaned)) return shortenFallback(cleaned.replace(/^s3\s*bucket:\s*/i, ''), maxLen) || 'S3 Bucket';
  if (/^iam\s*role:\s*/i.test(cleaned)) return shortenFallback(cleaned.replace(/^iam\s*role:\s*/i, ''), maxLen) || 'IAM Role';
  if (/^security\s*group:\s*/i.test(cleaned)) return shortenFallback(cleaned.replace(/^security\s*group:\s*/i, ''), maxLen) || 'Security Group';
  if (/^lambda:\s*/i.test(cleaned)) return shortenFallback(cleaned.replace(/^lambda:\s*/i, ''), maxLen) || 'Lambda';
  // Bedrock Environment + Session UUID pattern → friendly name
  if (/Environment\s+[a-f0-9-]{36}/i.test(cleaned) || /Session\s+[\d-]+[a-z0-9]+/i.test(cleaned)) {
    if (lower.includes('policy') || lower.includes('iam')) return shortenFallback(cleaned, maxLen);
    return 'Bedrock Session';
  }
  if (/^Environment\s+/i.test(cleaned) && cleaned.length > 30) return 'Bedrock Environment';
  // IAM Policy: extract policy name
  const policyMatch = cleaned.match(/IAM\s*Policy[:\s]+([\w-]+)/i) || cleaned.match(/([A-Za-z][\w-]*BedrockAccess)/);
  if (policyMatch) return policyMatch[1].length <= maxLen ? policyMatch[1] : policyMatch[1].slice(0, maxLen - 2) + '…';
  // ARN: extract last meaningful part (role/user name, instance ID, etc.)
  if (cleaned.includes(':') && cleaned.includes('/')) {
    const parts = cleaned.split(/[:/]/);
    const last = parts[parts.length - 1] || parts[parts.length - 2];
    if (last && last.length > 3) return shortenFallback(last, maxLen);
  }
  // IP address — keep as is if short
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleaned)) return cleaned;
  return shortenFallback(cleaned, maxLen);
}

function shortenFallback(s: string, maxLen: number): string {
  if (!s) return 'Unknown';
  const last = s.split(/[:/]/).pop() || s;
  let out = last.length > maxLen ? last.slice(0, maxLen - 1) + '…' : last;
  out = out || 'Resource';
  // Avoid single-char labels (e.g. "arn:aws:iam::123:user/A" → "A") — use descriptive fallback
  if (out.length < 3) {
    const lower = s.toLowerCase();
    if (lower.includes('account') || lower.includes('metadata') || lower.includes('caller')) return 'Account Metadata';
    if (lower.includes('sts') || lower.includes('assumed-role')) return 'Assumed Role';
    if (lower.includes('session')) return 'Session';
    if (lower.includes('policy')) return 'IAM Policy';
    if (lower.includes('role')) return 'IAM Role';
    if (lower.includes('user')) return 'IAM User';
    return 'Resource';
  }
  return out;
}

/** Shorten ARN / long resource name for node label (delegates to humanize) */
function shortenLabel(s: string, maxLen = 24): string {
  return humanizeLabel(s, maxLen);
}

/** Classify actor type for subLabel */
function actorSubLabel(actor: string): string {
  const a = actor.toLowerCase();
  if (a.includes('root')) return 'Root User';
  if (a.includes('.amazonaws.com')) return 'AWS Service';
  if (a.includes('role/')) return 'IAM Role';
  if (a.includes('user/')) return 'IAM User';
  return 'Actor';
}

/** SubLabel from extracted service — works for any AWS service (SageMaker, OpenSearch, etc.) */
function resourceSubLabel(resource: string, action: string): string {
  const service = extractService(resource) || extractService(action);
  if (service) {
    const name = service.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `AWS ${name}`;
  }
  const r = resource.toLowerCase();
  const act = action.toLowerCase();
  // Action-based inference when resource is generic (real CloudTrail)
  if (/putuserpolicy|attachuserpolicy|createuser|putloginprofile/i.test(act)) return 'IAM User';
  if (r.includes('role') || /assumerole|createrole|attachrolepolicy|putrolepolicy/i.test(act)) return 'IAM Role';
  if (r.includes('policy') || /createpolicyversion|putpolicy|createpolicy/i.test(act)) return 'IAM Policy';
  if (r.includes('user')) return 'IAM User';
  if (r.includes('bucket') || /putobject|getobject|createbucket/i.test(act)) return 'S3 Bucket';
  if (r.includes('instance') || /runinstances|terminateinstances/i.test(act)) return 'EC2 Instance';
  if (/createtable|describetable|putitem|getitem/i.test(act)) return 'DynamoDB Table';
  if (/createfunction|invoke/i.test(act)) return 'Lambda Function';
  if (/authorizesecuritygroup|revokesecuritygroup|createsecuritygroup/i.test(act)) return 'Security Group';
  return 'Resource';
}

// ─── Dynamic graph builder ─────────────────────────────────────────────────────

/** Build action → MITRE ID map from LLM-generated risk_scores */
function buildMitreMap(riskScores?: Array<{ event: string; risk?: any; risk_score?: number }>): Map<string, string> {
  const map = new Map<string, string>();
  if (!riskScores) return map;
  for (const { event, risk } of riskScores) {
    const id = risk?.mitre_technique_id;
    if (id && typeof id === 'string' && /^T\d{4}$/.test(id)) map.set(event, id);
  }
  return map;
}

/** Build action → calibrated severity from risk_scores (CreatePolicyVersion/PutUserPolicy capped at MEDIUM) */
function buildSeverityCapMap(riskScores?: Array<{ event: string; risk?: any }>): Map<string, string> {
  const map = new Map<string, string>();
  if (!riskScores) return map;
  for (const { event, risk } of riskScores) {
    const level = risk?.risk_level || risk?.severity;
    if (level && typeof level === 'string') map.set(event, level.toUpperCase());
  }
  return map;
}

function buildGraphFromTimeline(
  timeline: Timeline,
  riskScores?: Array<{ event: string; risk?: any; risk_score?: number }>,
  includeNarrativeFrame = true,
): { nodes: NodeDef[]; edges: EdgeDef[] } {
  const events = timeline.events || [];
  if (events.length === 0) return { nodes: [], edges: [] };

  const minTs = events.reduce((acc, e) => {
    const t = e.timestamp;
    if (!t) return acc;
    return !acc || t < acc ? t : acc;
  }, '');

  const mitreMap = buildMitreMap(riskScores);
  const severityCapMap = buildSeverityCapMap(riskScores);

  // Track unique actors and resources
  const actorMap = new Map<string, { severity: string; count: number; actions: Set<string>; firstTimestamp?: string }>();
  const resourceMap = new Map<string, { severity: string; count: number; actions: Set<string>; firstAction: string; firstTimestamp?: string }>();
  const edgeMap = new Map<string, { action: string; count: number; severity: string }>();
  const awsServiceToCloudtrailEdges: Array<{ actor: string; action: string; severity: string }> = [];

  /** Infer resource from action when resource is vague (real CloudTrail often has inconsistent naming) */
  const inferResourceFromAction = (res: string, act: string): string => {
    if (res && !/^unknown$/i.test(res) && res.length > 2) return res;
    const a = act.toLowerCase();
    if (/deleteservicelinkedchannel/i.test(act)) return 'Service-linked channel';
    if (/runinstances|terminateinstances|startinstances|stopinstances/i.test(a)) return 'EC2 Instance';
    if (/assumerole/i.test(a)) return 'IAM Role';
    if (/createbucket|putobject|getobject|deleteobject/i.test(a)) return 'S3 Bucket';
    if (/createfunction|invoke/i.test(a)) return 'Lambda Function';
    if (/createtable|describetable|putitem|getitem/i.test(a)) return 'DynamoDB Table';
    if (/authorizesecuritygroup|revokesecuritygroup|createsecuritygroup/i.test(a)) return 'Security Group';
    if (/createuser|createaccesskey|putuserpolicy|attachuserpolicy/i.test(a)) return 'IAM User';
    if (/createrole|attachrolepolicy|putrolepolicy/i.test(a)) return 'IAM Role';
    if (/createpolicy|createpolicyversion/i.test(a)) return 'IAM Policy';
    return res || 'Resource';
  };

  for (const ev of events) {
    const actor = ev.actor || 'Unknown';
    let resource = inferResourceFromAction(ev.resource || 'Unknown', ev.action || 'Unknown');
    const action = ev.action || 'Unknown';
    let severity = (ev.severity || 'LOW').toUpperCase();
    const capped = severityCapMap.get(action);
    if (capped && severityRank(capped) < severityRank(severity)) severity = capped;
    const isAwsServicePrincipal = actor.includes('.amazonaws.com');
    const isServiceLinkedChannelResource = /service-linked\s*channel/i.test(resource) || resource === 'Service-linked channel';

    // Track actor
    const existing = actorMap.get(actor);
    const ts = ev.timestamp;
    if (existing) {
      existing.count++;
      existing.actions.add(action);
      if (severityRank(severity) > severityRank(existing.severity)) existing.severity = severity;
      if (ts && (!existing.firstTimestamp || ts < existing.firstTimestamp)) existing.firstTimestamp = ts;
    } else {
      actorMap.set(actor, { severity, count: 1, actions: new Set([action]), firstTimestamp: ts });
    }

    // AWS service principals acting on Service-linked channel: actor only, no duplicate resource node
    if (isAwsServicePrincipal && isServiceLinkedChannelResource) {
      awsServiceToCloudtrailEdges.push({ actor, action, severity });
    } else {
      const existingRes = resourceMap.get(resource);
      if (existingRes) {
        existingRes.count++;
        existingRes.actions.add(action);
        if (severityRank(severity) > severityRank(existingRes.severity)) existingRes.severity = severity;
        if (ts && (!existingRes.firstTimestamp || ts < existingRes.firstTimestamp)) existingRes.firstTimestamp = ts;
      } else {
        resourceMap.set(resource, { severity, count: 1, actions: new Set([action]), firstAction: action, firstTimestamp: ts });
      }
      const edgeKey = `${actor}|||${resource}`;
      const existingEdge = edgeMap.get(edgeKey);
      if (existingEdge) {
        existingEdge.count++;
        if (severityRank(severity) > severityRank(existingEdge.severity)) existingEdge.severity = severity;
      } else {
        edgeMap.set(edgeKey, { action, count: 1, severity });
      }
    }
  }

  // Merge resources that humanize to the same label (e.g. multiple Bedrock sessions → one node)
  const resourceToHumanized = new Map<string, string>();
  const humanizedGroups = new Map<string, string[]>();
  for (const r of resourceMap.keys()) {
    const h = humanizeLabel(r);
    resourceToHumanized.set(r, h);
    if (!humanizedGroups.has(h)) humanizedGroups.set(h, []);
    humanizedGroups.get(h)!.push(r);
  }
  // Canonical resource per group (highest severity, then first)
  const pureResourceIds = [...resourceMap.keys()].filter(r => !actorMap.has(r));
  const canonicalByGroup = new Map<string, string>();
  for (const r of pureResourceIds) {
    const h = resourceToHumanized.get(r)!;
    if (canonicalByGroup.has(h)) {
      const cur = canonicalByGroup.get(h)!;
      if (severityRank(resourceMap.get(r)!.severity) > severityRank(resourceMap.get(cur)!.severity)) {
        canonicalByGroup.set(h, r);
      }
    } else {
      canonicalByGroup.set(h, r);
    }
  }
  const uniqueResourceGroups = [...new Set(pureResourceIds.map(r => resourceToHumanized.get(r)!))];

  const actorIds = [...actorMap.keys()];
  const leftCount = actorIds.length;
  const rightCount = uniqueResourceGroups.length;
  const maxCount = Math.max(leftCount, rightCount, 1);

  const SHIFT = includeNarrativeFrame ? 320 : 0;
  const graphWidth = 960 + SHIFT;
  const graphHeight = Math.max(380, maxCount * 130 + 80);
  const leftX = includeNarrativeFrame ? 360 : 140;
  const rightX = includeNarrativeFrame ? graphWidth - 200 : graphWidth - 140;
  const centerX = (leftX + rightX) / 2;

  const nodes: NodeDef[] = [];
  const edges: EdgeDef[] = [];
  const nodeIdMap = new Map<string, string>();
  const groupToNodeId = new Map<string, string>();

  const makeId = (prefix: string, name: string) => {
    return `${prefix}_${name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}`;
  };

  // Narrative frame: Internet → API Gateway → VPC → [your resources] → CloudTrail (real AWS & production)
  if (includeNarrativeFrame) {
    const flowY = graphHeight / 2;
    const narrativeTs = minTs ? minTs.replace(/Z$/, '') : '2026-01-15T14:20:00';
    nodes.push({
      id: 'narrative_internet',
      x: 60,
      y: flowY,
      icon: Globe,
      label: 'Internet',
      subLabel: 'External Origin',
      detail: 'Traffic enters from external sources before reaching your AWS environment.',
      color: '#334155',
      bg: '#E2E8F0',
      severity: 'medium',
      mitreId: 'T1190',
      timestamp: `${narrativeTs}Z`,
    });
    nodes.push({
      id: 'narrative_gateway',
      x: 180,
      y: flowY,
      icon: AmazonApiGateway,
      label: 'Entry Point',
      subLabel: 'API / Network',
      detail: 'Traffic passes through your public endpoints (API Gateway, ALB, or direct access). Example external IP: 198.51.100.100',
      color: '#334155',
      bg: '#E2E8F0',
      severity: 'medium',
      mitreId: 'T1190',
      resourceId: '198.51.100.100',
      timestamp: `${narrativeTs}Z`,
    });
    nodes.push({
      id: 'narrative_vpc',
      x: 300,
      y: flowY,
      icon: AmazonVirtualPrivateCloud,
      label: 'VPC',
      subLabel: 'Network Layer',
      detail: 'Virtual Private Cloud — your AWS network boundary. Resources below are inside or accessed via VPC.',
      color: '#1D4ED8',
      bg: '#BFDBFE',
      severity: 'medium',
      mitreId: 'T1021',
      timestamp: `${narrativeTs}Z`,
    });
    nodes.push({
      id: 'narrative_cloudtrail',
      x: graphWidth - 80,
      y: flowY,
      icon: AwsCloudTrail,
      label: 'CloudTrail',
      subLabel: 'Monitoring',
      detail: 'Your AWS activity is logged here. wolfir analyzed these events to build this attack path.',
      color: '#059669',
      bg: '#A7F3D0',
      severity: 'low',
      mitreId: 'T1562',
      timestamp: `${narrativeTs}Z`,
    });
    edges.push({ from: 'narrative_internet', to: 'narrative_gateway', color: '#DC2626', label: 'Traffic', delay: 0.05 });
    edges.push({ from: 'narrative_gateway', to: 'narrative_vpc', color: '#DC2626', label: 'Route', delay: 0.1 });
  }

  actorIds.forEach((actor, i) => {
    const info = actorMap.get(actor)!;
    const id = makeId('actor', actor);
    nodeIdMap.set(actor, id);
    const y = leftCount === 1 ? graphHeight / 2 : 80 + (i * (graphHeight - 160)) / Math.max(leftCount - 1, 1);
    const sev = info.severity.toUpperCase();
    const styles = SEVERITY_STYLES[sev] || SEVERITY_STYLES.LOW;
    const actionsArr = [...info.actions];
    const mitreId = actionsArr.map(a => mitreMap.get(a)).find(Boolean);

    nodes.push({
      id,
      x: leftX,
      y,
      icon: getIconForActor(actor, info.severity),
      label: shortenLabel(actor),
      subLabel: actorSubLabel(actor),
      detail: `${actor} — ${info.count} event${info.count > 1 ? 's' : ''}: ${actionsArr.slice(0, 3).join(', ')}${actionsArr.length > 3 ? '...' : ''}`,
      color: styles.color,
      bg: styles.bg,
      severity: sev.toLowerCase() as NodeDef['severity'],
      ring: sev === 'CRITICAL' || sev === 'HIGH',
      mitreId,
      resourceId: actor.includes(':') ? actor : undefined,
      timestamp: info.firstTimestamp,
    });
  });

  // Place resource nodes (right side) — one per humanized group
  uniqueResourceGroups.forEach((groupKey, i) => {
    const canonical = canonicalByGroup.get(groupKey)!;
    const info = resourceMap.get(canonical)!;
    const resourcesInGroup = humanizedGroups.get(groupKey) || [canonical];
    const totalCount = resourcesInGroup.reduce((sum, r) => sum + (resourceMap.get(r)?.count || 0), 0);
    const allActions = new Set<string>();
    resourcesInGroup.forEach(r => resourceMap.get(r)?.actions.forEach(a => allActions.add(a)));
    let maxSev = info.severity;
    resourcesInGroup.forEach(r => {
      const s = resourceMap.get(r)!.severity;
      if (severityRank(s) > severityRank(maxSev)) maxSev = s;
    });
    const id = makeId('res', groupKey);
    groupToNodeId.set(groupKey, id);
    resourcesInGroup.forEach(r => nodeIdMap.set(r, id));
    const y = rightCount === 1 ? graphHeight / 2 : 80 + (i * (graphHeight - 160)) / Math.max(rightCount - 1, 1);
    const sev = maxSev.toUpperCase();
    const styles = SEVERITY_STYLES[sev] || SEVERITY_STYLES.LOW;
    const actionsArr = [...allActions];
    const mitreId = actionsArr.map(a => mitreMap.get(a)).find(Boolean);
    const detailSuffix = totalCount > 1 ? ` (${totalCount} related resources)` : '';

    nodes.push({
      id,
      x: rightX,
      y,
      icon: getIconForResource(canonical, info.firstAction),
      label: groupKey,
      subLabel: resourceSubLabel(canonical, info.firstAction),
      detail: `${groupKey} — ${totalCount} event${totalCount > 1 ? 's' : ''}: ${actionsArr.slice(0, 3).join(', ')}${actionsArr.length > 3 ? '...' : ''}${detailSuffix}`,
      color: styles.color,
      bg: styles.bg,
      severity: sev.toLowerCase() as NodeDef['severity'],
      ring: sev === 'CRITICAL' || sev === 'HIGH',
      mitreId,
      resourceId: canonical.includes(':') ? canonical : undefined,
      timestamp: info.firstTimestamp,
    });
  });

  const dualEntities = [...resourceMap.keys()].filter(r => actorMap.has(r) && r !== actorIds[0] && !nodeIdMap.has(r));
  dualEntities.forEach((entity, i) => {
    if (nodeIdMap.has(entity)) return; // already placed as actor
    const info = resourceMap.get(entity)!;
    const id = makeId('dual', entity);
    nodeIdMap.set(entity, id);
    const y = graphHeight / 2 + (i - dualEntities.length / 2) * 100;
    const sev = info.severity.toUpperCase();
    const styles = SEVERITY_STYLES[sev] || SEVERITY_STYLES.LOW;
    const actionsArr = [...info.actions];
    const mitreId = actionsArr.map(a => mitreMap.get(a)).find(Boolean);

    nodes.push({
      id,
      x: centerX,
      y,
      icon: getIconForResource(entity, info.firstAction),
      label: shortenLabel(entity),
      subLabel: resourceSubLabel(entity, info.firstAction),
      detail: `${entity} — ${info.count} events`,
      color: styles.color,
      bg: styles.bg,
      severity: sev.toLowerCase() as NodeDef['severity'],
      ring: sev === 'CRITICAL',
      mitreId,
      timestamp: info.firstTimestamp,
    });
  });

  // Build edges — map resource to its merged node id
  let delay = includeNarrativeFrame ? 0.2 : 0.3;
  const seenEdges = new Set<string>();
  if (includeNarrativeFrame && actorIds.length > 0) {
    actorIds.forEach((actor) => {
      const actorId = nodeIdMap.get(actor);
      if (actorId && !seenEdges.has(`narrative_vpc->${actorId}`)) {
        edges.push({ from: 'narrative_vpc', to: actorId, color: '#DC2626', label: 'Entry', delay });
        seenEdges.add(`narrative_vpc->${actorId}`);
        delay += 0.05;
      }
    });
    delay += 0.05;
  }
  // Merge edges: same from->to (e.g. Root→Bedrock Session with PutCredentials + DeleteSession) → single edge to avoid overlapping labels
  const mergedEdgeMap = new Map<string, { action: string; count: number; severity: string; actions: Set<string> }>();
  edgeMap.forEach((info, key) => {
    const [actor, resource] = key.split('|||');
    const fromId = nodeIdMap.get(actor);
    const groupKey = resourceToHumanized.get(resource);
    const toId = groupKey ? (nodeIdMap.get(resource) || groupToNodeId.get(groupKey)) : nodeIdMap.get(resource);
    if (!fromId || !toId || fromId === toId) return;
    const mergeKey = `${fromId}->${toId}`;
    const existing = mergedEdgeMap.get(mergeKey);
    const sev = info.severity.toUpperCase();
    if (existing) {
      if (severityRank(sev) > severityRank(existing.severity)) existing.severity = sev;
      existing.count += info.count;
      existing.actions.add(info.action);
    } else {
      mergedEdgeMap.set(mergeKey, { action: info.action, count: info.count, severity: sev, actions: new Set([info.action]) });
    }
  });

  mergedEdgeMap.forEach((info, mergeKey) => {
    const [fromId, toId] = mergeKey.split('->');
    if (!fromId || !toId || seenEdges.has(mergeKey)) return;
    seenEdges.add(mergeKey);

    const sev = info.severity.toUpperCase();
    const edgeColor = sev === 'CRITICAL' ? '#DC2626' : sev === 'HIGH' ? '#EA580C' : sev === 'MEDIUM' ? '#B91C1C' : '#94A3B8';
    const actionLabel = info.actions.size > 1 ? 'Multiple' : info.action;
    let label = info.count > 1 ? `${actionLabel} (${info.count}×)` : actionLabel;
    if (label.length > 28) label = label.slice(0, 25) + '…';

    edges.push({ from: fromId, to: toId, color: edgeColor, label, delay });
    delay += 0.15;
  });

  // Connect more resources to CloudTrail for cohesive end-to-end flow
  if (includeNarrativeFrame && uniqueResourceGroups.length > 1) {
    const bySeverity = [...uniqueResourceGroups].sort((a, b) => {
      const sevA = resourceMap.get(canonicalByGroup.get(a)!)?.severity || 'LOW';
      const sevB = resourceMap.get(canonicalByGroup.get(b)!)?.severity || 'LOW';
      return severityRank(sevB) - severityRank(sevA);
    });
    bySeverity.slice(0, 3).forEach((gk, i) => {
      const resId = groupToNodeId.get(gk);
      if (resId && !seenEdges.has(`${resId}->narrative_cloudtrail`)) {
        edges.push({ from: resId, to: 'narrative_cloudtrail', color: '#059669', label: 'Logged', delay: delay + 0.2 + i * 0.1 });
      }
    });
  }

  // AWS service principals (e.g. resource-explorer) acting on Service-linked channel: edge to CloudTrail only (no resource node)
  if (includeNarrativeFrame && awsServiceToCloudtrailEdges.length > 0) {
    const seen = new Set<string>();
    awsServiceToCloudtrailEdges.forEach(({ actor }) => {
      const actorId = nodeIdMap.get(actor);
      if (actorId && !seen.has(`${actorId}->narrative_cloudtrail`)) {
        seen.add(`${actorId}->narrative_cloudtrail`);
        edges.push({ from: actorId, to: 'narrative_cloudtrail', color: '#059669', label: 'Logged', delay: delay + 0.3 });
      }
    });
  }

  return { nodes, edges };
}

/** Format ISO timestamp for replay display: "Jan 15, 2026 — 14:23 UTC" */
function formatReplayTimestamp(ts: string | undefined): string {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }) + ' UTC';
    return `${date} — ${time}`;
  } catch {
    return ts;
  }
}

function severityRank(sev: string): number {
  switch (sev.toUpperCase()) {
    case 'CRITICAL': return 4;
    case 'HIGH': return 3;
    case 'MEDIUM': return 2;
    case 'LOW': return 1;
    default: return 0;
  }
}

// ─── Static fallback for demo mode ─────────────────────────────────────────────

const DEMO_NODES: NodeDef[] = [
  { id: 'internet', x: 80, y: 200, icon: Globe, label: 'Internet', subLabel: 'External Origin', detail: 'Suspicious IP: 203.0.113.42 (TOR exit node)', color: '#334155', bg: '#E2E8F0', severity: 'medium', mitreId: 'T1190', timestamp: '2026-01-15T14:20:00Z' },
  { id: 'gateway', x: 240, y: 200, icon: AmazonApiGateway, label: 'API Gateway', subLabel: 'Entry Point', detail: 'REST API — 847 requests in 2 minutes', color: '#334155', bg: '#E2E8F0', severity: 'medium', mitreId: 'T1190', timestamp: '2026-01-15T14:20:15Z' },
  { id: 'vpc', x: 400, y: 200, icon: AmazonVirtualPrivateCloud, label: 'VPC', subLabel: 'Network Layer', detail: 'vpc-0a1b2c3d — us-east-1', color: '#B91C1C', bg: '#FEF2F2', severity: 'medium', mitreId: 'T1021', timestamp: '2026-01-15T14:20:30Z' },
  { id: 'ec2', x: 560, y: 200, icon: AmazonEc2, label: 'EC2 Instance', subLabel: 'Compromised', detail: 'i-abc123 — Attacker installed crypto-miner | Severity: Critical', color: '#DC2626', bg: '#FEE2E2', severity: 'critical', ring: true, mitreId: 'T1078', resourceId: 'i-abc123', riskScore: 98, timestamp: '2026-01-15T14:21:00Z' },
  { id: 'iam', x: 720, y: 200, icon: AwsIdentityAndAccessManagement, label: 'IAM Role', subLabel: 'Escalated', detail: 'arn:aws:iam::role/admin-temp — privilege escalation', color: '#DC2626', bg: '#FEE2E2', severity: 'critical', ring: true, mitreId: 'T1078', riskScore: 92, timestamp: '2026-01-15T14:21:45Z' },
  { id: 'database', x: 880, y: 200, icon: AmazonRds, label: 'RDS Database', subLabel: 'Data Target', detail: 'db-prod-main — 2.4GB data accessed', color: '#EA580C', bg: '#FFEDD5', severity: 'high', mitreId: 'T1041', resourceId: 'db-prod-main', riskScore: 78, timestamp: '2026-01-15T14:22:30Z' },
  { id: 'sg', x: 280, y: 80, icon: AwsShield, label: 'Security Group', subLabel: 'Misconfigured', detail: 'sg-0xyz — 0.0.0.0/0 on port 22 (OPEN)', color: '#DC2626', bg: '#FEE2E2', severity: 'critical', ring: true, mitreId: 'T1190', resourceId: 'sg-0xyz', riskScore: 95, timestamp: '2026-01-15T14:20:45Z' },
  { id: 'ssh', x: 500, y: 80, icon: AlertTriangle, label: 'SSH Exposed', subLabel: 'Port 22 Open', detail: '14 failed login attempts before breach', color: '#DC2626', bg: '#FEE2E2', severity: 'critical', ring: true, mitreId: 'T1021', riskScore: 94, timestamp: '2026-01-15T14:21:15Z' },
  { id: 'secrets', x: 720, y: 80, icon: AwsSecretsManager, label: 'Secrets Mgr', subLabel: 'Accessed', detail: 'GetSecretValue — 3 secrets retrieved', color: '#EA580C', bg: '#FFEDD5', severity: 'high', mitreId: 'T1552', riskScore: 85, timestamp: '2026-01-15T14:22:00Z' },
  { id: 'cloudtrail', x: 880, y: 80, icon: AwsCloudTrail, label: 'CloudTrail', subLabel: 'Monitoring', detail: 'Detected by wolfir', color: '#64748B', bg: '#F8FAFC', severity: 'low', mitreId: 'T1562', timestamp: '2026-01-15T14:23:00Z' },
];

/** AI attack path: Internet → API → Bedrock → IAM → S3 (OWASP LLM, Shadow AI) */
const DEMO_NODES_AI: NodeDef[] = [
  { id: 'internet', x: 80, y: 200, icon: Globe, label: 'Internet', subLabel: 'External Origin', detail: 'Prompt injection or Shadow AI traffic', color: '#334155', bg: '#E2E8F0', severity: 'medium', mitreId: 'T1190', timestamp: '2026-01-15T14:20:00Z' },
  { id: 'gateway', x: 220, y: 200, icon: AmazonApiGateway, label: 'API Gateway', subLabel: 'Entry Point', detail: 'REST API — InvokeModel requests', color: '#334155', bg: '#E2E8F0', severity: 'medium', mitreId: 'T1190', timestamp: '2026-01-15T14:20:15Z' },
  { id: 'bedrock', x: 380, y: 200, icon: Zap, label: 'Amazon Bedrock', subLabel: 'AI/ML', detail: 'InvokeModel — LLM01 prompt injection risk', color: '#DC2626', bg: '#FEE2E2', severity: 'critical', ring: true, mitreId: 'AML.T0051', riskScore: 88, timestamp: '2026-01-15T14:20:45Z' },
  { id: 'iam', x: 540, y: 200, icon: AwsIdentityAndAccessManagement, label: 'IAM Role', subLabel: 'Model Access', detail: 'Bedrock Agent assumes role — excessive agency (LLM06)', color: '#EA580C', bg: '#FFEDD5', severity: 'high', mitreId: 'T1078', riskScore: 75, timestamp: '2026-01-15T14:21:15Z' },
  { id: 's3', x: 700, y: 200, icon: AmazonSimpleStorageService, label: 'S3 Bucket', subLabel: 'Data Target', detail: 'Exfiltration via inference (LLM02) — training data, PII', color: '#EA580C', bg: '#FFEDD5', severity: 'high', mitreId: 'T1530', riskScore: 72, timestamp: '2026-01-15T14:21:45Z' },
  { id: 'cloudtrail', x: 860, y: 200, icon: AwsCloudTrail, label: 'CloudTrail', subLabel: 'Monitoring', detail: 'InvokeModel logged — Shadow AI detection', color: '#059669', bg: '#A7F3D0', severity: 'low', mitreId: 'T1562', timestamp: '2026-01-15T14:22:00Z' },
];

const DEMO_EDGES: EdgeDef[] = [
  { from: 'internet', to: 'gateway', color: '#DC2626', label: 'HTTP/S', delay: 0.3 },
  { from: 'gateway', to: 'vpc', color: '#DC2626', label: 'Route', delay: 0.5 },
  { from: 'vpc', to: 'ec2', color: '#DC2626', label: 'SSH:22', delay: 0.7 },
  { from: 'ec2', to: 'iam', color: '#DC2626', label: 'AssumeRole', delay: 0.9 },
  { from: 'iam', to: 'database', color: '#EA580C', label: 'Query', delay: 1.1 },
  { from: 'vpc', to: 'sg', color: '#DC2626', delay: 1.3 },
  { from: 'sg', to: 'ssh', color: '#DC2626', label: 'Exploit', delay: 1.5 },
  { from: 'ec2', to: 'ssh', color: '#DC2626', delay: 1.6 },
  { from: 'ssh', to: 'secrets', color: '#EA580C', label: 'Exfil', delay: 1.7 },
  { from: 'iam', to: 'secrets', color: '#EA580C', delay: 1.8 },
  { from: 'iam', to: 'cloudtrail', color: '#64748B', label: 'Logged', delay: 1.9 },
];

const DEMO_EDGES_AI: EdgeDef[] = [
  { from: 'internet', to: 'gateway', color: '#DC2626', label: 'InvokeModel', delay: 0.3 },
  { from: 'gateway', to: 'bedrock', color: '#DC2626', label: 'API', delay: 0.5 },
  { from: 'bedrock', to: 'iam', color: '#EA580C', label: 'AssumeRole', delay: 0.7 },
  { from: 'iam', to: 's3', color: '#EA580C', label: 'GetObject', delay: 0.9 },
  { from: 'iam', to: 'cloudtrail', color: '#059669', label: 'Logged', delay: 1.1 },
];

const ZOOM_LEVELS = [0.6, 0.75, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2];
const NARRATIVE_ORDER: Record<string, number> = { narrative_internet: 0, narrative_gateway: 1, narrative_vpc: 2, narrative_cloudtrail: 3 };

interface AttackPathDiagramProps {
  timeline?: Timeline;
  orchestrationResult?: OrchestrationResponse | null;
  onNavigateToRemediation?: () => void;
  /** Use narrative graph (Internet → VPC → EC2 → IAM → RDS) for easy comprehension. Default true for demo only. */
  useNarrativeDemoGraph?: boolean;
  /** Use AI attack path (Internet → API → Bedrock → IAM → S3) for AI security scenarios. */
  variant?: 'standard' | 'ai';
  /** Dynamic: events analyzed from real AWS — shown in subtitle */
  eventsAnalyzed?: number;
  /** Dynamic: days of logs analyzed — shown in subtitle */
  timeRangeDays?: number;
}

const AttackPathDiagram: React.FC<AttackPathDiagramProps> = (props) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState(3);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [threatIntelData, setThreatIntelData] = useState<any>(null);
  const [threatIntelLoading, setThreatIntelLoading] = useState(false);
  // Replay state
  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(-1);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [replayPaused, setReplayPaused] = useState(false);
  const [criticalFlash, setCriticalFlash] = useState(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDistRef = useRef<number | null>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Determine if we have real timeline data (more than 0 events with real actions)
  const hasRealTimeline = !!(
    props.timeline &&
    props.timeline.events &&
    props.timeline.events.length > 0 &&
    props.timeline.events.some(e => e.action && e.action !== 'Unknown')
  );

  // Use narrative graph (Internet → VPC → EC2 → IAM → RDS) for both demo and real AWS — default true for comprehensible end-to-end flow
  const useNarrative = props.useNarrativeDemoGraph !== false;

  const confidence = props.timeline?.confidence ?? props.orchestrationResult?.results?.timeline?.confidence ?? 0.5;
  const lowConfidence = confidence <= 0.4;
  const includeNarrativeFrame = !lowConfidence;

  // Build dynamic or use static
  const variant = props.variant ?? 'standard';
  const { nodes: NODES, edges: EDGES } = useMemo(() => {
    if (useNarrative && variant === 'ai') return { nodes: DEMO_NODES_AI, edges: DEMO_EDGES_AI };
    if (useNarrative) return { nodes: DEMO_NODES, edges: DEMO_EDGES };
    if (hasRealTimeline && props.timeline) {
      const riskScores = props.orchestrationResult?.results?.risk_scores;
      const graph = buildGraphFromTimeline(props.timeline, riskScores, includeNarrativeFrame);
      if (graph.nodes.length > 0) return graph;
    }
    return { nodes: DEMO_NODES, edges: DEMO_EDGES };
  }, [useNarrative, variant, hasRealTimeline, props.timeline, props.orchestrationResult, includeNarrativeFrame]);

  const nodeMap = useMemo(() => Object.fromEntries(NODES.map(n => [n.id, n])), [NODES]);

  // Replay: chronological order (by timestamp; nodes without timestamp go last)
  const replayOrder = useMemo(() => {
    return [...NODES].sort((a, b) => {
      const ta = a.timestamp ?? '9999-12-31T23:59:59Z';
      const tb = b.timestamp ?? '9999-12-31T23:59:59Z';
      const cmp = ta.localeCompare(tb);
      if (cmp !== 0) return cmp;
      return (NARRATIVE_ORDER[a.id] ?? 99) - (NARRATIVE_ORDER[b.id] ?? 99);
    });
  }, [NODES]);
  const replayOrderMap = useMemo(() => Object.fromEntries(replayOrder.map((n, i) => [n.id, i])), [replayOrder]);

  const activeNode = NODES.find(n => n.id === (selectedNode || hoveredNode));
  const detailPanelNode = NODES.find(n => n.id === selectedNode);

  const zoom = ZOOM_LEVELS[zoomIndex];
  const searchLower = searchQuery.toLowerCase().trim();
  const filteredNodes = searchLower
    ? NODES.filter(n =>
        n.label.toLowerCase().includes(searchLower) ||
        n.subLabel.toLowerCase().includes(searchLower) ||
        (n.resourceId?.toLowerCase().includes(searchLower))
      )
    : NODES;
  const hasSearchMatch = searchLower && filteredNodes.length > 0;

  // Compute SVG dimensions from node positions
  const svgWidth = useMemo(() => {
    if (NODES.length === 0) return 960;
    return Math.max(960, Math.max(...NODES.map(n => n.x)) + 140);
  }, [NODES]);
  const svgHeight = useMemo(() => {
    if (NODES.length === 0) return 320;
    return Math.max(320, Math.max(...NODES.map(n => n.y)) + 80);
  }, [NODES]);

  const showMinimap = zoom > 1 || pan.x !== 0 || pan.y !== 0;
  const zoomIn = () => setZoomIndex(prev => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
  const zoomOut = () => setZoomIndex(prev => Math.max(prev - 1, 0));
  const resetZoom = () => {
    setZoomIndex(3);
    setPan({ x: 0, y: 0 });
  };

  const focusNode = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
    setSearchQuery('');
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    }
  }, [zoomIn, zoomOut]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY);
      lastPinchDistRef.current = d;
    } else {
      lastPinchDistRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const d = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY);
      if (lastPinchDistRef.current != null) {
        const delta = d - lastPinchDistRef.current;
        if (delta > 15) zoomIn();
        else if (delta < -15) zoomOut();
      }
      lastPinchDistRef.current = d;
    } else {
      lastPinchDistRef.current = null;
    }
  }, [zoomIn, zoomOut]);

  const exportPng = useCallback(async () => {
    const svg = svgRef.current;
    const wrapper = containerRef.current?.querySelector('[style*="transform"]') as HTMLElement;
    if (!svg || !wrapper) return;
    try {
      const canvas = document.createElement('canvas');
      const rect = wrapper.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(2, 2);
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      await new Promise<void>((res, rej) => {
        img.onload = () => { ctx.drawImage(img, 0, 0, rect.width, rect.height); URL.revokeObjectURL(url); res(); };
        img.onerror = rej;
        img.src = url;
      });
      const a = document.createElement('a');
      a.download = `attack-path-${Date.now()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    } catch {
      const svgData = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const a = document.createElement('a');
      a.download = `attack-path-${Date.now()}.svg`;
      a.href = URL.createObjectURL(blob);
      a.click();
      URL.revokeObjectURL(a.href);
    }
  }, []);

  const exportSvg = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const a = document.createElement('a');
    a.download = `attack-path-${Date.now()}.svg`;
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
  }, []);

  const toggleFullscreen = async () => {
    if (!graphRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await graphRef.current.requestFullscreen?.();
        setIsFullscreen(true);
        setZoomIndex(5); // zoom 1.15x when entering fullscreen for better visibility
      } else {
        await document.exitFullscreen?.();
        setIsFullscreen(false);
        setZoomIndex(3); // reset to 100%
      }
    } catch (e) {
      // Fullscreen may fail (e.g. not user-initiated, or unsupported)
      setIsFullscreen(false);
    }
  };

  React.useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const ip = extractIpFromNode(detailPanelNode);
    if (!ip) {
      setThreatIntelData(null);
      return;
    }
    let cancelled = false;
    setThreatIntelLoading(true);
    setThreatIntelData(null);
    threatIntelAPI.lookup(ip)
      .then((data) => { if (!cancelled) setThreatIntelData(data); })
      .catch(() => { if (!cancelled) setThreatIntelData({ ip, error: 'Threat intel unavailable' }); })
      .finally(() => { if (!cancelled) setThreatIntelLoading(false); });
    return () => { cancelled = true; };
  }, [detailPanelNode?.id]);

  // Replay interval: advance replayIndex when playing
  const baseDelayMs = 1500;
  useEffect(() => {
    if (!replayMode || replayPaused || replayIndex >= replayOrder.length - 1) return;
    const delay = baseDelayMs / replaySpeed;
    const id = setInterval(() => {
      setReplayIndex((prev) => {
        const next = prev + 1;
        if (next >= replayOrder.length) return prev;
        const node = replayOrder[next];
        if (node?.severity === 'critical') setCriticalFlash(true);
        return next;
      });
    }, delay);
    return () => clearInterval(id);
  }, [replayMode, replayPaused, replayIndex, replayOrder, replaySpeed]);

  // CRITICAL flash: 500ms then clear
  useEffect(() => {
    if (!criticalFlash) return;
    const t = setTimeout(() => setCriticalFlash(false), 500);
    return () => clearTimeout(t);
  }, [criticalFlash]);

  const handleNodeHover = (nodeId: string | null, ev?: React.MouseEvent) => {
    if (isDragging) return;
    setHoveredNode(nodeId);
    if (nodeId && ev) {
      setTooltipPos({ x: ev.clientX, y: ev.clientY });
    } else {
      setTooltipPos(null);
    }
  };

  const getPointerPos = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } => {
    if ('touches' in e && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    const me = e as React.MouseEvent;
    return { x: me.clientX, y: me.clientY };
  };

  const handlePanStart = (e: React.MouseEvent | React.TouchEvent) => {
    lastPointerRef.current = getPointerPos(e);
    setIsDragging(true);
    setHoveredNode(null);
    setTooltipPos(null);
  };

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setSelectedNode(prev => prev === nodeId ? null : nodeId);
  };

  const handleCanvasClick = () => setSelectedNode(null);

  const handlePanMove = React.useCallback((e: MouseEvent | TouchEvent) => {
    if (!lastPointerRef.current) return;
    const pos = 'touches' in e && e.touches.length > 0
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
    const dx = pos.x - lastPointerRef.current.x;
    const dy = pos.y - lastPointerRef.current.y;
    lastPointerRef.current = pos;
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handlePanEnd = React.useCallback(() => {
    lastPointerRef.current = null;
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (!isDragging) return;
    const move = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      handlePanMove(e);
    };
    const end = () => handlePanEnd();
    window.addEventListener('mousemove', move, { passive: false });
    window.addEventListener('mouseup', end);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
    };
  }, [isDragging, handlePanMove, handlePanEnd]);

  return (
    <div
      ref={graphRef}
      className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-card bg-white flex flex-col min-h-0"
      data-incident-context={Boolean(props.timeline || props.orchestrationResult) ? 'true' : undefined}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/30">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
            <IconAttackPath className="w-4.5 h-4.5 text-indigo-600" />
          </div>
          <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              {hasRealTimeline && lowConfidence ? 'Activity Graph' : 'Attack Path Graph'}
            </h2>
            {useNarrative ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {hasRealTimeline ? 'End-to-end flow · Your AWS' : 'End-to-end flow · Demo'}
              </span>
            ) : hasRealTimeline ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {lowConfidence ? 'Event flow from your CloudTrail' : 'End-to-end flow · Your AWS'}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                Demo Scenario
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {useNarrative
              ? hasRealTimeline
                ? `End-to-end attack flow: Internet → VPC → resources · Your CloudTrail (${props.timeline?.events?.length || 0} events) · click to inspect · drag to pan`
                : 'End-to-end attack flow: Internet → VPC → resources · click to inspect · drag to pan'
              : hasRealTimeline
                ? (NODES.some(n => n.id === 'narrative_internet')
                    ? `Event-derived flow from your CloudTrail · ${NODES.length} nodes from ${props.eventsAnalyzed ?? props.timeline?.events?.length ?? 0} events${props.timeRangeDays ? ` (last ${props.timeRangeDays} days)` : ''} · click to inspect · drag to pan`
                    : `Event flow from your CloudTrail · ${NODES.length} nodes from ${props.eventsAnalyzed ?? props.timeline?.events?.length ?? 0} CloudTrail events${props.timeRangeDays ? ` (last ${props.timeRangeDays} days)` : ''} · click to inspect · drag to pan`)
                : 'Click node to select & open details below · hover for preview · drag to pan · Ctrl+scroll to zoom'}
          </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-36 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
            />
            {hasSearchMatch && (
              <div className="absolute top-full left-0 mt-1 py-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[140px]">
                {filteredNodes.slice(0, 5).map((n) => (
                  <button key={n.id} type="button" onClick={() => focusNode(n.id)} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">
                    {n.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Replay Attack */}
          {!replayMode ? (
            <button
              onClick={() => {
                setReplayMode(true);
                setReplayIndex(0);
                setReplayPaused(false);
                const first = replayOrder[0];
                if (first?.severity === 'critical') setCriticalFlash(true);
              }}
              className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" /> Replay Attack
            </button>
          ) : null}
          {/* Export */}
          <div className="flex gap-1">
            <button onClick={exportPng} className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1" title="Download PNG">
              <Download className="w-3 h-3" /> PNG
            </button>
            <button onClick={exportSvg} className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600" title="Download SVG">SVG</button>
          </div>
          {/* Legend — node shapes, colors, arrows */}
          <div className="hidden md:flex items-center gap-4 flex-wrap">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Legend</span>
            {[
              { color: 'bg-red-700', label: 'Critical' },
              { color: 'bg-orange-600', label: 'High' },
              { color: 'bg-blue-600', label: 'Medium' },
              { color: 'bg-emerald-600', label: 'Monitored' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <span className="text-[10px] font-semibold text-slate-500">{item.label}</span>
              </div>
            ))}
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5" title="Circle = actor (user, role, IP)">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-400" />
              <span className="text-[10px] font-semibold text-slate-500">Actor</span>
            </div>
            <div className="flex items-center gap-1.5" title="Square = resource (EC2, S3, IAM)">
              <div className="w-2.5 h-2.5 border-2 border-slate-400" />
              <span className="text-[10px] font-semibold text-slate-500">Resource</span>
            </div>
            <div className="flex items-center gap-1.5" title="Arrows show attack flow direction">
              <span className="text-slate-400">→</span>
              <span className="text-[10px] font-semibold text-slate-500">Attack flow</span>
            </div>
          </div>
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={zoomOut}
              disabled={zoomIndex === 0}
              className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <button
              onClick={resetZoom}
              className="px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-white hover:shadow-sm rounded-md transition-all min-w-[40px]"
              title="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={zoomIn}
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <div className="w-px h-4 bg-slate-300 mx-0.5" />
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all"
              title={isFullscreen ? 'Exit fullscreen' : 'Expand to fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-slate-600" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-600" />}
            </button>
          </div>
        </div>
      </div>

      {/* Replay controls — in header area, above diagram (not overlaying) */}
      {replayMode && (
        <div className="px-6 py-3 border-b border-slate-200 bg-indigo-50/50 flex items-center gap-4 flex-wrap">
          <button
            onClick={() => setReplayPaused((p) => !p)}
            className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-indigo-100 text-indigo-700 transition-colors shadow-sm"
            title={replayPaused ? 'Play' : 'Pause'}
          >
            {replayPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <div className="flex gap-1">
            {[1, 2, 3].map((s) => (
              <button
                key={s}
                onClick={() => setReplaySpeed(s)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${
                  replaySpeed === s ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-600'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setReplayIndex(0);
              setReplayPaused(false);
              const first = replayOrder[0];
              if (first?.severity === 'critical') setCriticalFlash(true);
            }}
            className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors shadow-sm"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-[120px]">
            <div className="text-[10px] font-semibold text-slate-600">
              {replayIndex >= 0 && replayIndex < replayOrder.length
                ? formatReplayTimestamp(replayOrder[replayIndex]?.timestamp)
                : '—'}
            </div>
            <div className="h-1 mt-1 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300"
                style={{
                  width: replayOrder.length > 0 ? `${((replayIndex + 1) / replayOrder.length) * 100}%` : '0%',
                }}
              />
            </div>
          </div>
          {replayIndex >= replayOrder.length - 1 && replayOrder.length > 0 && (
            <span className="text-xs font-bold text-emerald-600">Replay complete</span>
          )}
          <button
            onClick={() => {
              setReplayMode(false);
              setReplayIndex(-1);
              setReplayPaused(false);
              setCriticalFlash(false);
            }}
            className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600"
          >
            Exit Replay
          </button>
        </div>
      )}

      {/* Graph — pannable and zoomable */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden flex-1 min-h-0 flex items-center justify-center select-none transition-all duration-300 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } ${isFullscreen ? 'p-4' : ''} ${criticalFlash ? 'replay-critical-flash' : ''}`}
        style={{
          maxHeight: isFullscreen ? 'none' : 500,
          minHeight: isFullscreen ? 400 : 300,
          touchAction: 'none',
        }}
        onMouseDown={handlePanStart}
        onTouchStart={(e) => { if (e.touches.length !== 2) handlePanStart(e); else handleTouchStart(e); }}
        onTouchMove={handleTouchMove}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
      >
        <div
          className="relative bg-slate-50 rounded-lg touch-none"
          style={{
            minWidth: svgWidth,
            minHeight: svgHeight,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          <svg ref={svgRef} width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="relative z-10" preserveAspectRatio="xMidYMid meet">
            <defs>
              <marker id="arrow-flow" markerWidth="8" markerHeight="5" refX="7" refY="2.5" orient="auto">
                <path d="M 0 0 L 8 2.5 L 0 5 Z" fill="#DC2626" fillOpacity="0.85" stroke="none" />
              </marker>
              <filter id="dash-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.1" />
              </filter>
              <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feFlood floodColor="#4F46E5" floodOpacity="0.2" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Animated gradient for flow */}
              <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.3">
                  <animate attributeName="stop-opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.8">
                  <animate attributeName="stop-opacity" values="0.8;0.3;0.8" dur="1.5s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
            </defs>

            {/* ===== EDGES with animated flow — arrow stops at node edge (no overlap) ===== */}
            {EDGES.map((edge, i) => {
              const from = nodeMap[edge.from];
              const to = nodeMap[edge.to];
              if (!from || !to) return null;
              const fromIdx = replayOrderMap[edge.from] ?? -1;
              const toIdx = replayOrderMap[edge.to] ?? -1;
              const edgeRevealed = !replayMode || (fromIdx <= replayIndex && toIdx <= replayIndex);
              if (!edgeRevealed) return null;

              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const dist = Math.hypot(dx, dy) || 1;
              const NODE_RADIUS = 30;
              const stopX = to.x - (dx / dist) * NODE_RADIUS;
              const stopY = to.y - (dy / dist) * NODE_RADIUS;
              const curveOffset = dist < 80 ? 0 : (Math.abs(dy) > 80 ? (dx > 0 ? -20 : 20) : (dy > 0 ? 24 : -24));
              const cpx = (from.x + to.x) / 2 + (Math.abs(dy) > 50 ? curveOffset : 0);
              const cpy = (from.y + to.y) / 2 + (Math.abs(dy) <= 50 ? curveOffset : 0);
              const t = 0.5;
              const t1 = 0.48;
              const t2 = 0.52;
              const bezier = (tVal: number) => ({
                x: (1 - tVal) ** 2 * from.x + 2 * (1 - tVal) * tVal * cpx + tVal ** 2 * to.x,
                y: (1 - tVal) ** 2 * from.y + 2 * (1 - tVal) * tVal * cpy + tVal ** 2 * to.y,
              });
              const mid = bezier(t);
              const p1 = bezier(t1);
              const p2 = bezier(t2);
              const q1x = (1 - t1) * from.x + t1 * cpx;
              const q1y = (1 - t1) * from.y + t1 * cpy;
              const q2x = (1 - t2) * cpx + t2 * to.x;
              const q2y = (1 - t2) * cpy + t2 * to.y;
              const path1 = `M ${from.x} ${from.y} Q ${q1x} ${q1y} ${p1.x} ${p1.y}`;
              const path2 = `M ${p2.x} ${p2.y} Q ${q2x} ${q2y} ${stopX} ${stopY}`;
              const pathFull = `M ${from.x} ${from.y} Q ${cpx} ${cpy} ${stopX} ${stopY}`;
              const hasLabel = !!edge.label;

              return (
                <g key={`edge-${i}`}>
                  {hasLabel ? (
                    <>
                      {/* First half — line breaks at midpoint for label */}
                      <path d={path1} stroke={edge.color} strokeWidth="1.5" fill="none" opacity="0.3" strokeDasharray="6 4" />
                      <path d={path1} stroke={edge.color} strokeWidth="2" fill="none" strokeDasharray="8 6" strokeLinecap="round" opacity="0.9" className="attack-path-line" style={{ strokeDashoffset: 0, animation: 'dash-flow 2s linear infinite' }} />
                      {/* Second half — with arrow */}
                      <path d={path2} stroke={edge.color} strokeWidth="1.5" fill="none" opacity="0.3" strokeDasharray="6 4" />
                      <path d={path2} stroke={edge.color} strokeWidth="2" fill="none" strokeDasharray="8 6" strokeLinecap="round" markerEnd="url(#arrow-flow)" opacity="0.9" className="attack-path-line" style={{ strokeDashoffset: 0, animation: 'dash-flow 2s linear infinite' }} />
                      {/* Label — offset perpendicular to line to avoid clashing with arrow */}
                      <rect x={mid.x - Math.max((edge.label?.length || 6) * 3.5, 20)} y={mid.y - 22} width={Math.max((edge.label?.length || 6) * 7, 40)} height={18} rx={9} fill="white" stroke="#e2e8f0" strokeWidth="1" pointerEvents="none" />
                      <text x={mid.x} y={mid.y - 13} textAnchor="middle" dominantBaseline="middle" fill="#334155" stroke="none" fontSize="10" fontWeight="600" fontFamily="Inter, system-ui, sans-serif" pointerEvents="none">
                        {edge.label}
                      </text>
                    </>
                  ) : (
                    <>
                      <path d={pathFull} stroke={edge.color} strokeWidth="1.5" fill="none" opacity="0.3" strokeDasharray="6 4" />
                      <path d={pathFull} stroke={edge.color} strokeWidth="2" fill="none" strokeDasharray="8 6" strokeLinecap="round" markerEnd="url(#arrow-flow)" opacity="0.9" className="attack-path-line" style={{ strokeDashoffset: 0, animation: 'dash-flow 2s linear infinite' }} />
                    </>
                  )}
                </g>
              );
            })}

            {/* ===== NODES ===== */}
            {NODES.map((node) => {
              const Icon = node.icon;
              const isHovered = hoveredNode === node.id;
              const isSelected = selectedNode === node.id;
              const isActive = isHovered || isSelected;
              const isSearchMatch = searchLower && (node.label.toLowerCase().includes(searchLower) || node.subLabel.toLowerCase().includes(searchLower) || node.resourceId?.toLowerCase().includes(searchLower));
              const nodeReplayIdx = replayOrderMap[node.id] ?? -1;
              const isRevealed = !replayMode || nodeReplayIdx <= replayIndex;

              return (
                <motion.g
                  key={node.id}
                  initial={replayMode ? false : { scale: 0, opacity: 0 }}
                  animate={{
                    scale: isRevealed ? 1 : 0.8,
                    opacity: isRevealed ? 1 : 0,
                  }}
                  transition={{ duration: 0.35, type: 'spring', stiffness: 200 }}
                  className="cursor-pointer"
                  style={{
                    pointerEvents: isRevealed ? 'auto' : 'none',
                    transformOrigin: `${node.x}px ${node.y}px`,
                  }}
                  onMouseEnter={(e) => handleNodeHover(node.id, e)}
                  onMouseMove={(e) => hoveredNode === node.id && setTooltipPos({ x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => handleNodeHover(null)}
                  onClick={(e) => handleNodeClick(e, node.id)}
                >
                  {(isSelected || isHovered || (searchLower && isSearchMatch)) && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={26}
                      fill="none"
                      stroke={isSearchMatch && !isActive ? '#3B82F6' : node.color}
                      strokeWidth={isSelected ? 3 : 2}
                      opacity={0.4}
                    />
                  )}
                  <foreignObject x={node.x - 24} y={node.y - 24} width="48" height="48">
                    <div className="flex items-center justify-center h-full w-full" style={{ color: node.color }}>
                      {AWS_ICON_SET.has(Icon as any)
                        ? <Icon size={40} color={node.color} />
                        : <Icon className="w-10 h-10" strokeWidth={1.8} />
                      }
                    </div>
                  </foreignObject>
                  <text x={node.x} y={node.y + 38} textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="700" fontFamily="Inter, system-ui, sans-serif" style={{ letterSpacing: '0.02em' }}>
                    {node.label}
                  </text>
                  <text x={node.x} y={node.y + 52} textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="600" fontFamily="Inter, system-ui, sans-serif">
                    {node.subLabel}
                  </text>
                  {(node.mitreId || node.riskScore != null) && (
                    <text
                      x={node.x}
                      y={node.y + 61}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="8"
                      fontWeight="600"
                      fontFamily="monospace"
                    >
                      {[node.mitreId, node.riskScore != null ? `${node.riskScore}` : null].filter(Boolean).join(' · ')}
                    </text>
                  )}
                </motion.g>
              );
            })}

          </svg>
        </div>

        {/* Minimap — when zoomed or panned */}
        {showMinimap && (
          <div className="absolute bottom-3 right-3 z-20 w-32 h-24 rounded-lg border-2 border-solid border-slate-300 bg-white/95 shadow-lg overflow-hidden pointer-events-none">
            <svg width="128" height="96" viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              {EDGES.map((edge, i) => {
                const from = nodeMap[edge.from];
                const to = nodeMap[edge.to];
                if (!from || !to) return null;
                const mx = (from.x + to.x) / 2;
                const my = (from.y + to.y) / 2;
                const curveOffset = Math.abs(to.y - from.y) > 50 ? 0 : 12;
                const pathD = `M ${from.x} ${from.y} Q ${mx} ${my + curveOffset} ${to.x} ${to.y}`;
                return <path key={i} d={pathD} stroke={edge.color} strokeWidth="1.5" fill="none" opacity="0.4" />;
              })}
              {NODES.map((node) => (
                <rect key={node.id} x={node.x - 6} y={node.y - 6} width={12} height={12} rx={2} fill={node.bg} stroke={node.color} strokeWidth="1" />
              ))}
            </svg>
          </div>
        )}
      </div>

      {/* Floating hover tooltip — follows cursor */}
      {activeNode && tooltipPos && (
        <div
          className="fixed z-[100] pointer-events-none -translate-x-1/2 -translate-y-full"
          style={{ left: tooltipPos.x, top: tooltipPos.y - 12 }}
        >
          <div className="px-4 py-3 rounded-lg bg-white border border-slate-200 shadow-lg max-w-[320px]">
            <div className="font-bold text-slate-900 text-sm">
              {activeNode.label} — {activeNode.subLabel}
            </div>
            {activeNode.resourceId && (
              <div className="text-[11px] text-slate-600 font-mono mt-0.5">{activeNode.resourceId}</div>
            )}
            <div className="text-[11px] text-slate-600 mt-1">{activeNode.detail}</div>
            <div className="text-[10px] text-slate-500 mt-1.5 font-semibold">
              Severity: {activeNode.severity.toUpperCase()}
              {activeNode.riskScore != null && ` • Risk ${activeNode.riskScore}/100`}
              {activeNode.mitreId && (
                <span> • {activeNode.mitreId}{MITRE_MAP[activeNode.mitreId] ? `: ${MITRE_MAP[activeNode.mitreId].name}` : ''}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Panel (bottom) — only when node is clicked/selected, so user can reach the View Remediation button */}
      {detailPanelNode && (() => {
        const DetailIcon = /secret|credential|key|lock/i.test(detailPanelNode.label + detailPanelNode.subLabel) ? IconLock : IconShield;
        return (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 py-3 border-t border-slate-100 bg-slate-50/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
              <DetailIcon className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-900">{detailPanelNode.label}</span>
                <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${
                  detailPanelNode.severity === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                  detailPanelNode.severity === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  detailPanelNode.severity === 'low' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {detailPanelNode.severity.toUpperCase()}
                </span>
                {detailPanelNode.riskScore != null && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-white border border-slate-700">
                    {detailPanelNode.riskScore}/100
                  </span>
                )}
                {detailPanelNode.mitreId && (
                  <a
                    href={MITRE_MAP[detailPanelNode.mitreId]?.url ?? `https://attack.mitre.org/techniques/${detailPanelNode.mitreId}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono hover:bg-indigo-100"
                  >
                    MITRE {detailPanelNode.mitreId}
                  </a>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{detailPanelNode.detail}</p>
              {detailPanelNode.mitreId && (
                <div className="mt-2 p-2 rounded-lg bg-slate-100 border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-700">{detailPanelNode.mitreId}{MITRE_MAP[detailPanelNode.mitreId] ? `: ${MITRE_MAP[detailPanelNode.mitreId].name}` : ''}</p>
                  {MITRE_MAP[detailPanelNode.mitreId] && <p className="text-[10px] text-slate-600 mt-0.5">{MITRE_MAP[detailPanelNode.mitreId].desc}</p>}
                  <a href={MITRE_MAP[detailPanelNode.mitreId]?.url ?? `https://attack.mitre.org/techniques/${detailPanelNode.mitreId}/`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-600 hover:underline mt-1 inline-block">
                    Learn more on MITRE ATT&CK →
                  </a>
                </div>
              )}
              {(threatIntelLoading || threatIntelData) && extractIpFromNode(detailPanelNode) && (
                <div className="mt-2 p-3 rounded-lg bg-slate-900 text-slate-100 border border-slate-700">
                  <p className="text-[10px] font-bold text-amber-400 flex items-center gap-1.5">🛡️ Threat Intelligence</p>
                  {threatIntelLoading ? (
                    <p className="text-[10px] text-slate-400 mt-1">Loading reputation…</p>
                  ) : threatIntelData?.error ? (
                    <p className="text-[10px] text-slate-400 mt-1">{threatIntelData.error}</p>
                  ) : threatIntelData?.source === 'demo' ? (
                    <div className="mt-1.5 text-[10px] space-y-1">
                      <p className="text-amber-200/90 font-medium">Threat intel is demo data — not a live lookup.</p>
                      <p className="text-slate-500">Add ABUSEIPDB_API_KEY or VIRUSTOTAL_API_KEY for real IP reputation. The scores shown above are generic placeholders and may not reflect your actual IP.</p>
                    </div>
                  ) : (
                    <div className="mt-1.5 text-[10px] space-y-0.5">
                      <p><span className="text-slate-400">IP {threatIntelData?.ip}</span> — {threatIntelData?.abuse_score ?? 0}% abuse confidence, reported {threatIntelData?.reports ?? 0} times</p>
                      {(threatIntelData?.categories?.length > 0) && (
                        <p className="text-slate-400">Categories: {threatIntelData.categories.join(', ')}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
              {props.onNavigateToRemediation && (detailPanelNode.severity === 'critical' || detailPanelNode.severity === 'high') && (
                <button
                  type="button"
                  onClick={props.onNavigateToRemediation}
                  className="mt-2 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  View Remediation →
                </button>
              )}
            </div>
          </div>
        </motion.div>
        );
      })()}

      <style>{`
        @keyframes dash-flow {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -28; }
        }
        .attack-path-line {
          stroke-dasharray: 8 6;
          animation: dash-flow 2s linear infinite;
        }
        .replay-critical-flash {
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.9);
          animation: replay-flash 0.5s ease-out;
        }
        @keyframes replay-flash {
          0% { box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.9); }
          100% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.4); }
        }
      `}</style>
    </div>
  );
};

export default AttackPathDiagram;
