/**
 * AI Security Graph — Visualizes AI assets and their relationships
 * Internet → API → Bedrock/SageMaker → IAM → S3. Premium design, info-rich.
 */
import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import { Info, Shield } from 'lucide-react';
import {
  AmazonCloudFront,
  AmazonApiGateway,
  AmazonBedrock,
  AmazonSageMaker,
  AwsIdentityAndAccessManagement,
  AmazonSimpleStorageService,
} from '@nxavis/aws-icons';
import { IconGraph } from '../ui/MinimalIcons';
import api from '../../services/api';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NODE_STYLES: Record<string, { bg: string; border: string; icon: React.ComponentType<any>; color: string }> = {
  internet: { bg: '#f8fafc', border: '#cbd5e1', icon: AmazonCloudFront, color: '#64748b' },
  api: { bg: '#eef2ff', border: '#a5b4fc', icon: AmazonApiGateway, color: '#6366f1' },
  bedrock: { bg: '#ecfdf5', border: '#6ee7b7', icon: AmazonBedrock, color: '#059669' },
  sagemaker: { bg: '#fffbeb', border: '#fcd34d', icon: AmazonSageMaker, color: '#d97706' },
  iam: { bg: '#fdf2f8', border: '#f9a8d4', icon: AwsIdentityAndAccessManagement, color: '#db2777' },
  s3: { bg: '#f0f9ff', border: '#7dd3fc', icon: AmazonSimpleStorageService, color: '#0ea5e9' },
};

const NODE_INFO: Record<string, { what: string; why: string }> = {
  internet: { what: 'External traffic and user requests', why: 'Attackers probe public endpoints for misconfigurations or injection points.' },
  api: { what: 'API Gateway or Application Load Balancer', why: 'First line of defense. Misconfigured CORS, missing WAF, or weak auth exposes AI endpoints.' },
  bedrock: { what: 'Amazon Bedrock — Nova and other foundation models', why: 'InvokeModel calls need guardrails. Prompt injection, PII leakage, and model abuse are key risks.' },
  sagemaker: { what: 'SageMaker inference endpoints', why: 'Custom models and notebooks. Check IAM, network isolation, and data access.' },
  iam: { what: 'IAM roles used by models and agents', why: 'Over-privileged roles let compromised AI access S3, RDS, or other sensitive resources.' },
  s3: { what: 'S3 buckets, RDS — data stores', why: 'Final target. Exfiltrated data, poisoned training sets, or leaked credentials end up here.' },
};

function CustomNode({ data }: { data: { label: string; sublabel?: string; type: string; selected?: boolean } }) {
  const style = NODE_STYLES[data.type] || NODE_STYLES.internet;
  const Icon = style.icon;
  const selected = !!data.selected;
  return (
    <div className="flex flex-col items-center justify-center min-w-0">
      <div
        className={`relative w-[72px] h-[72px] rounded-xl border-2 shadow-sm flex items-center justify-center transition-all ${
          selected ? 'ring-4 ring-indigo-400 ring-offset-2 shadow-lg scale-105' : ''
        }`}
        style={{ borderColor: selected ? '#6366f1' : style.border, backgroundColor: style.bg }}
      >
        <Handle type="target" position={Position.Left} className="!w-2 !h-2 !border-2 !bg-white !top-1/2 !-translate-y-1/2" style={{ left: -14 }} />
        {Icon && <Icon size={56} color={style.color} />}
        <Handle type="source" position={Position.Right} className="!w-2 !h-2 !border-2 !bg-white !top-1/2 !-translate-y-1/2" style={{ right: -14, left: 'auto' }} />
      </div>
      <span className="text-[11px] font-bold text-slate-800 text-center leading-tight mt-1.5 max-w-[100px]">{data.label}</span>
      {data.sublabel && <span className="text-[9px] text-slate-500 text-center">{data.sublabel}</span>}
    </div>
  );
}

const nodeTypes: NodeTypes = { custom: CustomNode };

const INITIAL_NODES: Node[] = [
  { id: 'internet', type: 'custom', position: { x: 50, y: 150 }, data: { label: 'Internet', type: 'internet' } },
  { id: 'api', type: 'custom', position: { x: 280, y: 80 }, data: { label: 'API Gateway / ALB', type: 'api', sublabel: 'Public endpoint' } },
  { id: 'bedrock', type: 'custom', position: { x: 500, y: 80 }, data: { label: 'Bedrock', type: 'bedrock', sublabel: 'Nova models' } },
  { id: 'sagemaker', type: 'custom', position: { x: 500, y: 220 }, data: { label: 'SageMaker', type: 'sagemaker', sublabel: 'Endpoints' } },
  { id: 'iam', type: 'custom', position: { x: 720, y: 150 }, data: { label: 'IAM Roles', type: 'iam', sublabel: 'InvokeModel perms' } },
  { id: 's3', type: 'custom', position: { x: 920, y: 150 }, data: { label: 'S3 / RDS', type: 's3', sublabel: 'Data stores' } },
];

