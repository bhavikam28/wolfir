/**
 * Attack Path Diagram — React Flow version with AWS icons
 * Full feature set: Replay Attack, Search, Export, Zoom, Fullscreen, Legend
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Node,
  Edge,
  NodeTypes,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import html2canvas from 'html2canvas';
import { Globe, AlertTriangle, Zap, Search, Download, Play, Pause, RotateCcw, ZoomIn, ZoomOut, Maximize2, Minimize2, Shield } from 'lucide-react';
import {
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
import { IconAttackPath } from '../ui/MinimalIcons';

type Severity = 'critical' | 'high' | 'medium' | 'low';

interface NodeData {
  label: string;
  subLabel: string;
  detail: string;
  icon: React.ComponentType<{ className?: string; size?: number; color?: string }>;
  severity: Severity;
  riskScore?: number;
  mitreId?: string;
  timestamp?: string;
}

const MITRE_MAP: Record<string, { name: string; desc: string; url: string }> = {
  T1078: { name: 'Valid Accounts', desc: 'Adversary uses stolen/compromised credentials to access resources. High impact — bypasses detection.', url: 'https://attack.mitre.org/techniques/T1078/' },
  T1098: { name: 'Account Manipulation', desc: 'Adversary modifies account permissions to maintain access or escalate privileges.', url: 'https://attack.mitre.org/techniques/T1098/' },
  T1190: { name: 'Exploit Public-Facing Application', desc: 'Initial access via vulnerable web app, API, or service exposed to the internet.', url: 'https://attack.mitre.org/techniques/T1190/' },
  T1021: { name: 'Remote Services', desc: 'Access via SSH, RDP, or other remote services. Common for lateral movement.', url: 'https://attack.mitre.org/techniques/T1021/' },
  T1041: { name: 'Exfiltration Over C2 Channel', desc: 'Data theft through command-and-control channel. Indicates data loss risk.', url: 'https://attack.mitre.org/techniques/T1041/' },
  T1552: { name: 'Unsecured Credentials', desc: 'Accessing stored credentials (Secrets Manager, config files). Enables privilege escalation.', url: 'https://attack.mitre.org/techniques/T1552/' },
  T1562: { name: 'Impair Defenses', desc: 'Adversary disables or evades security tools (CloudTrail, GuardDuty). Reduces visibility.', url: 'https://attack.mitre.org/techniques/T1562/' },
  T1578: { name: 'Modify Cloud Compute', desc: 'Adversary creates or modifies cloud compute resources to execute malicious workloads.', url: 'https://attack.mitre.org/techniques/T1578/' },
  T1530: { name: 'Data from Cloud Storage', desc: 'Adversary accesses data from cloud storage (S3, etc.) for exfiltration.', url: 'https://attack.mitre.org/techniques/T1530/' },
  'AML.T0051': { name: 'Prompt Injection', desc: 'Manipulating LLM input to extract data or trigger unintended actions.', url: 'https://atlas.mitre.org/techniques/AML.T0051/' },
};

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#DC2626',
  high: '#EA580C',
  medium: '#2563eb',
  low: '#059669',
};

const AWS_ICONS = new Set([
  AmazonApiGateway, AmazonVirtualPrivateCloud, AwsCloudTrail, AmazonEc2,
  AwsIdentityAndAccessManagement, AmazonRds, AwsShield, AwsSecretsManager, AmazonSimpleStorageService,
]);

function AttackPathNode({ data }: { data: NodeData }) {
  const Icon = data.icon;
  const color = SEVERITY_COLORS[data.severity] || '#64748B';
  const isAwsIcon = AWS_ICONS.has(Icon as any);
  const bg = data.severity === 'critical' ? '#fef2f2' : data.severity === 'high' ? '#fff7ed' : data.severity === 'low' ? '#f0fdf4' : '#eff6ff';
  const borderColor = color;
  return (
    <div className="flex flex-col items-center justify-center min-w-0">
      <div
        className="relative w-[72px] h-[72px] rounded-xl border-2 shadow-sm flex items-center justify-center"
        style={{ borderColor, backgroundColor: bg }}
      >
        <Handle type="target" position={Position.Left} className="!w-2 !h-2 !border-2 !bg-white !top-1/2 !-translate-y-1/2" style={{ left: -14 }} />
        {isAwsIcon ? (
          <Icon size={56} color={color} />
        ) : (
          <Icon className="w-14 h-14" color={color} />
        )}
        <Handle type="source" position={Position.Right} className="!w-2 !h-2 !border-2 !bg-white !top-1/2 !-translate-y-1/2" style={{ right: -14, left: 'auto' }} />
      </div>
      <span className="text-[11px] font-bold text-slate-900 text-center leading-tight max-w-[100px] truncate mt-1.5">{data.label}</span>
      <span className="text-[9px] text-slate-500 text-center">{data.subLabel}</span>
      {(data.mitreId || data.riskScore != null) && (
        <span className="text-[8px] font-mono text-slate-500">
          {[data.mitreId, data.riskScore != null ? `${data.riskScore}` : null].filter(Boolean).join(' · ')}
        </span>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = { attackPath: AttackPathNode };

const EDGE_LABELS_STANDARD: Record<string, string> = {
  e1: 'HTTP/S', e2: 'Route', e3: 'SSH:22', e4: 'AssumeRole', e5: 'Query',
  e6: 'Route', e7: 'Exploit', e8: 'SSH', e9: 'Exfil', e10: 'GetSecret', e11: 'Logged',
};
const EDGE_LABELS_AI: Record<string, string> = {
  e1: 'InvokeModel', e2: 'API', e3: 'AssumeRole', e4: 'GetObject', e5: 'Logged',
};

const DEMO_NODES_STANDARD: Node[] = [
  { id: 'internet', type: 'attackPath', position: { x: 50, y: 180 }, data: { label: 'Internet', subLabel: 'External Origin', detail: 'Suspicious IP: 203.0.113.42 (TOR exit node)', icon: Globe, severity: 'medium' as Severity, mitreId: 'T1190', timestamp: '2026-01-15T14:20:00Z' } },
  { id: 'gateway', type: 'attackPath', position: { x: 220, y: 180 }, data: { label: 'API Gateway', subLabel: 'Entry Point', detail: 'REST API — 847 requests in 2 minutes', icon: AmazonApiGateway, severity: 'medium' as Severity, mitreId: 'T1190', timestamp: '2026-01-15T14:20:15Z' } },
  { id: 'vpc', type: 'attackPath', position: { x: 390, y: 180 }, data: { label: 'VPC', subLabel: 'Network Layer', detail: 'vpc-0a1b2c3d — us-east-1', icon: AmazonVirtualPrivateCloud, severity: 'medium' as Severity, mitreId: 'T1021', timestamp: '2026-01-15T14:20:30Z' } },
  { id: 'ec2', type: 'attackPath', position: { x: 560, y: 180 }, data: { label: 'EC2 Instance', subLabel: 'Compromised', detail: 'i-abc123 — Attacker installed crypto-miner', icon: AmazonEc2, severity: 'critical' as Severity, riskScore: 98, mitreId: 'T1078', timestamp: '2026-01-15T14:21:00Z' } },
  { id: 'iam', type: 'attackPath', position: { x: 720, y: 180 }, data: { label: 'IAM Role', subLabel: 'Escalated', detail: 'arn:aws:iam::role/admin-temp — privilege escalation', icon: AwsIdentityAndAccessManagement, severity: 'critical' as Severity, riskScore: 92, mitreId: 'T1078', timestamp: '2026-01-15T14:21:45Z' } },
  { id: 'database', type: 'attackPath', position: { x: 880, y: 180 }, data: { label: 'RDS Database', subLabel: 'Data Target', detail: 'db-prod-main — 2.4GB data accessed', icon: AmazonRds, severity: 'high' as Severity, riskScore: 78, mitreId: 'T1041', timestamp: '2026-01-15T14:22:30Z' } },
  { id: 'sg', type: 'attackPath', position: { x: 280, y: 60 }, data: { label: 'Security Group', subLabel: 'Misconfigured', detail: 'sg-0xyz — 0.0.0.0/0 on port 22 (OPEN)', icon: AwsShield, severity: 'critical' as Severity, riskScore: 95, mitreId: 'T1190', timestamp: '2026-01-15T14:20:45Z' } },
  { id: 'ssh', type: 'attackPath', position: { x: 500, y: 60 }, data: { label: 'SSH Exposed', subLabel: 'Port 22 Open', detail: '14 failed login attempts before breach', icon: AlertTriangle, severity: 'critical' as Severity, riskScore: 94, mitreId: 'T1021', timestamp: '2026-01-15T14:21:15Z' } },
  { id: 'secrets', type: 'attackPath', position: { x: 720, y: 60 }, data: { label: 'Secrets Mgr', subLabel: 'Accessed', detail: 'GetSecretValue — 3 secrets retrieved', icon: AwsSecretsManager, severity: 'high' as Severity, riskScore: 85, mitreId: 'T1552', timestamp: '2026-01-15T14:22:00Z' } },
  { id: 'cloudtrail', type: 'attackPath', position: { x: 880, y: 60 }, data: { label: 'CloudTrail', subLabel: 'Monitoring', detail: 'Detected by wolfir', icon: AwsCloudTrail, severity: 'low' as Severity, mitreId: 'T1562', timestamp: '2026-01-15T14:23:00Z' } },
];

const DEMO_NODES_AI: Node[] = [
  { id: 'internet', type: 'attackPath', position: { x: 80, y: 180 }, data: { label: 'Internet', subLabel: 'External Origin', detail: 'Prompt injection or Shadow AI traffic', icon: Globe, severity: 'medium' as Severity, mitreId: 'T1190', timestamp: '2026-01-15T14:20:00Z' } },
  { id: 'gateway', type: 'attackPath', position: { x: 260, y: 180 }, data: { label: 'API Gateway', subLabel: 'Entry Point', detail: 'REST API — InvokeModel requests', icon: AmazonApiGateway, severity: 'medium' as Severity, mitreId: 'T1190', timestamp: '2026-01-15T14:20:15Z' } },
  { id: 'bedrock', type: 'attackPath', position: { x: 440, y: 180 }, data: { label: 'Amazon Bedrock', subLabel: 'AI/ML', detail: 'InvokeModel — LLM01 prompt injection risk', icon: Zap, severity: 'critical' as Severity, riskScore: 88, mitreId: 'AML.T0051', timestamp: '2026-01-15T14:20:45Z' } },
  { id: 'iam', type: 'attackPath', position: { x: 620, y: 180 }, data: { label: 'IAM Role', subLabel: 'Model Access', detail: 'Bedrock Agent assumes role — excessive agency (LLM06)', icon: AwsIdentityAndAccessManagement, severity: 'high' as Severity, riskScore: 75, mitreId: 'T1078', timestamp: '2026-01-15T14:21:15Z' } },
  { id: 's3', type: 'attackPath', position: { x: 800, y: 180 }, data: { label: 'S3 Bucket', subLabel: 'Data Target', detail: 'Exfiltration via inference (LLM02)', icon: AmazonSimpleStorageService, severity: 'high' as Severity, riskScore: 72, mitreId: 'T1530', timestamp: '2026-01-15T14:21:45Z' } },
  { id: 'cloudtrail', type: 'attackPath', position: { x: 980, y: 180 }, data: { label: 'CloudTrail', subLabel: 'Monitoring', detail: 'InvokeModel logged — Shadow AI detection', icon: AwsCloudTrail, severity: 'low' as Severity, mitreId: 'T1562', timestamp: '2026-01-15T14:22:00Z' } },
];

const EDGE_SEVERITY_COLORS: Record<Severity, string> = {
  critical: '#DC2626',
  high: '#EA580C',
  medium: '#2563eb',
  low: '#059669',
};

const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low'];
const maxSeverity = (a: Severity, b: Severity): Severity =>
  severityOrder.indexOf(a) <= severityOrder.indexOf(b) ? a : b;

const edgeStyle = (stroke: string) => ({ type: 'straight' as const, animated: true, style: { stroke, strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: stroke } });

const buildEdgesWithSeverity = (edges: Array<{ id: string; source: string; target: string }>, nodes: Node[]): Edge[] => {
  const nodeMap = new Map(nodes.map(n => [n.id, (n.data as NodeData).severity]));
  return edges.map(({ id, source, target }) => {
    const s = nodeMap.get(source) ?? 'medium';
    const t = nodeMap.get(target) ?? 'medium';
    const severity = maxSeverity(s, t);
    const stroke = EDGE_SEVERITY_COLORS[severity];
    return { id, source, target, ...edgeStyle(stroke) };
  });
};

const DEMO_EDGES_STANDARD_BASE = [
  { id: 'e1', source: 'internet', target: 'gateway' },
  { id: 'e2', source: 'gateway', target: 'vpc' },
  { id: 'e3', source: 'vpc', target: 'ec2' },
  { id: 'e4', source: 'ec2', target: 'iam' },
  { id: 'e5', source: 'iam', target: 'database' },
  { id: 'e6', source: 'vpc', target: 'sg' },
  { id: 'e7', source: 'sg', target: 'ssh' },
  { id: 'e8', source: 'ec2', target: 'ssh' },
  { id: 'e9', source: 'ssh', target: 'secrets' },
  { id: 'e10', source: 'iam', target: 'secrets' },
  { id: 'e11', source: 'iam', target: 'cloudtrail' },
];

const DEMO_EDGES_AI_BASE = [
  { id: 'e1', source: 'internet', target: 'gateway' },
  { id: 'e2', source: 'gateway', target: 'bedrock' },
  { id: 'e3', source: 'bedrock', target: 'iam' },
  { id: 'e4', source: 'iam', target: 's3' },
  { id: 'e5', source: 'iam', target: 'cloudtrail' },
];

const DEMO_EDGES_STANDARD: Edge[] = buildEdgesWithSeverity(DEMO_EDGES_STANDARD_BASE, DEMO_NODES_STANDARD);
const DEMO_EDGES_AI: Edge[] = buildEdgesWithSeverity(DEMO_EDGES_AI_BASE, DEMO_NODES_AI);

interface AttackPathReactFlowProps {
  variant?: 'standard' | 'ai';
  onNavigateToRemediation?: () => void;
}

function AttackPathReactFlowInner({ variant = 'standard', onNavigateToRemediation }: AttackPathReactFlowProps) {
  const { fitView, zoomIn, zoomOut, setCenter } = useReactFlow();
  const flowRef = useRef<HTMLDivElement>(null);
  const [nodes, , onNodesChange] = useNodesState(variant === 'ai' ? DEMO_NODES_AI : DEMO_NODES_STANDARD);
  const [edges, , onEdgesChange] = useEdgesState(variant === 'ai' ? DEMO_EDGES_AI : DEMO_EDGES_STANDARD);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(-1);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [replayPaused, setReplayPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const nodesList = variant === 'ai' ? DEMO_NODES_AI : DEMO_NODES_STANDARD;
  const edgesList = variant === 'ai' ? DEMO_EDGES_AI : DEMO_EDGES_STANDARD;
  const edgeLabels = variant === 'ai' ? EDGE_LABELS_AI : EDGE_LABELS_STANDARD;

  const replayOrder = useMemo(() => {
    return [...nodesList].sort((a, b) => {
      const ta = (a.data as NodeData).timestamp ?? '9999-12-31T23:59:59Z';
      const tb = (b.data as NodeData).timestamp ?? '9999-12-31T23:59:59Z';
      return ta.localeCompare(tb);
    });
  }, [nodesList]);
  const searchLower = searchQuery.toLowerCase().trim();
  const filteredNodes = searchLower ? nodesList.filter(n => (n.data as NodeData).label.toLowerCase().includes(searchLower) || (n.data as NodeData).subLabel.toLowerCase().includes(searchLower)) : nodesList;
  const hasSearchMatch = searchLower && filteredNodes.length > 0;

  const selectedNodeData = selectedNode ? (nodesList.find((n) => n.id === selectedNode)?.data as NodeData) : null;

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  }, []);

  const focusNode = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
    setSearchQuery('');
    const node = nodesList.find(n => n.id === nodeId);
    if (node) setCenter(node.position.x + 60, node.position.y + 40, { zoom: 1, duration: 300 });
  }, [nodesList, setCenter]);

  const exportPng = useCallback(async () => {
    const el = flowRef.current?.querySelector('.react-flow') as HTMLElement;
    if (!el) return;
    try {
      const canvas = await html2canvas(el, { backgroundColor: '#f1f5f9', scale: 2 });
      const a = document.createElement('a');
      a.download = `attack-path-${Date.now()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    } catch {
      const a = document.createElement('a');
      a.download = `attack-path-${Date.now()}.png`;
      a.href = 'data:text/plain,Export failed';
      a.click();
    }
  }, []);

  const exportSvg = useCallback(async () => {
    const svgEl = flowRef.current?.querySelector('.react-flow__edges')?.parentElement?.querySelector('svg');
    if (svgEl) {
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const a = document.createElement('a');
      a.download = `attack-path-${Date.now()}.svg`;
      a.href = URL.createObjectURL(blob);
      a.click();
      URL.revokeObjectURL(a.href);
    } else {
      exportPng();
    }
  }, [exportPng]);

  const toggleFullscreen = useCallback(async () => {
    const container = flowRef.current?.closest('.attack-path-flow-container');
    if (!container) return;
    try {
      if (!document.fullscreenElement) {
        await (container as HTMLElement).requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!replayMode || replayPaused || replayIndex >= replayOrder.length - 1) return;
    const delay = 1500 / replaySpeed;
    const id = setInterval(() => setReplayIndex(prev => Math.min(prev + 1, replayOrder.length - 1)), delay);
    return () => clearInterval(id);
  }, [replayMode, replayPaused, replayIndex, replayOrder.length, replaySpeed]);

  const visibleNodeIds = useMemo(() => {
    if (!replayMode || replayIndex < 0) return new Set(nodesList.map(n => n.id));
    return new Set(replayOrder.slice(0, replayIndex + 1).map(n => n.id));
  }, [replayMode, replayIndex, replayOrder, nodesList]);

  const visibleEdgeIds = useMemo(() => {
    if (!replayMode || replayIndex < 0) return new Set(edgesList.map(e => e.id));
    const visible = visibleNodeIds;
    return new Set(edgesList.filter(e => visible.has(e.source) && visible.has(e.target)).map(e => e.id));
  }, [replayMode, replayIndex, edgesList, visibleNodeIds]);

  const displayNodes = useMemo(() => {
    return nodes.map(n => ({
      ...n,
      hidden: !visibleNodeIds.has(n.id),
      className: hasSearchMatch && !filteredNodes.find(f => f.id === n.id) ? 'opacity-30' : '',
    }));
  }, [nodes, visibleNodeIds, hasSearchMatch, filteredNodes]);

  const displayEdges = useMemo(() => {
    return edges.map(e => ({
      ...e,
      hidden: !visibleEdgeIds.has(e.id),
    }));
  }, [edges, visibleEdgeIds]);

  const edgesWithLabels = useMemo(() => {
    return displayEdges.map(e => ({
      ...e,
      label: edgeLabels[e.id],
      labelStyle: { fill: '#334155', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
      labelBgBorderRadius: 4,
      labelBgPadding: [4, 8] as [number, number],
    }));
  }, [displayEdges, edgeLabels]);

  return (
    <div ref={flowRef} className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-card bg-white flex flex-col min-h-0 attack-path-flow-container">
      <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-indigo-50/30">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
            <IconAttackPath className="w-4.5 h-4.5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
              Attack Path Graph
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                  variant === 'ai'
                    ? 'bg-violet-50 text-violet-700 border-violet-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title={variant === 'ai' ? 'AI/LLM attack path (Bedrock, prompt injection)' : 'Standard compute attack path (EC2, crypto-mining)'}
              >
                {variant === 'ai' ? 'Showing AI attack path' : 'Showing standard attack path'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {variant === 'ai' ? 'Internet → API → Bedrock → IAM → S3' : 'Internet → VPC → EC2 → IAM → RDS'} · Node color = severity · click to inspect
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-36 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            {hasSearchMatch && (
              <div className="absolute top-full left-0 mt-1 py-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[140px]">
                {filteredNodes.slice(0, 5).map((n) => (
                  <button key={n.id} type="button" onClick={() => focusNode(n.id)} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">
                    {(n.data as NodeData).label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!replayMode ? (
            <button
              onClick={() => { setReplayMode(true); setReplayIndex(0); setReplayPaused(false); }}
              className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" /> Replay Attack
            </button>
          ) : null}
          <div className="flex gap-1">
            <button onClick={exportPng} className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1" title="Download PNG">
              <Download className="w-3 h-3" /> PNG
            </button>
            <button onClick={exportSvg} className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600" title="Download SVG">SVG</button>
          </div>
          <div className="hidden md:flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Legend:</span>
          <div className="flex gap-4" title="Node color = severity level">
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
          </div>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => zoomOut()} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm" title="Zoom out"><ZoomOut className="w-3.5 h-3.5 text-slate-600" /></button>
            <button onClick={() => fitView({ duration: 200 })} className="px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-white rounded-md" title="Fit view">Fit</button>
            <button onClick={() => zoomIn()} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm" title="Zoom in"><ZoomIn className="w-3.5 h-3.5 text-slate-600" /></button>
            <div className="w-px h-4 bg-slate-300 mx-0.5" />
            <button onClick={toggleFullscreen} className="p-1.5 rounded-md hover:bg-white hover:shadow-sm" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-slate-600" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-600" />}
            </button>
          </div>
        </div>
      </div>

      {replayMode && (
        <div className="px-6 py-3 border-b border-slate-200 bg-indigo-50/50 flex items-center gap-4 flex-wrap">
          <button onClick={() => setReplayPaused(p => !p)} className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-indigo-100 text-indigo-700 shadow-sm" title={replayPaused ? 'Play' : 'Pause'}>
            {replayPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <div className="flex gap-1">
            {[1, 2, 3].map((s) => (
              <button key={s} onClick={() => setReplaySpeed(s)} className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${replaySpeed === s ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-600'}`}>{s}x</button>
            ))}
          </div>
          <button onClick={() => { setReplayIndex(0); setReplayPaused(false); }} className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600" title="Reset"><RotateCcw className="w-4 h-4" /></button>
          <div className="flex-1 min-w-[120px]">
            <div className="text-[10px] font-semibold text-slate-600">
              {replayIndex >= 0 && replayIndex < replayOrder.length ? (replayOrder[replayIndex]?.data as NodeData)?.timestamp?.slice(0, 19).replace('T', ' ') : '—'}
            </div>
            <div className="h-1 mt-1 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all" style={{ width: replayOrder.length > 0 ? `${((replayIndex + 1) / replayOrder.length) * 100}%` : '0%' }} />
            </div>
          </div>
          <button onClick={() => { setReplayMode(false); setReplayIndex(-1); setReplayPaused(false); }} className="px-2 py-1 text-[10px] font-bold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600">Exit Replay</button>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_320px]">
        <div className="h-[420px] bg-slate-50/30 relative">
          <ReactFlow
            nodes={displayNodes}
            edges={edgesWithLabels}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="rounded-b-xl"
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#e2e8f0" gap={20} />
          </ReactFlow>
        </div>
        <div className="border-l border-slate-200 bg-slate-50/30 p-5 overflow-y-auto">
          {selectedNodeData ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 flex items-center justify-center" style={{ color: SEVERITY_COLORS[selectedNodeData.severity] ?? '#64748b' }}>
                  {(() => {
                    const Icon = selectedNodeData.icon;
                    const color = SEVERITY_COLORS[selectedNodeData.severity] ?? '#64748b';
                    return AWS_ICONS.has(Icon as any) ? <Icon size={32} color={color} /> : <Icon className="w-8 h-8" />;
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{selectedNodeData.label}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${
                      selectedNodeData.severity === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                      selectedNodeData.severity === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      selectedNodeData.severity === 'low' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>{selectedNodeData.severity.toUpperCase()}</span>
                    {selectedNodeData.riskScore != null && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-white border border-slate-700">{selectedNodeData.riskScore}/100</span>}
                    {selectedNodeData.mitreId && (
                      <a href={MITRE_MAP[selectedNodeData.mitreId]?.url ?? `https://attack.mitre.org/techniques/${selectedNodeData.mitreId}/`} target="_blank" rel="noopener noreferrer" className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono hover:bg-indigo-100">MITRE {selectedNodeData.mitreId}</a>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">{selectedNodeData.detail}</p>
                  {selectedNodeData.mitreId && (
                    <div className="mt-2 p-2 rounded-lg bg-slate-100 border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-700">{selectedNodeData.mitreId}{MITRE_MAP[selectedNodeData.mitreId] ? `: ${MITRE_MAP[selectedNodeData.mitreId].name}` : ''}</p>
                      {MITRE_MAP[selectedNodeData.mitreId] && <p className="text-[10px] text-slate-600 mt-0.5">{MITRE_MAP[selectedNodeData.mitreId].desc}</p>}
                      <a href={MITRE_MAP[selectedNodeData.mitreId]?.url ?? `https://attack.mitre.org/techniques/${selectedNodeData.mitreId}/`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-600 hover:underline mt-1 inline-block">Learn more on MITRE ATT&CK →</a>
                    </div>
                  )}
                  {onNavigateToRemediation && (selectedNodeData.severity === 'critical' || selectedNodeData.severity === 'high') && (
                    <button onClick={onNavigateToRemediation} className="mt-2 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">View Remediation →</button>
                  )}
                  {(selectedNode === 'iam' || selectedNode === 'secrets' || selectedNodeData.label.toLowerCase().includes('iam') || selectedNodeData.label.toLowerCase().includes('secrets')) && (
                    <a href="https://aegis-iam.vercel.app/" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300">
                      <Shield className="w-3.5 h-3.5" /> Analyze with Aegis IAM →
                    </a>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Click a node to see details, MITRE technique, and remediation.</p>
          )}
        </div>
      </div>
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-600">
        <strong>Tip:</strong> Drag nodes to rearrange. Arrows show data flow and potential attack paths.
      </div>
    </div>
  );
}

const AttackPathReactFlow: React.FC<AttackPathReactFlowProps> = (props) => (
  <ReactFlowProvider>
    <AttackPathReactFlowInner {...props} />
  </ReactFlowProvider>
);

export default AttackPathReactFlow;
