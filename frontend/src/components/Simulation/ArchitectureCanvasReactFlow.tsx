/**
 * Architecture Canvas — React Flow version for Live Simulation
 * Same layout and states as SVG version; consistent with Attack Path diagram
 */
import React, { useMemo } from 'react';
import ReactFlow, {
  Background,
  Node,
  Edge,
  NodeTypes,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  AmazonSimpleStorageService,
  AwsCloudTrail,
  AwsIdentityAndAccessManagement,
  AwsShield,
  AmazonEc2,
  AmazonCloudFront,
} from '@nxavis/aws-icons';

interface ArchitectureCanvasReactFlowProps {
  scenarioId: string;
  attackerPosition: 'internet' | 'iam' | 'iam2' | 'iam3' | 'ec2' | 's3' | 'contained' | null;
  compromisedResources: Set<string>;
  remediationStep: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AWS_ICONS: Record<string, React.ComponentType<any>> = {
  internet: AmazonCloudFront,
  iam: AwsIdentityAndAccessManagement,
  ec2: AmazonEc2,
  s3: AmazonSimpleStorageService,
  sg: AwsShield,
  cloudtrail: AwsCloudTrail,
};

const AWS_ORANGE = '#FF9900';

const LAYOUTS: Record<string, { nodes: Array<{ id: string; x: number; y: number; label: string; subLabel?: string; icon: string; mitreId?: string }>; edges: Array<{ from: string; to: string; label?: string }> }> = {
  'crypto-mining': {
    nodes: [
      { id: 'internet', x: 90, y: 190, label: 'Internet', subLabel: 'External', icon: 'internet', mitreId: 'T1190' },
      { id: 'iam', x: 240, y: 190, label: 'IAM', subLabel: 'contractor-temp', icon: 'iam', mitreId: 'T1078' },
      { id: 'sg', x: 420, y: 100, label: 'Security Group', subLabel: 'sg-abc123', icon: 'sg', mitreId: 'T1021' },
      { id: 'ec2', x: 420, y: 280, label: 'EC2', subLabel: '3 GPU instances', icon: 'ec2', mitreId: 'T1578' },
      { id: 'cloudtrail', x: 700, y: 190, label: 'CloudTrail', subLabel: 'GuardDuty', icon: 'cloudtrail', mitreId: 'T1562' },
    ],
    edges: [
      { from: 'internet', to: 'iam', label: 'AssumeRole' },
      { from: 'iam', to: 'sg', label: 'AuthorizeSG' },
      { from: 'iam', to: 'ec2', label: 'RunInstances' },
      { from: 'sg', to: 'cloudtrail', label: 'Logged' },
      { from: 'ec2', to: 'cloudtrail', label: 'Logged' },
    ],
  },
  'data-exfiltration': {
    nodes: [
      { id: 'internet', x: 100, y: 190, label: 'Internet', subLabel: 'External', icon: 'internet', mitreId: 'T1190' },
      { id: 'iam', x: 280, y: 190, label: 'IAM', subLabel: 'data-analyst', icon: 'iam', mitreId: 'T1078' },
      { id: 's3', x: 460, y: 190, label: 'S3', subLabel: 'company-sensitive-data', icon: 's3', mitreId: 'T1530' },
      { id: 'cloudtrail', x: 700, y: 190, label: 'CloudTrail', subLabel: 'Monitoring', icon: 'cloudtrail', mitreId: 'T1562' },
    ],
    edges: [
      { from: 'internet', to: 'iam', label: 'Access' },
      { from: 'iam', to: 's3', label: 'GetObject' },
      { from: 's3', to: 'cloudtrail', label: 'Logged' },
    ],
  },
  'privilege-escalation': {
    nodes: [
      { id: 'iam', x: 150, y: 120, label: 'IAM User', subLabel: 'junior-dev', icon: 'iam', mitreId: 'T1078' },
      { id: 'iam2', x: 320, y: 170, label: 'AdminRole', subLabel: 'AssumeRole', icon: 'iam', mitreId: 'T1098' },
      { id: 'iam3', x: 320, y: 260, label: 'backdoor-admin', subLabel: 'CreateUser', icon: 'iam', mitreId: 'T1136' },
      { id: 'cloudtrail', x: 570, y: 170, label: 'CloudTrail', subLabel: 'Monitoring', icon: 'cloudtrail', mitreId: 'T1562' },
    ],
    edges: [
      { from: 'iam', to: 'iam2', label: 'AssumeRole' },
      { from: 'iam2', to: 'iam3', label: 'CreateUser' },
      { from: 'iam3', to: 'cloudtrail', label: 'Logged' },
    ],
  },
  'unauthorized-access': {
    nodes: [
      { id: 'internet', x: 100, y: 190, label: 'Internet', subLabel: '198.51.100.100', icon: 'internet', mitreId: 'T1190' },
      { id: 'iam', x: 300, y: 190, label: 'IAM', subLabel: 'external-user', icon: 'iam', mitreId: 'T1078' },
      { id: 's3', x: 500, y: 190, label: 'S3', subLabel: 'company-secrets', icon: 's3', mitreId: 'T1552' },
      { id: 'cloudtrail', x: 700, y: 190, label: 'CloudTrail', subLabel: 'Monitoring', icon: 'cloudtrail', mitreId: 'T1562' },
    ],
    edges: [
      { from: 'internet', to: 'iam', label: 'AssumeRole' },
      { from: 'iam', to: 's3', label: 'GetObject' },
      { from: 's3', to: 'cloudtrail', label: 'Logged' },
    ],
  },
};

function attackerPosToNodeId(pos: string | null, scenarioId: string): string | null {
  if (!pos || pos === 'contained') return null;
  if (scenarioId === 'crypto-mining') return pos === 'internet' ? 'internet' : pos === 'ec2' ? 'ec2' : 'iam';
  if (scenarioId === 'data-exfiltration' || scenarioId === 'unauthorized-access') return pos === 'internet' ? 'internet' : pos === 's3' ? 's3' : 'iam';
  if (scenarioId === 'privilege-escalation') return pos;
  return 'internet';
}

function SimNode({ data }: { data: { label: string; subLabel?: string; icon: string; mitreId?: string; compromised?: boolean; remediated?: boolean; isAttacker?: boolean } }) {
  const Icon = AWS_ICONS[data.icon];
  const compromised = data.compromised && !data.remediated;
  const remediated = data.remediated;
  const bg = compromised ? 'rgba(30,41,59,0.95)' : remediated ? 'rgba(6,95,70,0.25)' : 'rgba(30,41,59,0.9)';
  const border = compromised ? 'rgba(251,146,60,0.6)' : remediated ? 'rgba(52,211,153,0.5)' : '#475569';

  return (
    <div className="relative w-[88px] min-h-[72px] rounded-xl flex flex-col items-center justify-center px-2 py-2" style={{ backgroundColor: bg, border: `1.5px solid ${border}` }}>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !border-2 !bg-white !top-1/2 !-translate-y-1/2" style={{ left: -14 }} />
      <div className="relative w-10 h-10 flex items-center justify-center">
        {Icon && <Icon size={28} color={AWS_ORANGE} />}
      </div>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !border-2 !bg-white !top-1/2 !-translate-y-1/2" style={{ right: -14, left: 'auto' }} />
      <span className="text-[11px] font-bold text-white text-center leading-tight mt-0.5">{data.label}</span>
      {data.subLabel && <span className="text-[9px] text-slate-400 text-center font-mono">{data.subLabel.length > 18 ? data.subLabel.slice(0, 16) + '…' : data.subLabel}</span>}
      {data.mitreId && <span className="text-[8px] text-slate-500 font-mono">{data.mitreId}</span>}
      {data.isAttacker && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md text-[9px] font-semibold bg-slate-800/90 border border-amber-500/50 text-amber-400">THREAT</div>
      )}
      {remediated && (
        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        </div>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = { sim: SimNode };

export const ArchitectureCanvasReactFlow: React.FC<ArchitectureCanvasReactFlowProps> = ({
  scenarioId,
  attackerPosition,
  compromisedResources,
  remediationStep,
}) => {
  const layout = LAYOUTS[scenarioId] || LAYOUTS['crypto-mining'];
  const attackerNodeId = attackerPosToNodeId(attackerPosition, scenarioId);

  const isCompromised = (nodeId: string) => {
    if (remediationStep >= 3) return false;
    if (nodeId === 'iam') return compromisedResources.has('iam');
    if (nodeId === 'iam2' || nodeId === 'iam3') return compromisedResources.has('iam2') || compromisedResources.has('iam3');
    if (nodeId === 'ec2') return compromisedResources.has('ec2');
    if (nodeId === 'sg') return compromisedResources.has('sg');
    if (nodeId === 's3') return compromisedResources.has('s3');
    return false;
  };

  const isRemediated = (nodeId: string) => {
    if (nodeId === 'iam' || nodeId === 'iam2' || nodeId === 'iam3') return remediationStep >= 2;
    if (nodeId === 'ec2') return remediationStep >= 3;
    if (nodeId === 'sg') return remediationStep >= 4;
    if (nodeId === 's3') return remediationStep >= 2;
    return false;
  };

  const nodes: Node[] = useMemo(() =>
    layout.nodes.map((n) => ({
      id: n.id,
      type: 'sim',
      position: { x: n.x - 44, y: n.y - 36 },
      data: {
        label: n.label,
        subLabel: n.subLabel,
        icon: n.icon,
        mitreId: n.mitreId,
        compromised: isCompromised(n.id),
        remediated: isRemediated(n.id),
        isAttacker: attackerNodeId === n.id,
      },
    })),
  [layout.nodes, compromisedResources, remediationStep, attackerNodeId]);

  const edges: Edge[] = useMemo(() =>
    layout.edges.map((e, i) => ({
      id: `e${i}`,
      source: e.from,
      target: e.to,
      type: 'straight',
      label: e.label,
      labelStyle: { fill: '#cbd5e1', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: 'rgba(30,41,59,0.97)' },
      labelBgBorderRadius: 4,
      labelBgPadding: [4, 8] as [number, number],
      animated: !!(attackerNodeId && (e.from === attackerNodeId || e.to === attackerNodeId)),
      style: { stroke: attackerNodeId && (e.from === attackerNodeId || e.to === attackerNodeId) ? '#fb923c' : '#64748b', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: attackerNodeId && (e.from === attackerNodeId || e.to === attackerNodeId) ? '#fb923c' : '#64748b' },
    })),
  [layout.edges, attackerNodeId]);

  return (
    <div className="relative w-full h-full min-h-[320px]">
      <div className="absolute left-[22%] top-[8%] bottom-[8%] w-[55%] rounded-2xl border-2 border-dashed border-indigo-500/30 bg-indigo-950/10 pointer-events-none" />
      <span className="absolute left-[24%] top-[6%] px-2 py-0.5 text-[9px] font-bold text-indigo-400/80 uppercase tracking-widest bg-slate-950 rounded pointer-events-none z-10">AWS Account</span>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        className="!bg-transparent"
      >
        <Background color="#334155" gap={16} className="opacity-20" />
      </ReactFlow>
    </div>
  );
};