const edgeLabelStyle = { fill: '#1e293b', fontSize: 13, fontWeight: 600 };
const edgeLabelBg = { fill: 'white', fillOpacity: 0.98 };
const edgeLabelPadding: [number, number] = [8, 12];

const INITIAL_EDGES: Edge[] = [
  { id: 'e1', source: 'internet', target: 'api', type: 'straight', label: 'API', animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' }, labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBg, labelBgBorderRadius: 6, labelBgPadding: edgeLabelPadding },
  { id: 'e2', source: 'api', target: 'bedrock', type: 'straight', label: 'InvokeModel', animated: true, style: { stroke: '#6366f1', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }, labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBg, labelBgBorderRadius: 6, labelBgPadding: edgeLabelPadding },
  { id: 'e3', source: 'api', target: 'sagemaker', type: 'straight', label: 'Invoke', animated: true, style: { stroke: '#d97706', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#d97706' }, labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBg, labelBgBorderRadius: 6, labelBgPadding: edgeLabelPadding },
  { id: 'e4', source: 'bedrock', target: 'iam', type: 'straight', label: 'AssumeRole', style: { stroke: '#059669', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#059669' }, labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBg, labelBgBorderRadius: 6, labelBgPadding: edgeLabelPadding },
  { id: 'e5', source: 'sagemaker', target: 'iam', type: 'straight', label: 'AssumeRole', style: { stroke: '#d97706', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#d97706' }, labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBg, labelBgBorderRadius: 6, labelBgPadding: edgeLabelPadding },
  { id: 'e6', source: 'iam', target: 's3', type: 'straight', label: 'GetObject', animated: true, style: { stroke: '#db2777', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#db2777' }, labelStyle: edgeLabelStyle, labelBgStyle: edgeLabelBg, labelBgBorderRadius: 6, labelBgPadding: edgeLabelPadding },
];

const AISecurityGraph: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [modelCount, setModelCount] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Sync selected state to node data so CustomNode receives it
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, selected: n.id === selectedNode },
      }))
    );
  }, [selectedNode, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  }, []);

  useEffect(() => {
    api.get('/api/ai-security/bedrock-inventory')
      .then((r) => setModelCount(r.data?.count ?? r.data?.models?.length ?? null))
      .catch(() => setModelCount(null));
  }, []);

  const info = selectedNode ? NODE_INFO[selectedNode] : null;
  const selectedLabel = selectedNode ? INITIAL_NODES.find((n) => n.id === selectedNode)?.data?.label : null;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-indigo-50/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/90 to-violet-500/90 flex items-center justify-center shadow-sm">
              <IconGraph className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">AI Security Graph</h3>
              <p className="text-sm text-slate-600 mt-0.5">
                Relationships between AI assets — exposure, permissions, data access
              </p>
            </div>
          </div>
          {modelCount != null && (
            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {modelCount} models
            </span>
          )}
        </div>
        <div className="grid lg:grid-cols-[1fr_320px]">
          <div className="h-[420px] bg-slate-50/30 [&_.react-flow__attribution]:!hidden">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              className="rounded-b-xl"
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#e2e8f0" gap={20} />
              <Controls className="!bg-white !border-slate-200 !shadow-sm" />
            </ReactFlow>
          </div>
          <div className="border-l border-slate-200 bg-slate-50/30 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-bold text-slate-800">Node details</span>
            </div>
            {info && selectedLabel ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-800">{selectedLabel}</p>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">What it is</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{info.what}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Why it matters</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{info.why}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                <strong>Click any node</strong> to see what it is and why it matters for AI security. The selected node will highlight with a blue ring.
              </p>
            )}
            {selectedNode === 'iam' && (
              <a href="https://aegis-iam.vercel.app/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300">
                <Shield className="w-3.5 h-3.5" /> Analyze IAM with Aegis IAM →
              </a>
            )}
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Attack path</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                Internet → API → Bedrock/SageMaker → IAM → S3. wolfir monitors InvokeModel, guardrails, and Shadow AI.
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-600">
          <strong>Tip:</strong> Drag nodes to rearrange. Arrows show data flow and potential attack paths.
        </div>
      </motion.div>
    </div>
  );
};

export default AISecurityGraph;
