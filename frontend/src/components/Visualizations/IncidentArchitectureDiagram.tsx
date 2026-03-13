/**
 * Incident Architecture Diagram — Rectangular card grid showing affected resources by severity
 * Simple, clean layout: no connection lines. Attack flow lives on the Attack Path page.
 */
import React, { useState, useMemo } from 'react';
import { Shield, Server, User, Eye, Wifi, Database, Key, Zap } from 'lucide-react';
import type { Timeline } from '../../types/incident';
import type { TimelineEvent } from '../../types/incident';

type ResourceType = 'iam_role' | 'iam_user' | 'ec2' | 'sg' | 'rds' | 's3' | 'bedrock' | 'lambda' | 'kms' | 'monitoring' | 'other';
type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

interface ResourceNode {
  id: string;
  label: string;
  subLabel: string;
  type: ResourceType;
  severity: SeverityLevel;
  detail?: string;
  fullResource?: string; // full resource ID for tooltip when label is truncated
}

/** Extract AWS service from ARN (arn:aws:SERVICE:...) or eventSource (x.amazonaws.com) */
function extractService(arnOrSource: string): string {
  if (!arnOrSource?.trim()) return '';
  const s = arnOrSource.toLowerCase();
  const arnMatch = s.match(/^arn:aws:([a-z0-9-]+):/);
  if (arnMatch) return arnMatch[1];
  const sourceMatch = s.match(/([a-z0-9-]+)\.amazonaws\.com/);
  if (sourceMatch) return sourceMatch[1];
  return '';
}

/** Map service to ResourceType — works for any AWS service (SageMaker, OpenSearch, etc.) */
const SERVICE_TO_TYPE: Record<string, ResourceType> = {
  ec2: 'ec2', lambda: 'lambda', batch: 'ec2', fargate: 'ec2', eks: 'ec2', ecs: 'ec2',
  s3: 's3', glacier: 's3', bedrock: 'bedrock', sagemaker: 'bedrock', rekognition: 'bedrock', comprehend: 'bedrock',
  rds: 'rds', dynamodb: 'rds', opensearch: 'rds', elasticache: 'rds', documentdb: 'rds', keyspaces: 'rds', redshift: 'rds',
  iam: 'iam_user', sts: 'iam_role', cognito: 'iam_user',
  kms: 'kms', secretsmanager: 'kms', cloudtrail: 'monitoring', cloudwatch: 'monitoring', guardduty: 'monitoring', config: 'monitoring', securityhub: 'monitoring',
};

function inferType(action: string, resource: string): ResourceType {
  const service = extractService(resource) || extractService(action);
  if (service && SERVICE_TO_TYPE[service]) return SERVICE_TO_TYPE[service];
  const a = action.toLowerCase();
  const r = resource.toLowerCase();
  if (r.includes('sg-') || r.includes('security-group') || a.includes('securitygroup')) return 'sg';
  if (r.includes('i-') || r.includes('instance') || a.includes('runinstances')) return 'ec2';
  if (r.includes('role') || a.includes('attachrole') || a.includes('assumerole')) return 'iam_role';
  if (r.includes('user') || a.includes('createaccesskey') || a.includes('putuserpolicy')) return 'iam_user';
  if (r.includes('bucket') || a.includes('putobject') || a.includes('getobject')) return 's3';
  if (r.includes('db-') || r.includes('database')) return 'rds';
  if (r.includes('cloudtrail') || r.includes('cloudwatch')) return 'monitoring';
  return 'other';
}

