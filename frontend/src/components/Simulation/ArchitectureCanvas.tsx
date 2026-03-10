/**
 * Architecture Canvas — Premium AWS attack path visualization for Live Simulation
 * SVG-based graph with animated threat flow, MITRE labels, official AWS icons
 */
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AmazonSimpleStorageService,
  AwsCloudTrail,
  AwsIdentityAndAccessManagement,
  AwsShield,
  AmazonEc2,
  AmazonCloudFront,
} from '@nxavis/aws-icons';

interface ArchitectureCanvasProps {
  scenarioId: string;
  attackerPosition: 'internet' | 'iam' | 'iam2' | 'iam3' | 'ec2' | 's3' | 'contained' | null;
  compromisedResources: Set<string>;
  remediationStep: number;
}

// Node definition: id, x, y, label, icon key, mitreId
interface NodeDef {
  id: string;
  x: number;
  y: number;
  label: string;
  subLabel?: string;
  icon: 'internet' | 'iam' | 'ec2' | 's3' | 'sg' | 'cloudtrail';
  mitreId?: string;
}

// Edge: from, to
interface EdgeDef {
  from: string;
  to: string;
  label?: string;
}

const SVG_WIDTH = 800;
const SVG_HEIGHT = 380;

// Spaced layout — more room between nodes for edge labels
const LAYOUTS: Record<string, { nodes: NodeDef[]; edges: EdgeDef[] }> = {
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

// Map attacker position to node id
function attackerPosToNodeId(pos: string | null, scenarioId: string): string | null {
  if (!pos || pos === 'contained') return null;
  if (scenarioId === 'crypto-mining') {
    if (pos === 'internet') return 'internet';
    if (pos === 'iam') return 'iam';
    if (pos === 'ec2') return 'ec2';
    return 'iam';
  }
  if (scenarioId === 'data-exfiltration' || scenarioId === 'unauthorized-access') {
    if (pos === 'internet') return 'internet';
    if (pos === 's3') return 's3';
    return 'iam';
  }
  if (scenarioId === 'privilege-escalation') return pos; // iam, iam2, iam3 map directly
  return 'internet';
}

// Bezier midpoint and perpendicular offset for label placement
function bezierMid(t: number, from: { x: number; y: number }, to: { x: number; y: number }, cpx: number, cpy: number) {
  const x = (1 - t) ** 2 * from.x + 2 * (1 - t) * t * cpx + t ** 2 * to.x;
  const y = (1 - t) ** 2 * from.y + 2 * (1 - t) * t * cpy + t ** 2 * to.y;
  return { x, y };
}
function bezierTangent(t: number, from: { x: number; y: number }, to: { x: number; y: number }, cpx: number, cpy: number) {
  const dx = 2 * (1 - t) * (cpx - from.x) + 2 * t * (to.x - cpx);
  const dy = 2 * (1 - t) * (cpy - from.y) + 2 * t * (to.y - cpy);
  const len = Math.hypot(dx, dy) || 1;
  return { dx: dx / len, dy: dy / len };
}

// Official AWS Architecture Icons (from @nxavis/aws-icons)
const AWS_ICONS: Record<string, React.ComponentType<Record<string, unknown>>> = {
  internet: AmazonCloudFront,
  iam: AwsIdentityAndAccessManagement,
  ec2: AmazonEc2,
  s3: AmazonSimpleStorageService,
  sg: AwsShield,
  cloudtrail: AwsCloudTrail,
};

const AWS_ORANGE = '#FF9900';

// MITRE ATT&CK technique descriptions for node hover
const MITRE_MAP: Record<string, { name: string; desc: string }> = {
  T1078: { name: 'Valid Accounts', desc: 'Adversary uses stolen credentials to access resources. Bypasses detection.' },
  T1098: { name: 'Account Manipulation', desc: 'Modifies account permissions to maintain access or escalate privileges.' },
  T1190: { name: 'Exploit Public-Facing Application', desc: 'Initial access via vulnerable web app, API, or service exposed to internet.' },
  T1021: { name: 'Remote Services', desc: 'Access via SSH, RDP. Common for lateral movement.' },
  T1552: { name: 'Unsecured Credentials', desc: 'Accessing stored credentials. Enables privilege escalation.' },
  T1562: { name: 'Impair Defenses', desc: 'Disables or evades security tools. Reduces visibility.' },
  T1578: { name: 'Modify Cloud Compute', desc: 'Creates or modifies cloud compute for malicious workloads.' },
  T1136: { name: 'Create Account', desc: 'Creates new accounts to establish persistence.' },
  T1530: { name: 'Data from Cloud Storage', desc: 'Accesses cloud storage (S3) for exfiltration.' },
};

export const ArchitectureCanvas: React.FC<ArchitectureCanvasProps> = ({
  scenarioId,
  attackerPosition,
  compromisedResources,
  remediationStep,
}) => {
  const [hoveredNode, setHoveredNode] = useState<NodeDef | null>(null);
  const layout = LAYOUTS[scenarioId] || LAYOUTS['crypto-mining'];
  const { nodes, edges } = layout;
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const attackerNodeId = attackerPosToNodeId(attackerPosition, scenarioId);
  const attackerNode = attackerNodeId ? nodeMap.get(attackerNodeId) : null;

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

  return (
    <div className="relative w-full h-full min-h-[320px] flex items-center justify-center p-4">
      {/* VPC boundary */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-[22%] top-[8%] bottom-[8%] w-[55%] rounded-2xl border-2 border-dashed border-indigo-500/30 bg-indigo-950/10" />
        <span className="absolute left-[24%] top-[6%] px-2 py-0.5 text-[9px] font-bold text-indigo-400/80 uppercase tracking-widest bg-slate-950 rounded">
          AWS Account
        </span>
      </div>

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="relative z-10 max-h-[320px]"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="glow-red-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feFlood floodColor="#f87171" floodOpacity="0.2" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-emerald" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feFlood floodColor="#34d399" floodOpacity="0.25" />
            <feComposite in2="blur" operator="in" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="threatGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fb923c" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f87171" stopOpacity="0.8" />
          </linearGradient>
          <marker id="arrow-red" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#f87171" opacity="0.9" />
          </marker>
        </defs>

        {/* Edges with animated flow */}
        {edges.map((edge, i) => {
          const from = nodeMap.get(edge.from);
          const to = nodeMap.get(edge.to);
          if (!from || !to) return null;
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const curve = Math.min(80, Math.abs(dx) * 0.3);
          const cpx = (from.x + to.x) / 2 + (Math.abs(dy) > 80 ? 0 : (dy > 0 ? curve : -curve));
          const cpy = (from.y + to.y) / 2 + (Math.abs(dy) <= 80 ? 0 : (dx > 0 ? curve * 0.6 : -curve * 0.6));
          const pathD = `M ${from.x} ${from.y} Q ${cpx} ${cpy} ${to.x} ${to.y}`;
          const mid = bezierMid(0.5, from, to, cpx, cpy);
          const isAttackPath = attackerNodeId && (edge.from === attackerNodeId || edge.to === attackerNodeId);

          return (
            <g key={`edge-${i}`}>
              {/* Base line */}
              <path
                d={pathD}
                stroke="#475569"
                strokeWidth="2"
                fill="none"
                opacity="0.25"
                strokeDasharray="8 6"
              />
              {/* Animated flow line */}
              <path
                d={pathD}
                stroke={isAttackPath ? "url(#threatGradient)" : "#64748b"}
                strokeWidth={isAttackPath ? 2.5 : 1.5}
                fill="none"
                strokeDasharray="12 8"
                strokeLinecap="round"
                markerEnd={isAttackPath ? "url(#arrow-red)" : undefined}
                opacity={isAttackPath ? 0.9 : 0.5}
                style={{
                  animation: 'dash-flow 2s linear infinite',
                  strokeDashoffset: 0,
                }}
              />
              {/* Edge label — offset from path, high contrast, readable */}
              {edge.label && (() => {
                const tangent = bezierTangent(0.5, from, to, cpx, cpy);
                const offset = 38;
                const labelX = mid.x + (-tangent.dy * offset);
                const labelY = mid.y + (tangent.dx * offset);
                const w = Math.max(edge.label.length * 5.2, 52);
                const h = 20;
                return (
                  <g transform={`translate(${labelX}, ${labelY})`}>
                    <rect
                      x={-w / 2}
                      y={-h / 2}
                      width={w}
                      height={h}
                      rx={10}
                      fill="rgba(30,41,59,0.97)"
                      stroke={isAttackPath ? "rgba(251,146,60,0.5)" : "rgba(148,163,184,0.4)"}
                      strokeWidth="1"
                    />
                    <text
                      x={0}
                      y={0}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isAttackPath ? "#fb923c" : "#cbd5e1"}
                      fontSize="10"
                      fontWeight="600"
                      fontFamily="Inter, system-ui, sans-serif"
                    >
                      {edge.label}
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const AwsIcon = AWS_ICONS[node.icon];
          const compromised = isCompromised(node.id);
          const remediated = isRemediated(node.id);
          const isAttackerHere = attackerNode?.id === node.id;

          return (
            <motion.g
              key={node.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: nodes.indexOf(node) * 0.08 }}
              onMouseEnter={() => setHoveredNode(node)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: node.mitreId ? 'pointer' : 'default' }}
            >
              {/* Subtle indicator when compromised — refined, not cluttered */}
              {compromised && !remediated && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={46}
                  fill="none"
                  stroke="rgba(251,146,60,0.25)"
                  strokeWidth="1"
                  filter="url(#glow-red-soft)"
                />
              )}
              {remediated && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={44}
                  fill="none"
                  stroke="rgba(52,211,153,0.3)"
                  strokeWidth="1"
                  filter="url(#glow-emerald)"
                />
              )}

              {/* Node body */}
              <rect
                x={node.x - 44}
                y={node.y - 36}
                width={88}
                height={72}
                rx={10}
                fill={compromised && !remediated ? 'rgba(30,41,59,0.95)' : remediated ? 'rgba(6,95,70,0.25)' : 'rgba(30,41,59,0.9)'}
                stroke={compromised && !remediated ? 'rgba(251,146,60,0.6)' : remediated ? 'rgba(52,211,153,0.5)' : '#475569'}
                strokeWidth={isAttackerHere ? 2 : 1.5}
              />

              {/* AWS Architecture Icon */}
              {AwsIcon && (
                <foreignObject x={node.x - 24} y={node.y - 34} width="48" height="36">
                  <div className="flex items-center justify-center w-full h-full" style={{ color: AWS_ORANGE }}>
                    <AwsIcon size={28} color={AWS_ORANGE} />
                  </div>
                </foreignObject>
              )}

              {/* Label */}
              <text
                x={node.x}
                y={node.y + 8}
                textAnchor="middle"
                fill="white"
                fontSize="11"
                fontWeight="700"
                fontFamily="system-ui, sans-serif"
              >
                {node.label}
              </text>
              {node.subLabel && (
                <text
                  x={node.x}
                  y={node.y + 22}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9"
                  fontWeight="500"
                  fontFamily="monospace"
                >
                  {node.subLabel.length > 18 ? node.subLabel.slice(0, 16) + '…' : node.subLabel}
                </text>
              )}
              {node.mitreId && (
                <text
                  x={node.x}
                  y={node.y + 32}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="8"
                  fontWeight="600"
                  fontFamily="monospace"
                >
                  {node.mitreId}
                </text>
              )}

              {/* Remediated checkmark */}
              {remediated && (
                <g transform={`translate(${node.x + 30}, ${node.y - 26})`}>
                  <circle r="8" fill="#10b981" />
                  <path d="M-2.5 0 L0 2.5 L3.5 -2" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              )}
            </motion.g>
          );
        })}

        {/* Attacker indicator — refined badge, not childish */}
        {attackerNode && attackerPosition !== 'contained' && (
          <motion.g
            initial={false}
            animate={{ opacity: 1 }}
            className="pointer-events-none"
          >
            <rect
              x={attackerNode.x - 28}
              y={attackerNode.y - 50}
              width={56}
              height={18}
              rx={9}
              fill="rgba(30,41,59,0.9)"
              stroke="rgba(251,146,60,0.5)"
              strokeWidth="1"
            />
            <text
              x={attackerNode.x}
              y={attackerNode.y - 40}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#fb923c"
              fontSize="9"
              fontWeight="600"
              fontFamily="system-ui, sans-serif"
              letterSpacing="0.05em"
            >
              THREAT
            </text>
          </motion.g>
        )}
      </svg>

      {/* MITRE ATT&CK tooltip — appears when hovering a node */}
      {hoveredNode?.mitreId && MITRE_MAP[hoveredNode.mitreId] && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-slate-800/95 border border-slate-600/60 shadow-xl max-w-[320px]">
          <p className="text-[10px] font-bold text-amber-400 font-mono">{hoveredNode.mitreId}</p>
          <p className="text-xs font-semibold text-white mt-0.5">{MITRE_MAP[hoveredNode.mitreId].name}</p>
          <p className="text-[10px] text-slate-400 mt-1">{MITRE_MAP[hoveredNode.mitreId].desc}</p>
          <a
            href={`https://attack.mitre.org/techniques/${hoveredNode.mitreId}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-indigo-400 hover:text-indigo-300 mt-1.5 inline-block"
          >
            Learn more on MITRE ATT&CK →
          </a>
        </div>
      )}

      {/* CSS for dash animation */}
      <style>{`
        @keyframes dash-flow {
          to { stroke-dashoffset: -20; }
        }
      `}</style>
    </div>
  );
};
