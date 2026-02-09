/**
 * Attack Path Diagram - Dashboard Analysis View
 * Premium enterprise security graph with detailed threat flow
 * Includes zoom in/out controls for detailed exploration
 * Inspired by Wiz.io, CrowdStrike, Orca Security
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, AlertTriangle, Key, Globe, Network,
  Wifi, Server, User, Database, Eye,
  ZoomIn, ZoomOut, Maximize2
} from 'lucide-react';

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
}

interface EdgeDef {
  from: string;
  to: string;
  color: string;
  label?: string;
  delay: number;
}

const NODES: NodeDef[] = [
  { id: 'internet', x: 80, y: 200, icon: Globe, label: 'Internet', subLabel: 'External Origin', detail: 'Suspicious IP: 203.0.113.42 (TOR exit node)', color: '#7C3AED', bg: '#F5F3FF', severity: 'medium' },
  { id: 'gateway', x: 240, y: 200, icon: Network, label: 'API Gateway', subLabel: 'Entry Point', detail: 'REST API — 847 requests in 2 minutes', color: '#6366F1', bg: '#EEF2FF', severity: 'medium' },
  { id: 'vpc', x: 400, y: 200, icon: Wifi, label: 'VPC', subLabel: 'Network Layer', detail: 'vpc-0a1b2c3d — us-east-1', color: '#3B82F6', bg: '#EFF6FF', severity: 'medium' },
  { id: 'ec2', x: 560, y: 200, icon: Server, label: 'EC2 Instance', subLabel: 'Compromised', detail: 'i-0abc123 — unauthorized access detected', color: '#EF4444', bg: '#FEF2F2', severity: 'critical', ring: true },
  { id: 'iam', x: 720, y: 200, icon: User, label: 'IAM Role', subLabel: 'Escalated', detail: 'arn:aws:iam::role/admin-temp — privilege escalation', color: '#EF4444', bg: '#FEF2F2', severity: 'critical', ring: true },
  { id: 'database', x: 880, y: 200, icon: Database, label: 'RDS Database', subLabel: 'Data Target', detail: 'db-prod-main — 2.4GB data accessed', color: '#F97316', bg: '#FFF7ED', severity: 'high' },
  { id: 'sg', x: 280, y: 80, icon: Shield, label: 'Security Group', subLabel: 'Misconfigured', detail: 'sg-0xyz — 0.0.0.0/0 on port 22 (OPEN)', color: '#EF4444', bg: '#FEF2F2', severity: 'critical', ring: true },
  { id: 'ssh', x: 500, y: 80, icon: AlertTriangle, label: 'SSH Exposed', subLabel: 'Port 22 Open', detail: '14 failed login attempts before breach', color: '#DC2626', bg: '#FEF2F2', severity: 'critical', ring: true },
  { id: 'secrets', x: 720, y: 80, icon: Key, label: 'Secrets Mgr', subLabel: 'Accessed', detail: 'GetSecretValue — 3 secrets retrieved', color: '#F97316', bg: '#FFF7ED', severity: 'high' },
  { id: 'cloudtrail', x: 880, y: 80, icon: Eye, label: 'CloudTrail', subLabel: 'Monitoring', detail: 'Detected by Nova Sentinel in <60s', color: '#10B981', bg: '#ECFDF5', severity: 'low' },
];

const EDGES: EdgeDef[] = [
  { from: 'internet', to: 'gateway', color: '#7C3AED', label: 'HTTP/S', delay: 0.3 },
  { from: 'gateway', to: 'vpc', color: '#6366F1', label: 'Route', delay: 0.5 },
  { from: 'vpc', to: 'ec2', color: '#EF4444', label: 'SSH:22', delay: 0.7 },
  { from: 'ec2', to: 'iam', color: '#EF4444', label: 'AssumeRole', delay: 0.9 },
  { from: 'iam', to: 'database', color: '#F97316', label: 'Query', delay: 1.1 },
  { from: 'vpc', to: 'sg', color: '#EF4444', delay: 1.3 },
  { from: 'sg', to: 'ssh', color: '#DC2626', label: 'Exploit', delay: 1.5 },
  { from: 'ec2', to: 'ssh', color: '#EF4444', delay: 1.6 },
  { from: 'ssh', to: 'secrets', color: '#F97316', label: 'Exfil', delay: 1.7 },
  { from: 'iam', to: 'secrets', color: '#F97316', delay: 1.8 },
  { from: 'iam', to: 'cloudtrail', color: '#10B981', label: 'Logged', delay: 1.9 },
];

const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));

const ZOOM_LEVELS = [0.6, 0.75, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2];

const AttackPathDiagram: React.FC = () => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState(3); // starts at 1x (index 3)
  const activeNode = NODES.find(n => n.id === hoveredNode);

  const zoom = ZOOM_LEVELS[zoomIndex];
  const zoomIn = () => setZoomIndex(prev => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
  const zoomOut = () => setZoomIndex(prev => Math.max(prev - 1, 0));
  const resetZoom = () => setZoomIndex(3);

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-card bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-red-50/20">
        <div>
          <h2 className="text-base font-bold text-slate-900">Attack Path Graph</h2>
          <p className="text-xs text-slate-500 mt-0.5">Interactive security graph — hover nodes for threat details</p>
        </div>
        <div className="flex items-center gap-5">
          {/* Legend */}
          <div className="hidden md:flex gap-4">
            {[
              { color: 'bg-red-500', label: 'Critical' },
              { color: 'bg-orange-500', label: 'High' },
              { color: 'bg-blue-500', label: 'Medium' },
              { color: 'bg-emerald-500', label: 'Monitored' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <span className="text-[10px] font-semibold text-slate-500">{item.label}</span>
              </div>
            ))}
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
              onClick={resetZoom}
              className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition-all"
              title="Fit to view"
            >
              <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div className="relative overflow-auto" style={{ maxHeight: '500px' }}>
        {/* Subtle dot grid bg */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, #e2e8f0 0.6px, transparent 0.6px)',
          backgroundSize: '20px 20px',
        }} />
        
        <div
          className="transition-transform duration-300 ease-out origin-center"
          style={{ transform: `scale(${zoom})`, minWidth: zoom > 1 ? `${960 * zoom}px` : undefined }}
        >
          <svg width="960" height="320" viewBox="0 0 960 320" className="w-full relative z-10" preserveAspectRatio="xMidYMid meet">
            <defs>
              {EDGES.map((edge, i) => (
                <marker key={`m-${i}`} id={`arrow-d-${i}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill={edge.color} opacity="0.6" />
                </marker>
              ))}
              <filter id="dash-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.1" />
              </filter>
              <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feFlood floodColor="#EF4444" floodOpacity="0.15" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
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
              const curveOffset = Math.abs(dy) > 50 ? 0 : (dx > 0 ? -12 : 12);
              const pathD = `M ${from.x} ${from.y} Q ${mx} ${my + curveOffset} ${to.x} ${to.y}`;

              return (
                <g key={`edge-${i}`}>
                  {/* Glow */}
                  <motion.path
                    d={pathD} stroke={edge.color} strokeWidth="4" fill="none" opacity="0.06"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: edge.delay, duration: 0.8 }}
                  />
                  {/* Dashed line */}
                  <motion.path
                    d={pathD} stroke={edge.color} strokeWidth="1.5" fill="none" opacity="0.45"
                    strokeDasharray="6 4"
                    markerEnd={`url(#arrow-d-${i})`}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.45 }}
                    transition={{ delay: edge.delay, duration: 0.8 }}
                  />
                  {/* Edge label */}
                  {edge.label && (
                    <motion.text
                      x={mx} y={my + curveOffset - 8}
                      textAnchor="middle" fill={edge.color} fontSize="8" fontWeight="700" fontFamily="Inter, sans-serif"
                      opacity="0.7"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.7 }}
                      transition={{ delay: edge.delay + 0.5 }}
                    >
                      {edge.label}
                    </motion.text>
                  )}
                  {/* Flowing particle */}
                  <motion.circle
                    r="3" fill={edge.color}
                    animate={{
                      opacity: [0, 0.8, 0.8, 0],
                      cx: [from.x, mx, to.x],
                      cy: [from.y, my + curveOffset, to.y],
                    }}
                    transition={{ delay: edge.delay + 0.8, duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
                  />
                </g>
              );
            })}

            {/* ===== NODES ===== */}
            {NODES.map((node, i) => {
              const Icon = node.icon;
              const isHovered = hoveredNode === node.id;
              const isCritical = node.severity === 'critical';

              return (
                <motion.g
                  key={node.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.06, duration: 0.4, type: 'spring', stiffness: 200 }}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Pulse ring for critical */}
                  {node.ring && (
                    <motion.circle
                      cx={node.x} cy={node.y} r="30"
                      fill="none" stroke={node.color} strokeWidth="1.5"
                      animate={{ opacity: [0.1, 0.3, 0.1], r: [28, 34, 28] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}

                  {/* Node circle */}
                  <circle
                    cx={node.x} cy={node.y} r={isHovered ? 26 : 24}
                    fill={node.bg} stroke={node.color}
                    strokeWidth={isHovered ? 3 : 2}
                    filter={isCritical ? 'url(#glow-red)' : 'url(#dash-shadow)'}
                    style={{ transition: 'r 0.2s, stroke-width 0.2s' }}
                  />

                  {/* Icon */}
                  <foreignObject x={node.x - 11} y={node.y - 11} width="22" height="22">
                    <div className="flex items-center justify-center h-full w-full">
                      <Icon className="w-5 h-5" strokeWidth={1.8} style={{ color: node.color }} />
                    </div>
                  </foreignObject>

                  {/* Label */}
                  <text x={node.x} y={node.y + 38} textAnchor="middle" fill="#334155" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">
                    {node.label}
                  </text>
                  <text x={node.x} y={node.y + 52} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="500" fontFamily="Inter, sans-serif">
                    {node.subLabel}
                  </text>
                </motion.g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Hover Detail Panel */}
      {activeNode && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 py-3 border-t border-slate-100 bg-slate-50/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: activeNode.bg }}>
              <activeNode.icon className="w-4 h-4" style={{ color: activeNode.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">{activeNode.label}</span>
                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${
                  activeNode.severity === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                  activeNode.severity === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  activeNode.severity === 'low' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {activeNode.severity.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{activeNode.detail}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AttackPathDiagram;
