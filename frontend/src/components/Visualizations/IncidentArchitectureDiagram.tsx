/**
 * Incident Architecture Diagram — Rectangular card grid showing affected resources by severity
 * Simple, clean layout: no connection lines. Attack flow lives on the Attack Path page.
 */
import React, { useState, useMemo } from 'react';
import { Shield, Server, User, Eye, Wifi } from 'lucide-react';
import type { Timeline } from '../../types/incident';
import type { TimelineEvent } from '../../types/incident';

type ResourceType = 'iam_role' | 'iam_user' | 'ec2' | 'sg' | 'rds' | 'other';
type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

interface ResourceNode {
  id: string;
  label: string;
  subLabel: string;
  type: ResourceType;
  severity: SeverityLevel;
  detail?: string;
}

function inferType(action: string, resource: string): ResourceType {
  const a = action.toLowerCase();
  const r = resource.toLowerCase();
  if (r.includes('sg-') || r.includes('security group') || a.includes('securitygroup') || a.includes('authorizesecuritygroup')) return 'sg';
  if (r.includes('i-') || r.includes('ec2') || r.includes('instance') || a.includes('runinstances')) return 'ec2';
  if (r.includes('role') || a.includes('attachrole') || a.includes('assumerole') || a.includes('attachentitypolicy')) return 'iam_role';
  if (r.includes('user') || a.includes('createaccesskey')) return 'iam_user';
  if (r.includes('db-') || r.includes('rds') || r.includes('database')) return 'rds';
  if (a.includes('guardduty') || a.includes('finding')) return 'other';
  return 'other';
}

function parseResource(resource: string): string {
  if (!resource?.trim()) return 'Resource';
  let r = resource.trim();
  const colon = r.indexOf(':');
  if (colon > 0) r = r.slice(colon + 1).trim();
  const slash = r.lastIndexOf('/');
  if (slash > 0 && (r.includes('role/') || r.includes('user/'))) r = r.slice(slash + 1);
  return r || 'Resource';
}

function getSeverity(ev: TimelineEvent, action: string, type: ResourceType): SeverityLevel {
  const s = (ev.severity || '').toUpperCase();
  const a = action.toLowerCase();
  if ((type === 'iam_role' || type === 'iam_user') && (
    a.includes('assumerole') || a.includes('attachrole') || a.includes('administrator') ||
    a.includes('attachentitypolicy') || ev.significance?.toLowerCase().includes('administrator')
  )) return 'critical';
  if (s === 'CRITICAL') return 'critical';
  if (s === 'HIGH') return 'high';
  if (s === 'MEDIUM') return 'medium';
  return 'low';
}

