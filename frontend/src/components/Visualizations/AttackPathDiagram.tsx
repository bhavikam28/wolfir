/**
 * Attack Path Diagram - Dashboard Analysis View
 * Minimap, search, export PNG/SVG, pinch-zoom, MITRE ATT&CK links
 */
import React, { useState, useRef, useCallback } from 'react';
import type { Timeline } from '../../types/incident';
import type { OrchestrationResponse } from '../../types/incident';
import { motion } from 'framer-motion';
import {
  Shield, AlertTriangle, Key, Globe, Network,
  Wifi, Server, User, Database, Eye,
  ZoomIn, ZoomOut, Maximize2, Minimize2, Search, Download
} from 'lucide-react';

/** MITRE ATT&CK technique reference — name, why it matters, link */
const MITRE_MAP: Record<string, { name: string; desc: string; url: string }> = {
  T1078: { name: 'Valid Accounts', desc: 'Adversary uses stolen/compromised credentials to access resources. High impact — bypasses detection.', url: 'https://attack.mitre.org/techniques/T1078/' },
  T1190: { name: 'Exploit Public-Facing Application', desc: 'Initial access via vulnerable web app, API, or service exposed to the internet.', url: 'https://attack.mitre.org/techniques/T1190/' },
  T1021: { name: 'Remote Services', desc: 'Access via SSH, RDP, or other remote services. Common for lateral movement.', url: 'https://attack.mitre.org/techniques/T1021/' },
  T1041: { name: 'Exfiltration Over C2 Channel', desc: 'Data theft through command-and-control channel. Indicates data loss risk.', url: 'https://attack.mitre.org/techniques/T1041/' },
  T1552: { name: 'Unsecured Credentials', desc: 'Accessing stored credentials (Secrets Manager, config files). Enables privilege escalation.', url: 'https://attack.mitre.org/techniques/T1552/' },
  T1562: { name: 'Impair Defenses', desc: 'Adversary disables or evades security tools (CloudTrail, GuardDuty). Reduces visibility.', url: 'https://attack.mitre.org/techniques/T1562/' },
};

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
}

interface EdgeDef {
  from: string;
  to: string;
  color: string;
  label?: string;
  delay: number;
}

/* Saturated palette — darker fills so nodes don't read as white */
const NODES: NodeDef[] = [
  { id: 'internet', x: 80, y: 200, icon: Globe, label: 'Internet', subLabel: 'External Origin', detail: 'Suspicious IP: 203.0.113.42 (TOR exit node)', color: '#334155', bg: '#E2E8F0', severity: 'medium', mitreId: 'T1190' },
  { id: 'gateway', x: 240, y: 200, icon: Network, label: 'API Gateway', subLabel: 'Entry Point', detail: 'REST API — 847 requests in 2 minutes', color: '#334155', bg: '#E2E8F0', severity: 'medium', mitreId: 'T1190' },
  { id: 'vpc', x: 400, y: 200, icon: Wifi, label: 'VPC', subLabel: 'Network Layer', detail: 'vpc-0a1b2c3d — us-east-1', color: '#1D4ED8', bg: '#BFDBFE', severity: 'medium', mitreId: 'T1021' },
  { id: 'ec2', x: 560, y: 200, icon: Server, label: 'EC2 Instance', subLabel: 'Compromised', detail: 'i-abc123 — Attacker installed crypto-miner | Severity: Critical', color: '#B91C1C', bg: '#FECACA', severity: 'critical', ring: true, mitreId: 'T1078', resourceId: 'i-abc123', riskScore: 98 },
  { id: 'iam', x: 720, y: 200, icon: User, label: 'IAM Role', subLabel: 'Escalated', detail: 'arn:aws:iam::role/admin-temp — privilege escalation', color: '#B91C1C', bg: '#FECACA', severity: 'critical', ring: true, mitreId: 'T1078', riskScore: 92 },
  { id: 'database', x: 880, y: 200, icon: Database, label: 'RDS Database', subLabel: 'Data Target', detail: 'db-prod-main — 2.4GB data accessed', color: '#EA580C', bg: '#FED7AA', severity: 'high', mitreId: 'T1041', resourceId: 'db-prod-main', riskScore: 78 },
  { id: 'sg', x: 280, y: 80, icon: Shield, label: 'Security Group', subLabel: 'Misconfigured', detail: 'sg-0xyz — 0.0.0.0/0 on port 22 (OPEN)', color: '#B91C1C', bg: '#FECACA', severity: 'critical', ring: true, mitreId: 'T1190', resourceId: 'sg-0xyz', riskScore: 95 },
  { id: 'ssh', x: 500, y: 80, icon: AlertTriangle, label: 'SSH Exposed', subLabel: 'Port 22 Open', detail: '14 failed login attempts before breach', color: '#991B1B', bg: '#FECACA', severity: 'critical', ring: true, mitreId: 'T1021', riskScore: 94 },
  { id: 'secrets', x: 720, y: 80, icon: Key, label: 'Secrets Mgr', subLabel: 'Accessed', detail: 'GetSecretValue — 3 secrets retrieved', color: '#EA580C', bg: '#FED7AA', severity: 'high', mitreId: 'T1552', riskScore: 85 },
  { id: 'cloudtrail', x: 880, y: 80, icon: Eye, label: 'CloudTrail', subLabel: 'Monitoring', detail: 'Detected by Nova Sentinel in <60s', color: '#059669', bg: '#A7F3D0', severity: 'low', mitreId: 'T1562' },
];