/** Humanize long/cryptic resource strings for display (like demo mode) */
function parseResource(resource: string): string {
  if (!resource?.trim()) return 'Resource';
  let r = resource.trim();
  // Bedrock Environment + Session UUID → friendly label
  if (/Environment\s+[a-f0-9-]{36}/i.test(r) || /Session\s+[\d-]+[a-z0-9]+/i.test(r)) {
    if (r.toLowerCase().includes('policy') || r.toLowerCase().includes('iam')) {
      const m = r.match(/IAM\s*Policy[:\s]+([\w-]+)/i) || r.match(/([A-Za-z][\w-]*)/);
      return m ? m[1] : 'IAM Policy';
    }
    return 'Bedrock Session';
  }
  if (/^Environment\s+/i.test(r) && r.length > 30) return 'Bedrock Environment';
  // IAM Policy name
  const policyMatch = r.match(/IAM\s*Policy[:\s]+([\w-]+)/i) || r.match(/([A-Za-z][\w-]*BedrockAccess)/);
  if (policyMatch) return policyMatch[1];
  const colon = r.indexOf(':');
  if (colon > 0) r = r.slice(colon + 1).trim();
  const slash = r.lastIndexOf('/');
  if (slash > 0 && (r.includes('role/') || r.includes('user/'))) r = r.slice(slash + 1);
  return (r || 'Resource').length > 28 ? r.slice(0, 26) + '…' : r || 'Resource';
}

function isServiceLinkedRole(resource: string): boolean {
  const r = (resource || '').toLowerCase();
  return r.includes('awsservicerolefor') || r.includes('aws-service-role/') || r.includes('service-role/');
}

function getSeverity(ev: TimelineEvent, action: string, type: ResourceType): SeverityLevel {
  const s = (ev.severity || '').toUpperCase();
  const a = action.toLowerCase();
  const resource = ev.resource || '';

  // AWS service-linked roles performing AssumeRole are normal activity, not compromised
  if (a.includes('assumerole') && isServiceLinkedRole(resource)) {
    return 'low';
  }

  if ((type === 'iam_role' || type === 'iam_user') && (
    a.includes('attachrole') || a.includes('administrator') ||
    a.includes('attachentitypolicy') || a.includes('putuserp') || a.includes('putrolep') ||
    ev.significance?.toLowerCase().includes('administrator')
  )) return 'critical';

  // Non-service-linked AssumeRole on IAM roles is still suspicious
  if ((type === 'iam_role' || type === 'iam_user') && a.includes('assumerole')) return 'high';

  if (s === 'CRITICAL') return 'critical';
  if (s === 'HIGH') return 'high';
  if (s === 'MEDIUM') return 'medium';
  return 'low';
}