function getSeverityColors(severity: SeverityLevel): { bg: string; border: string; label: string } {
  switch (severity) {
    case 'critical': return { bg: '#FEE2E2', border: '#EF4444', label: 'Compromised' };
    case 'high': return { bg: '#FEF3C7', border: '#F59E0B', label: 'At-risk' };
    case 'medium': return { bg: '#FEF9C3', border: '#EAB308', label: 'Exposed' };
    default: return { bg: '#D1FAE5', border: '#10B981', label: 'Monitored' };
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
      seen.set(id, {
        node: { id, label: displayName, subLabel: getSeverityColors(severity).label, type, severity, detail },
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
    nodes = [...nodes, { id: 'cloudtrail-monitoring', label: 'CloudTrail', subLabel: 'Monitored', type: 'other' as ResourceType, severity: 'low' as SeverityLevel, detail: 'Detected by Nova Sentinel — monitoring active' }];
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
}

const IncidentArchitectureDiagram: React.FC<IncidentArchitectureDiagramProps> = ({
  timeline, orchestrationResult, securityFindings,
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
    const monitoring: ResourceNode[] = [];

    nodes.forEach(n => {
      if (n.id === 'cloudtrail-monitoring' || n.label.toLowerCase().includes('cloudtrail')) monitoring.push(n);
      else if (n.type === 'sg') network.push(n);
      else if (n.type === 'ec2' || n.type === 'rds') compute.push(n);
      else if (n.type === 'iam_role' || n.type === 'iam_user') identity.push(n);
      else network.push(n);
    });

    const rows: ResourceNode[][] = [];
    if (network.length) rows.push(network);
    if (compute.length) rows.push(compute);
    if (identity.length) rows.push(identity);
    if (monitoring.length) rows.push(monitoring);
    return rows.length ? rows : [nodes];
  }, [nodes]);

  const rowLabels: Record<number, string> = {};
  layout.forEach((row, i) => {
    const first = row[0];
    if (first?.id === 'cloudtrail-monitoring' || first?.label.toLowerCase().includes('cloudtrail')) rowLabels[i] = 'Monitoring';
    else if (first?.type === 'sg') rowLabels[i] = 'Network';
    else if (first?.type === 'ec2' || first?.type === 'rds') rowLabels[i] = 'Compute';
    else if (first?.type === 'iam_role' || first?.type === 'iam_user') rowLabels[i] = 'Identity';
    else rowLabels[i] = 'Network';
  });

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const getRowIcon = (label: string) => {
    if (label === 'Network') return Shield;
    if (label === 'Compute') return Server;
    if (label === 'Identity') return User;
    if (label === 'Monitoring') return Eye;
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
  const CARD_W = 180;

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
      <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700">Auto-generated from incident findings</span>
        <span className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Compromised</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> At-risk</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Monitored</span>
        </span>
      </div>
      <div className="p-5 overflow-y-auto max-h-[480px] min-h-[320px] rounded-b-xl relative">
        <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 px-5 py-4">
          <div className="text-sm font-semibold text-slate-600 mb-4">VPC (10.0.0.0/16)</div>
          <div className="space-y-6">
          {layout.map((row, ri) => {
            const label = rowLabels[ri];
            const RowIcon = label ? getRowIcon(label) : Wifi;
            return (
              <div key={ri}>
                {label && (
                  <div className="flex items-center gap-2 mb-3">
                    <RowIcon className="w-4 h-4 text-slate-500" strokeWidth={2.5} />
                    <span className="text-xs font-bold text-slate-700">{label}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-4">
                  {row.map(n => {
                    const colors = getSeverityColors(n.severity);
                    const isHovered = hoveredNode === n.id;
                    return (
                      <div
                        key={n.id}
                        className="relative rounded-lg border-l-4 px-4 py-3 cursor-pointer transition-all hover:shadow-md"
                        style={{
                          backgroundColor: colors.bg,
                          borderLeftColor: colors.border,
                          boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.06)',
                          width: CARD_W,
                          minWidth: CARD_W,
                        }}
                        onMouseEnter={(e) => { setHoveredNode(n.id); setTooltipPos({ x: e.clientX, y: e.clientY }); }}
                        onMouseMove={(e) => hoveredNode === n.id && setTooltipPos({ x: e.clientX, y: e.clientY })}
                        onMouseLeave={() => { setHoveredNode(null); setTooltipPos(null); }}
                      >
                        <div className="font-semibold text-slate-800 text-sm">{n.label}</div>
                        <div className="text-xs font-medium mt-0.5" style={{ color: colors.border }}>{n.subLabel}</div>
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
              <div className="px-4 py-3 rounded-lg bg-white border border-slate-200 shadow-lg max-w-[320px]">
                <div className="font-bold text-slate-900 text-sm">{n.label} — {n.subLabel}</div>
                <div className="text-[11px] text-slate-600 font-mono mt-0.5">{typeName}</div>
                <div className="text-[11px] text-slate-600 mt-1">{n.detail || `${n.subLabel} — affected by incident`}</div>
                <div className="text-[10px] font-semibold mt-1.5" style={{ color: colors.border }}>Severity: {n.severity.toUpperCase()}</div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default IncidentArchitectureDiagram;