const EDGES: EdgeDef[] = [
  { from: 'internet', to: 'gateway', color: '#475569', label: 'HTTP/S', delay: 0.3 },
  { from: 'gateway', to: 'vpc', color: '#475569', label: 'Route', delay: 0.5 },
  { from: 'vpc', to: 'ec2', color: '#B91C1C', label: 'SSH:22', delay: 0.7 },
  { from: 'ec2', to: 'iam', color: '#B91C1C', label: 'AssumeRole', delay: 0.9 },
  { from: 'iam', to: 'database', color: '#EA580C', label: 'Query', delay: 1.1 },
  { from: 'vpc', to: 'sg', color: '#B91C1C', delay: 1.3 },
  { from: 'sg', to: 'ssh', color: '#991B1B', label: 'Exploit', delay: 1.5 },
  { from: 'ec2', to: 'ssh', color: '#B91C1C', delay: 1.6 },
  { from: 'ssh', to: 'secrets', color: '#EA580C', label: 'Exfil', delay: 1.7 },
  { from: 'iam', to: 'secrets', color: '#EA580C', delay: 1.8 },
  { from: 'iam', to: 'cloudtrail', color: '#059669', label: 'Logged', delay: 1.9 },
];

const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));

const ZOOM_LEVELS = [0.6, 0.75, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2];

interface AttackPathDiagramProps {
  timeline?: Timeline;
  orchestrationResult?: OrchestrationResponse | null;
  onNavigateToRemediation?: () => void;
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
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDistRef = useRef<number | null>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
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
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Attack Path Graph</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
              Powered by Nova Pro
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Click node to select & open details below · hover for preview · drag to pan · Ctrl+scroll to zoom</p>
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
          {/* Export */}
          <div className="flex gap-1">
            <button onClick={exportPng} className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1" title="Download PNG">
              <Download className="w-3 h-3" /> PNG
            </button>
            <button onClick={exportSvg} className="px-2 py-1.5 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600" title="Download SVG">SVG</button>
          </div>
          {/* Legend */}
          <div className="hidden md:flex gap-4">
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

