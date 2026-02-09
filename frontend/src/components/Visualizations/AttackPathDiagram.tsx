/**
 * Wiz.io-Inspired Attack Path Diagram
 * Clean network graph with grid background and professional styling
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  Key,
  Globe,
  Network,
  Wifi,
  Server,
  User,
  Database,
} from 'lucide-react';

interface SecurityNodeProps {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  subLabel?: string;
  color: string;
  delay: number;
  severity?: 'critical' | 'high' | 'medium';
  x: number;
  y: number;
}

const SecurityNode: React.FC<SecurityNodeProps> = ({ 
  icon: Icon, 
  label, 
  subLabel,
  color, 
  delay,
  severity = 'medium',
  x,
  y
}) => (
  <motion.g
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay, duration: 0.4 }}
    className="cursor-pointer"
  >
    {/* Severity indicator ring */}
    {severity === 'critical' && (
      <circle
        cx={x}
        cy={y}
        r="38"
        fill="none"
        stroke="#EF4444"
        strokeWidth="2"
        opacity="0.4"
      />
    )}
    {severity === 'high' && (
      <circle
        cx={x}
        cy={y}
        r="38"
        fill="none"
        stroke="#F97316"
        strokeWidth="2"
        opacity="0.4"
      />
    )}
    
    {/* Node circle */}
    <circle
      cx={x}
      cy={y}
      r="24"
      fill={color}
      stroke="white"
      strokeWidth="3"
      className="drop-shadow-lg"
    />
    
    {/* Icon using foreignObject */}
    <foreignObject x={x - 12} y={y - 12} width="24" height="24">
      <div className="flex items-center justify-center h-full w-full" style={{ color: 'white' }}>
        <Icon className="w-6 h-6" strokeWidth={2} />
      </div>
    </foreignObject>
    
    {/* Label */}
    <text
      x={x}
      y={y + 45}
      textAnchor="middle"
      className="text-sm font-semibold"
      fill="#1e293b"
      fontSize="14"
    >
      {label}
    </text>
    
    {/* Sub Label */}
    {subLabel && (
      <text
        x={x}
        y={y + 60}
        textAnchor="middle"
        className="text-xs"
        fill="#64748b"
        fontSize="12"
      >
        {subLabel}
      </text>
    )}
  </motion.g>
);

const AttackPathDiagram: React.FC = () => {
  // Node positions (centered layout)
  const nodes = {
    internet: { x: 120, y: 350, icon: Globe, label: 'Internet', subLabel: 'External Source', color: '#8B5CF6', severity: 'high' as const },
    gateway: { x: 280, y: 350, icon: Network, label: 'Gateway', subLabel: 'Network Gateway', color: '#6366F1', severity: 'high' as const },
    network: { x: 440, y: 350, icon: Wifi, label: 'Network', subLabel: 'VPC Network', color: '#6366F1', severity: 'high' as const },
    ec2: { x: 600, y: 350, icon: Server, label: 'EC2 Instance', subLabel: 'Compute Resource', color: '#EF4444', severity: 'critical' as const },
    iam: { x: 760, y: 350, icon: User, label: 'IAM Role', subLabel: 'Identity & Access', color: '#EF4444', severity: 'critical' as const },
    database: { x: 920, y: 350, icon: Database, label: 'Database', subLabel: 'Data Store', color: '#F97316', severity: 'high' as const },
    sg: { x: 440, y: 180, icon: Shield, label: 'Security Group', subLabel: 'Network Security', color: '#EF4444', severity: 'critical' as const },
    ssh: { x: 600, y: 180, icon: AlertTriangle, label: 'SSH Exposed', subLabel: 'Vulnerability', color: '#EF4444', severity: 'critical' as const },
    secret: { x: 760, y: 180, icon: Key, label: 'Secret', subLabel: 'Credentials', color: '#F97316', severity: 'high' as const },
  };

  const connections = [
    { from: nodes.internet, to: nodes.gateway, color: '#6366F1', delay: 0.2 },
    { from: nodes.gateway, to: nodes.network, color: '#6366F1', delay: 0.3 },
    { from: nodes.network, to: nodes.ec2, color: '#EF4444', delay: 0.4 },
    { from: nodes.ec2, to: nodes.iam, color: '#EF4444', delay: 0.5 },
    { from: nodes.iam, to: nodes.database, color: '#EF4444', delay: 0.6 },
    { from: nodes.sg, to: nodes.ssh, color: '#EF4444', delay: 0.7 },
    { from: nodes.ssh, to: nodes.secret, color: '#F97316', delay: 0.8 },
    { from: nodes.network, to: nodes.sg, color: '#EF4444', delay: 0.9 },
    { from: nodes.ec2, to: nodes.ssh, color: '#EF4444', delay: 1.0 },
    { from: nodes.iam, to: nodes.secret, color: '#F97316', delay: 1.1 },
  ];

  return (
    <div className="w-full bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-xl font-bold text-slate-900">
          Security Attack Path
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Visual representation of the critical attack chain
        </p>
      </div>

      {/* Diagram Container with Grid Background */}
      <div className="relative bg-white p-8 overflow-x-auto">
        <svg width="1100" height="500" className="w-full" viewBox="0 0 1100 500" preserveAspectRatio="xMidYMid meet">
          {/* Grid Background (like Wiz.io) */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Arrow marker definition */}
          <defs>
            {connections.map((conn, i) => (
              <marker
                key={`arrow-${i}`}
                id={`arrowhead-${i}`}
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill={conn.color} />
              </marker>
            ))}
          </defs>

          {/* Connection Lines */}
          {connections.map((conn, i) => (
            <motion.line
              key={`line-${i}`}
              x1={conn.from.x}
              y1={conn.from.y}
              x2={conn.to.x}
              y2={conn.to.y}
              stroke={conn.color}
              strokeWidth="2"
              markerEnd={`url(#arrowhead-${i})`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: conn.delay, duration: 0.8, ease: "easeInOut" }}
            />
          ))}

          {/* Nodes */}
          {Object.entries(nodes).map(([key, node], i) => {
            const Icon = node.icon;
            return (
              <SecurityNode
                key={key}
                icon={Icon}
                label={node.label}
                subLabel={node.subLabel}
                color={node.color}
                delay={0.1 + i * 0.05}
                severity={node.severity}
                x={node.x}
                y={node.y}
              />
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
        <div className="flex gap-6 justify-center flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs font-medium text-slate-700">Critical Path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500" />
            <span className="text-xs font-medium text-slate-700">Attack Path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-xs font-medium text-slate-700">High Severity</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttackPathDiagram;
