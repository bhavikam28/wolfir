/**
 * Attack Path Diagram - Dashboard Analysis View
 * Light background, clean professional graph
 * Wiz.io/Orca-inspired enterprise security graph
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield, AlertTriangle, Key, Globe, Network,
  Wifi, Server, User, Database
} from 'lucide-react';

interface NodeDef {
  id: string;
  x: number;
  y: number;
  icon: any;
  label: string;
  subLabel: string;
  color: string;
  bg: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface EdgeDef {
  from: string;
  to: string;
  color: string;
  delay: number;
}

const NODES: NodeDef[] = [
  { id: 'internet', x: 80, y: 200, icon: Globe, label: 'Internet', subLabel: 'External Origin', color: '#7C3AED', bg: '#F5F3FF', severity: 'high' },
  { id: 'gateway', x: 240, y: 200, icon: Network, label: 'API Gateway', subLabel: 'Entry Point', color: '#6366F1', bg: '#EEF2FF', severity: 'high' },
  { id: 'vpc', x: 400, y: 200, icon: Wifi, label: 'VPC', subLabel: 'Network Layer', color: '#3B82F6', bg: '#EFF6FF', severity: 'medium' },
  { id: 'ec2', x: 560, y: 200, icon: Server, label: 'EC2 Instance', subLabel: 'Compromised', color: '#EF4444', bg: '#FEF2F2', severity: 'critical' },
  { id: 'iam', x: 720, y: 200, icon: User, label: 'IAM Role', subLabel: 'Escalated', color: '#EF4444', bg: '#FEF2F2', severity: 'critical' },
  { id: 'database', x: 880, y: 200, icon: Database, label: 'RDS Database', subLabel: 'Data Target', color: '#F97316', bg: '#FFF7ED', severity: 'high' },
  { id: 'sg', x: 320, y: 80, icon: Shield, label: 'Security Group', subLabel: 'Misconfigured', color: '#EF4444', bg: '#FEF2F2', severity: 'critical' },
  { id: 'ssh', x: 560, y: 80, icon: AlertTriangle, label: 'SSH Exposed', subLabel: 'Port 22 Open', color: '#DC2626', bg: '#FEF2F2', severity: 'critical' },
  { id: 'secrets', x: 760, y: 80, icon: Key, label: 'Secrets Mgr', subLabel: 'Accessed', color: '#F97316', bg: '#FFF7ED', severity: 'high' },
];

const EDGES: EdgeDef[] = [
  { from: 'internet', to: 'gateway', color: '#7C3AED', delay: 0.3 },
  { from: 'gateway', to: 'vpc', color: '#6366F1', delay: 0.5 },
  { from: 'vpc', to: 'ec2', color: '#EF4444', delay: 0.7 },
  { from: 'ec2', to: 'iam', color: '#EF4444', delay: 0.9 },
  { from: 'iam', to: 'database', color: '#F97316', delay: 1.1 },
  { from: 'vpc', to: 'sg', color: '#EF4444', delay: 1.3 },
  { from: 'sg', to: 'ssh', color: '#DC2626', delay: 1.5 },
  { from: 'ec2', to: 'ssh', color: '#EF4444', delay: 1.6 },
  { from: 'ssh', to: 'secrets', color: '#F97316', delay: 1.7 },
  { from: 'iam', to: 'secrets', color: '#F97316', delay: 1.8 },
];

const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));

const AttackPathDiagram: React.FC = () => {
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-card bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 className="text-base font-bold text-slate-900">Attack Path Graph</h2>
          <p className="text-xs text-slate-500 mt-0.5">Interactive security graph — threat flow analysis</p>
        </div>
        <div className="flex gap-4">
          {[
            { color: 'bg-red-500', label: 'Critical' },
            { color: 'bg-orange-500', label: 'High' },
            { color: 'bg-blue-500', label: 'Medium' },
            { color: 'bg-violet-500', label: 'Entry' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
              <span className="text-[10px] font-semibold text-slate-500">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Graph - Light Background */}
      <div className="relative overflow-x-auto py-4">
        {/* Subtle dot grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #e2e8f0 0.8px, transparent 0.8px)',
          backgroundSize: '24px 24px',
        }} />
        
        <svg width="960" height="310" viewBox="0 0 960 310" className="w-full relative z-10" preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* Arrow markers */}
            {EDGES.map((edge, i) => (
              <marker key={`m-${i}`} id={`arrow-${i}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill={edge.color} opacity="0.7" />
              </marker>
            ))}
            {/* Drop shadow */}
            <filter id="dash-node-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.08" />
            </filter>
          </defs>

          {/* ===== EDGES ===== */}
          {EDGES.map((edge, i) => {
            const from = nodeMap[edge.from];
            const to = nodeMap[edge.to];
            if (!from || !to) return null;

            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const mx = (from.x + to.x) / 2;
            const my = (from.y + to.y) / 2;
            const curveOffset = Math.abs(dy) > 50 ? 0 : (dx > 0 ? -15 : 15);
            const pathD = `M ${from.x} ${from.y} Q ${mx} ${my + curveOffset} ${to.x} ${to.y}`;

            return (
              <g key={`edge-${i}`}>
                {/* Shadow */}
                <motion.path
                  d={pathD} stroke={edge.color} strokeWidth="3" fill="none" opacity="0.06"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: edge.delay, duration: 0.8 }}
                />
                {/* Dashed line */}
                <motion.path
                  d={pathD} stroke={edge.color} strokeWidth="1.5" fill="none" opacity="0.4"
                  strokeDasharray="6 4"
                  markerEnd={`url(#arrow-${i})`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.4 }}
                  transition={{ delay: edge.delay, duration: 0.8 }}
                />
                {/* Flowing particle */}
                <motion.circle
                  r="3" fill={edge.color}
                  animate={{
                    opacity: [0, 0.8, 0.8, 0],
                    cx: [from.x, mx, to.x],
                    cy: [from.y, my + curveOffset, to.y],
                  }}
                  transition={{ delay: edge.delay + 0.8, duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1 }}
                />
              </g>
            );
          })}

          {/* ===== NODES ===== */}
          {NODES.map((node, i) => {
            const Icon = node.icon;

            return (
              <motion.g
                key={node.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.4, type: 'spring', stiffness: 200 }}
                className="cursor-pointer"
              >
                {/* Pulse ring for critical */}
                {node.severity === 'critical' && (
                  <motion.circle
                    cx={node.x} cy={node.y} r="30"
                    fill="none" stroke={node.color} strokeWidth="1"
                    animate={{ opacity: [0.08, 0.2, 0.08], r: [28, 33, 28] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}

                {/* Node circle */}
                <circle cx={node.x} cy={node.y} r="22" fill={node.bg} stroke={node.color} strokeWidth="2" filter="url(#dash-node-shadow)" />

                {/* Icon */}
                <foreignObject x={node.x - 11} y={node.y - 11} width="22" height="22">
                  <div className="flex items-center justify-center h-full w-full">
                    <Icon className="w-5 h-5" strokeWidth={1.8} style={{ color: node.color }} />
                  </div>
                </foreignObject>

                {/* Label */}
                <text x={node.x} y={node.y + 36} textAnchor="middle" fill="#334155" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">
                  {node.label}
                </text>
                <text x={node.x} y={node.y + 50} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="500" fontFamily="Inter, sans-serif">
                  {node.subLabel}
                </text>
              </motion.g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export default AttackPathDiagram;