      {/* Graph — pannable and zoomable */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden flex-1 min-h-0 flex items-center justify-center select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        } ${isFullscreen ? 'p-4' : ''}`}
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
            minWidth: 960,
            minHeight: 320,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          <svg ref={svgRef} width="960" height="320" viewBox="0 0 960 320" className="relative z-10" preserveAspectRatio="xMidYMid meet">
            <defs>
              <marker id="arrow-flow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#64748b" opacity="0.7" />
              </marker>
              <filter id="dash-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.1" />
              </filter>
              <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feFlood floodColor="#B91C1C" floodOpacity="0.2" />
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

            {/* ===== EDGES with animated flow ===== */}
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
                  {/* Base path (static) */}
                  <path d={pathD} stroke={edge.color} strokeWidth="1.5" fill="none" opacity="0.25" strokeDasharray="6 4" />
                  {/* Animated flow path - dashed moving toward target */}
                  <path
                    d={pathD}
                    stroke={edge.color}
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="8 6"
                    strokeLinecap="round"
                    markerEnd="url(#arrow-flow)"
                    opacity="0.85"
                    className="attack-path-line"
                    style={{ strokeDashoffset: 0, animation: 'dash-flow 2s linear infinite' }}
                  />
                  {/* Edge label with background for readability */}
                  {edge.label && (
                    <g>
                      <rect
                        x={mx - 28}
                        y={my + curveOffset - 18}
                        width={56}
                        height={14}
                        rx={4}
                        fill="white"
                        fillOpacity="0.9"
                        stroke={edge.color}
                        strokeWidth="0.5"
                        strokeOpacity="0.5"
                      />
                      <text
                        x={mx}
                        y={my + curveOffset - 8}
                        textAnchor="middle"
                        fill={edge.color}
                        fontSize="10"
                        fontWeight="700"
                        fontFamily="Inter, system-ui, sans-serif"
                      >
                        {edge.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* ===== NODES ===== */}
            {NODES.map((node, i) => {
              const Icon = node.icon;
              const isHovered = hoveredNode === node.id;
              const isSelected = selectedNode === node.id;
              const isActive = isHovered || isSelected;
              const isCritical = node.severity === 'critical';
              const isSearchMatch = searchLower && (node.label.toLowerCase().includes(searchLower) || node.subLabel.toLowerCase().includes(searchLower) || node.resourceId?.toLowerCase().includes(searchLower));

              return (
                <motion.g
                  key={node.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.06, duration: 0.4, type: 'spring', stiffness: 200 }}
                  className="cursor-pointer"
                  onMouseEnter={(e) => handleNodeHover(node.id, e)}
                  onMouseMove={(e) => hoveredNode === node.id && setTooltipPos({ x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => handleNodeHover(null)}
                  onClick={(e) => handleNodeClick(e, node.id)}
                >
                  {node.ring && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={30}
                      fill="none"
                      stroke={node.color}
                      strokeWidth="1.5"
                      opacity={0.2}
                      className="animate-pulse"
                    />
                  )}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isActive ? 26 : 24}
                    fill={node.bg}
                    stroke={isSearchMatch && !isActive ? '#3B82F6' : node.color}
                    strokeWidth={isSelected ? 4 : isHovered ? 3 : isSearchMatch ? 3 : 2}
                    filter={isCritical ? 'url(#glow-red)' : 'url(#dash-shadow)'}
                    style={{ transition: 'r 0.2s, stroke-width 0.2s', opacity: searchLower && !isSearchMatch ? 0.35 : 1 }}
                  />
                  <foreignObject x={node.x - 11} y={node.y - 11} width="22" height="22">
                    <div className="flex items-center justify-center h-full w-full">
                      <Icon className="w-5 h-5" strokeWidth={1.8} style={{ color: node.color }} />
                    </div>
                  </foreignObject>
                  <text x={node.x} y={node.y + 38} textAnchor="middle" fill="#334155" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">
                    {node.label}
                  </text>
                  <text x={node.x} y={node.y + 52} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="500" fontFamily="Inter, sans-serif">
                    {node.subLabel}
                  </text>
                  {(node.mitreId || node.riskScore != null) && (
                    <text
                      x={node.x}
                      y={node.y + 64}
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
          <div className="absolute bottom-3 right-3 z-20 w-32 h-24 rounded-lg border-2 border-slate-300 bg-white/95 shadow-lg overflow-hidden pointer-events-none">
            <svg width="128" height="96" viewBox="0 0 960 320" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
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
                <circle key={node.id} cx={node.x} cy={node.y} r={8} fill={node.bg} stroke={node.color} strokeWidth="1" />
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
              {activeNode.mitreId && MITRE_MAP[activeNode.mitreId] && (
                <span> • {activeNode.mitreId}: {MITRE_MAP[activeNode.mitreId].name}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Panel (bottom) — only when node is clicked/selected, so user can reach the View Remediation button */}
      {detailPanelNode && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-6 py-3 border-t border-slate-100 bg-slate-50/50"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: detailPanelNode.bg }}>
              <detailPanelNode.icon className="w-4 h-4" style={{ color: detailPanelNode.color }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-900">{detailPanelNode.label}</span>
                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded border ${
                  detailPanelNode.severity === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                  detailPanelNode.severity === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  detailPanelNode.severity === 'low' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {detailPanelNode.severity.toUpperCase()}
                </span>
                {detailPanelNode.riskScore != null && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-white border border-slate-700">
                    {detailPanelNode.riskScore}/100
                  </span>
                )}
                {detailPanelNode.mitreId && MITRE_MAP[detailPanelNode.mitreId] && (
                  <a
                    href={MITRE_MAP[detailPanelNode.mitreId].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono hover:bg-indigo-100"
                  >
                    MITRE {detailPanelNode.mitreId}
                  </a>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{detailPanelNode.detail}</p>
              {detailPanelNode.mitreId && MITRE_MAP[detailPanelNode.mitreId] && (
                <div className="mt-2 p-2 rounded-lg bg-slate-100 border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-700">{detailPanelNode.mitreId}: {MITRE_MAP[detailPanelNode.mitreId].name}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{MITRE_MAP[detailPanelNode.mitreId].desc}</p>
                  <a href={MITRE_MAP[detailPanelNode.mitreId].url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-600 hover:underline mt-1 inline-block">
                    Learn more on MITRE ATT&CK →
                  </a>
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
      )}

      <style>{`
        @keyframes dash-flow {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -28; }
        }
        .attack-path-line {
          stroke-dasharray: 8 6;
          animation: dash-flow 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default AttackPathDiagram;