function getSeverityColors(severity: SeverityLevel): { border: string; badge: string; label: string; textColor: string } {
  switch (severity) {
    case 'critical': return { border: '#FDA4AF', badge: 'bg-rose-100 text-rose-700 border-rose-200', label: 'Compromised', textColor: '#BE123C' };
    case 'high': return { border: '#FCD34D', badge: 'bg-amber-100 text-amber-700 border-amber-200', label: 'At-risk', textColor: '#B45309' };
    case 'medium': return { border: '#FDE68A', badge: 'bg-amber-50 text-amber-600 border-amber-100', label: 'Exposed', textColor: '#D97706' };
    default: return { border: '#86EFAC', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Monitored', textColor: '#059669' };
  }
}

function extractNodes(events: TimelineEvent[]): ResourceNode[] {
  const seen = new Map<string, { node: ResourceNode; severity: SeverityLevel }>();

  for (const ev of events) {
    const resource = ev.resource?.trim();
    const action = ev.action?.trim();
    if (!resource && !action) continue;

    const displayName = parseResource(resource);
    const type = inferType(action || '', resource || '');
    const severity = getSeverity(ev, action || '', type);
    const id = type === 'other' ? `res-${seen.size}` : `${type}-${displayName.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
    const detail = ev.significance || `${action || 'Accessed'} — ${resource || displayName}`;

    if (!seen.has(id)) {
      const fullResource = resource?.trim() && resource !== displayName ? resource : undefined;
      seen.set(id, {
        node: { id, label: displayName, subLabel: getSeverityColors(severity).label, type, severity, detail, fullResource },
        severity,
      });
    } else {
      const existing = seen.get(id)!;
      if (severity === 'critical' || (severity === 'high' && existing.severity !== 'critical')) {
        existing.severity = severity;
        existing.node.severity = severity;
        existing.node.subLabel = getSeverityColors(severity).label;
      }
    }
  }

  let nodes = Array.from(seen.values()).map(v => v.node);
  const hasCloudTrail = nodes.some(n => n.label.toLowerCase().includes('cloudtrail'));
  if (!hasCloudTrail) {
    nodes = [...nodes, { id: 'cloudtrail-monitoring', label: 'CloudTrail', subLabel: 'Monitored', type: 'other' as ResourceType, severity: 'low' as SeverityLevel, detail: 'Detected by wolfir — monitoring active' }];
  }
  return nodes;
}

function parseFinding(finding: string): { action: string; resource: string; significance: string } {
  const arrow = finding.indexOf(' → ');
  if (arrow < 0) return { action: '', resource: finding, significance: '' };
  const action = finding.slice(0, arrow).trim();
  const after = finding.slice(arrow + 3);
  const dot = after.indexOf('.');
  const resource = (dot > 0 ? after.slice(0, dot) : after).trim();
  const significance = dot > 0 ? after.slice(dot + 1).trim() : '';
  return { action, resource, significance };
}

interface IncidentArchitectureDiagramProps {
  timeline: Timeline;
  orchestrationResult?: any;
  securityFindings?: string[];
  /** When true, adds attack path overlay (pulsing ring) on critical/compromised nodes */
  showAttackPathOverlay?: boolean;
}

const IncidentArchitectureDiagram: React.FC<IncidentArchitectureDiagramProps> = ({
  timeline, orchestrationResult: _orchestrationResult, securityFindings, showAttackPathOverlay = false,
}) => {
  const nodes = useMemo(() => {
    const events = timeline?.events || [];
    let result = extractNodes(events);
    if (result.length < 2 && securityFindings?.length) {
      const syntheticEvents: TimelineEvent[] = securityFindings.map(f => {
        const { action, resource, significance } = parseFinding(f);
        const a = action.toLowerCase();
        const r = resource.toLowerCase();
        let sev: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 'HIGH';
        if ((a.includes('attachrole') || a.includes('assumerole')) && (r.includes('role') || r.includes('admin'))) sev = 'CRITICAL';
        return { action, resource, significance, severity: sev, timestamp: '', actor: '' };
      });
      result = extractNodes(syntheticEvents);
    }
    return result;
  }, [timeline?.events, securityFindings]);

  const layout = useMemo(() => {
    if (nodes.length === 0) return [];
    const network: ResourceNode[] = [];
    const compute: ResourceNode[] = [];
    const identity: ResourceNode[] = [];
    const storage: ResourceNode[] = [];
    const aiml: ResourceNode[] = [];
    const security: ResourceNode[] = [];
    const monitoring: ResourceNode[] = [];

    nodes.forEach(n => {
      if (n.type === 'monitoring' || n.id === 'cloudtrail-monitoring' || n.label.toLowerCase().includes('cloudtrail') || n.label.toLowerCase().includes('cloudwatch')) monitoring.push(n);
      else if (n.type === 'sg') network.push(n);
      else if (n.type === 'ec2' || n.type === 'rds' || n.type === 'lambda') compute.push(n);
      else if (n.type === 'iam_role' || n.type === 'iam_user') identity.push(n);
      else if (n.type === 's3') storage.push(n);
      else if (n.type === 'bedrock') aiml.push(n);
      else if (n.type === 'kms') security.push(n);
      else network.push(n);
    });

    const rows: ResourceNode[][] = [];
    if (identity.length) rows.push(identity);
    if (compute.length) rows.push(compute);
    if (storage.length) rows.push(storage);
    if (aiml.length) rows.push(aiml);
    if (network.length) rows.push(network);
    if (security.length) rows.push(security);
    if (monitoring.length) rows.push(monitoring);
    return rows.length ? rows : [nodes];
  }, [nodes]);

  // Map row group type to label
  const rowLabels: Record<number, string> = {};
  layout.forEach((row, i) => {
    const types = new Set(row.map(n => n.type));
    if (types.has('monitoring') || row.some(n => n.label.toLowerCase().includes('cloudtrail'))) rowLabels[i] = 'Monitoring';
    else if (types.has('iam_role') || types.has('iam_user')) rowLabels[i] = 'Identity';
    else if (types.has('ec2') || types.has('rds') || types.has('lambda')) rowLabels[i] = 'Compute';
    else if (types.has('s3')) rowLabels[i] = 'Storage';
    else if (types.has('bedrock')) rowLabels[i] = 'AI / ML';
    else if (types.has('kms')) rowLabels[i] = 'Encryption';
    else if (types.has('sg')) rowLabels[i] = 'Network';
    else rowLabels[i] = 'Resources';
  });

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const getRowIcon = (label: string) => {
    if (label === 'Network') return Shield;
    if (label === 'Compute') return Server;
    if (label === 'Identity') return User;
    if (label === 'Monitoring') return Eye;
    if (label === 'Storage') return Database;
    if (label === 'AI / ML') return Zap;
    if (label === 'Encryption') return Key;
    return Wifi;
  };

  if (nodes.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
        <p className="text-sm text-slate-600">No affected resources to display.</p>
      </div>
    );
  }

  const nodeList = layout.flat();

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-100 bg-white shadow-sm">
      <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">
          {showAttackPathOverlay ? 'Attack path overlay — compromised nodes highlighted' : 'Auto-generated from incident findings'}
        </span>
        <span className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Compromised</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> At-risk</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Monitored</span>
        </span>
      </div>
      <div className="p-4 rounded-b-xl relative bg-slate-50/30 overflow-auto max-h-[420px] min-h-[200px] overscroll-contain">
        <div className="rounded-xl border border-slate-100 bg-white px-4 py-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
            VPC (10.0.0.0/16)
          </div>
          {/* Horizontal layout: categories as columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {layout.map((row, ri) => {
            const label = rowLabels[ri];
            const RowIcon = label ? getRowIcon(label) : Wifi;
            return (
              <div key={ri} className="flex flex-col min-w-0 rounded-lg bg-slate-50/50 px-3 py-3 border border-slate-100/80">
                {label && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200/60">
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <RowIcon className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 truncate">{label}</span>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {row.map(n => {
                    const colors = getSeverityColors(n.severity);
                    const isHovered = hoveredNode === n.id;
                    return (
                      <div
                        key={n.id}
                        className={`relative rounded-lg border-l-[3px] px-3 py-2.5 cursor-pointer transition-all bg-white border border-slate-100 w-full min-w-0 ${isHovered ? 'shadow-md ring-1 ring-slate-200/60' : 'shadow-sm hover:shadow'} ${showAttackPathOverlay && n.severity === 'critical' ? 'ring-2 ring-red-500 ring-offset-1 animate-pulse' : ''}`}
                        style={{ borderLeftColor: colors.border }}
                        onMouseEnter={(e) => { setHoveredNode(n.id); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
                        onMouseMove={(e) => hoveredNode === n.id && setTooltipPos({ x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => { setHoveredNode(null); setTooltipPos(null); }}
                      >
                        <div className="font-semibold text-slate-800 text-xs break-words leading-tight">{n.label}</div>
                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-medium border w-fit ${colors.badge}`}>{n.subLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          </div>
        </div>

        {hoveredNode && tooltipPos && (() => {
          const n = nodeList.find(x => x.id === hoveredNode);
          if (!n) return null;
          const colors = getSeverityColors(n.severity);
          const typeName = n.type === 'iam_role' ? 'IAM Role' : n.type === 'iam_user' ? 'IAM User' : n.type === 'ec2' ? 'EC2 Instance' : n.type === 'sg' ? 'Security Group' : n.type === 'rds' ? 'RDS' : 'Resource';
          return (
            <div
              className="fixed z-[100] pointer-events-none -translate-x-1/2 -translate-y-full"
              style={{ left: tooltipPos.x, top: tooltipPos.y - 12 }}
            >
              <div className="px-4 py-3 rounded-lg bg-white border border-slate-200 shadow-lg max-w-[400px]">
                <div className="font-bold text-slate-900 text-sm">{n.label} — {n.subLabel}</div>
                <div className="text-xs text-slate-600 font-mono mt-0.5">{typeName}</div>
                {n.fullResource && (
                  <div className="text-xs text-slate-500 font-mono mt-1 break-all" title="Full resource ID">
                    {n.fullResource}
                  </div>
                )}
                <div className="text-xs text-slate-600 mt-1">{n.detail || `${n.subLabel} — affected by incident`}</div>
                <div className="text-xs font-semibold mt-1.5" style={{ color: colors.textColor }}>Severity: {n.severity.toUpperCase()}</div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default IncidentArchitectureDiagram;
