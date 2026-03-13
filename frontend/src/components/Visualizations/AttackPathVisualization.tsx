/**
 * Attack Path Visualization — Premium light theme
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Globe, Network, Shield, Server, User, Database,
  ZoomIn, ZoomOut, Maximize2
} from 'lucide-react';

const NODES = [
  { x: 80, y: 120, icon: Globe, label: 'Internet', sub: 'External', color: '#4f46e5', bg: '#eef2ff', severity: 'entry', delay: 0 },
  { x: 240, y: 120, icon: Network, label: 'API Gateway', sub: 'Entry Point', color: '#4f46e5', bg: '#eef2ff', severity: 'entry', delay: 0.1 },
  { x: 400, y: 120, icon: Shield, label: 'Firewall', sub: 'WAF Rules', color: '#64748b', bg: '#f1f5f9', severity: 'medium', delay: 0.15 },
  { x: 560, y: 120, icon: Server, label: 'EC2', sub: 'Compromised', color: '#dc2626', bg: '#fef2f2', severity: 'critical', delay: 0.2 },
  { x: 720, y: 120, icon: User, label: 'IAM Role', sub: 'Escalated', color: '#dc2626', bg: '#fef2f2', severity: 'critical', delay: 0.25 },
  { x: 880, y: 120, icon: Database, label: 'Database', sub: 'Data Target', color: '#64748b', bg: '#f8fafc', severity: 'high', delay: 0.3 },
];

const EDGES = [
  { from: 0, to: 1, color: '#4f46e5', label: 'HTTPS', delay: 0.4 },
  { from: 1, to: 2, color: '#4f46e5', label: 'Route', delay: 0.55 },
  { from: 2, to: 3, color: '#dc2626', label: 'SSH:22', delay: 0.7 },
  { from: 3, to: 4, color: '#dc2626', label: 'AssumeRole', delay: 0.85 },
  { from: 4, to: 5, color: '#64748b', label: 'Query', delay: 1.0 },
];

const ZOOM_LEVELS = [0.7, 0.85, 1, 1.2, 1.4, 1.6];

const AttackPathVisualization: React.FC = () => {
  const [zoomIndex, setZoomIndex] = useState(2);
  const zoom = ZOOM_LEVELS[zoomIndex];
  const zoomIn = () => setZoomIndex(prev => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
  const zoomOut = () => setZoomIndex(prev => Math.max(prev - 1, 0));
  const resetZoom = () => setZoomIndex(2);

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
      <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Attack Path Analysis</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Real-time threat chain visualization</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex gap-4">
            {[
              { color: 'bg-red-500', label: 'Critical' },
              { color: 'bg-indigo-500', label: 'Entry' },
              { color: 'bg-slate-400', label: 'API' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${item.color}`} />
                <span className="text-[10px] font-medium text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
            <button onClick={zoomOut} disabled={zoomIndex === 0} className="p-1.5 rounded-md hover:bg-slate-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Zoom out">
              <ZoomOut className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <button onClick={resetZoom} className="px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100 rounded-md transition-all min-w-[40px]" title="Reset zoom">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={zoomIn} disabled={zoomIndex === ZOOM_LEVELS.length - 1} className="p-1.5 rounded-md hover:bg-slate-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Zoom in">
              <ZoomIn className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
            <button onClick={resetZoom} className="p-1.5 rounded-md hover:bg-slate-100 transition-all" title="Fit to view">
              <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative px-4 py-8 overflow-auto" style={{ maxHeight: '400px' }}>
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: 'radial-gradient(circle, #e2e8f0 0.5px, transparent 0.5px)',
          backgroundSize: '24px 24px',
        }} />
        <div className="transition-transform duration-300 ease-out origin-center" style={{ transform: `scale(${zoom})`, minWidth: zoom > 1 ? `${960 * zoom}px` : undefined }}>
          <svg width="960" height="210" viewBox="0 0 960 210" className="w-full relative z-10" preserveAspectRatio="xMidYMid meet">
            <defs>
              {EDGES.map((edge, i) => (
                <marker key={`lm-${i}`} id={`lp-arrow-${i}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill={edge.color} opacity="0.7" />
                </marker>
              ))}
              <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.08" />
              </filter>
              <filter id="lp-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feFlood floodColor="#dc2626" floodOpacity="0.12" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {EDGES.map((edge, i) => {
              const from = NODES[edge.from];
              const to = NODES[edge.to];
              const mx = (from.x + to.x) / 2;
              return (
                <g key={`e-${i}`}>
                  <motion.line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={edge.color} strokeWidth="4" opacity="0.08"
                    initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ delay: edge.delay, duration: 0.5 }} />
                  <motion.line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={edge.color} strokeWidth="1.5" opacity="0.6"
                    strokeDasharray="6 4" markerEnd={`url(#lp-arrow-${i})`}
                    initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 0.6 }} viewport={{ once: true }} transition={{ delay: edge.delay, duration: 0.5 }} />
                  <motion.text x={mx} y={from.y - 12} textAnchor="middle" fill={edge.color} fontSize="8" fontWeight="700" fontFamily="Inter, sans-serif"
                    initial={{ opacity: 0 }} whileInView={{ opacity: 0.8 }} viewport={{ once: true }} transition={{ delay: edge.delay + 0.3 }}>
                    {edge.label}
                  </motion.text>
                  <circle r={3} fill={edge.color} cx={from?.x ?? 0} cy={from?.y ?? 0} opacity={0.5} />
                </g>
              );
            })}
            {NODES.map((node, i) => {
              const Icon = node.icon;
              const isCritical = node.severity === 'critical';
              return (
                <motion.g key={i} initial={{ scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}
                  transition={{ delay: node.delay, duration: 0.4, type: 'spring', stiffness: 200 }}>
                  {isCritical && (
                    <circle cx={node.x} cy={node.y} r={30} fill="none" stroke={node.color} strokeWidth="1.5" opacity={0.15} className="animate-pulse" />
                  )}
                  <circle cx={node.x} cy={node.y} r="24" fill={node.bg} stroke={node.color} strokeWidth="2"
                    filter={isCritical ? 'url(#lp-glow)' : 'url(#node-shadow)'} />
                  <foreignObject x={node.x - 10} y={node.y - 10} width="20" height="20">
                    <div className="flex items-center justify-center h-full w-full">
                      <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} style={{ color: node.color }} />
                    </div>
                  </foreignObject>
                  <text x={node.x} y={node.y + 38} textAnchor="middle" fill="#1e293b" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">{node.label}</text>
                  <text x={node.x} y={node.y + 51} textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="500" fontFamily="Inter, sans-serif">{node.sub}</text>
                </motion.g>
              );
            })}
            <motion.g initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1.3, duration: 0.4 }}>
              <rect x="360" y="178" width="240" height="26" rx="13" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.5" />
              <text x="480" y="195" textAnchor="middle" fill="#059669" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">
                wolfir — Threat Detected
              </text>
            </motion.g>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default AttackPathVisualization;
