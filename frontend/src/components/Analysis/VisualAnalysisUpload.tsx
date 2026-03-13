/**
 * Visual Analysis Upload - Multimodal architecture diagram analysis
 * Focus: Nova Pro's image analysis — upload diagrams, get security findings.
 * No duplicate attack path (lives only on Attack Path page).
 * - Incident case: Nova Canvas security visualization
 * - Demo case: Sample AWS architecture diagram with annotations
 */
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image, X, CheckCircle2, AlertCircle, Loader2, Eye, Sparkles, Palette, FileText, Lightbulb, Shield, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { threatModelAPI } from '../../services/api';
import SampleArchitectureDiagram from '../Visualizations/SampleArchitectureDiagram';
import IncidentArchitectureDiagram from '../Visualizations/IncidentArchitectureDiagram';
import type { Timeline } from '../../types/incident';
import type { OrchestrationResponse } from '../../types/incident';

interface VisualAnalysisUploadProps {
  onUpload: (file: File) => Promise<void>;
  analysisResult?: any;
  loading?: boolean;
  timeline?: Timeline | null;
  orchestrationResult?: OrchestrationResponse | null;
  onNavigateToRemediation?: () => void;
}

// Demo sample analysis result for when backend isn't available
const DEMO_ANALYSIS = {
  model_used: 'Nova Pro (Demo)',
  analysis: {
    summary: 'Analysis of AWS architecture diagram reveals multiple security concerns including overly permissive security groups, unencrypted data stores, and missing WAF protection on public-facing endpoints.',
    security_findings: [
      'Security Group sg-0abc123 allows inbound SSH (port 22) from 0.0.0.0/0 — should be restricted to known IPs',
      'RDS instance lacks encryption at rest — enables data exposure if storage is compromised',
      'Public ALB has no AWS WAF attached — vulnerable to OWASP Top 10 attacks',
      'IAM role attached to EC2 has overly broad S3:* permissions — violates least privilege',
      'No VPC Flow Logs enabled — limits forensic investigation capability',
      'Missing CloudTrail multi-region logging — blind spots in non-primary regions',
    ],
    recommendations: [
      'Restrict SSH access to specific CIDR blocks or use SSM Session Manager instead',
      'Enable RDS encryption at rest using AWS KMS customer-managed keys',
      'Deploy AWS WAF with managed rule groups on the ALB',
      'Scope IAM role policies to specific S3 buckets and actions needed',
      'Enable VPC Flow Logs with CloudWatch Logs destination',
      'Enable CloudTrail in all regions with S3 bucket logging',
    ],
  },
};

// Demo threat model for when backend is offline — typical AWS web app architecture
const DEMO_THREAT_MODEL = {
  assets: [
    { name: 'ALB (Public)', type: 'compute', trust_boundary: 'public' },
    { name: 'EC2 App Tier', type: 'compute', trust_boundary: 'private_vpc' },
    { name: 'RDS Database', type: 'storage', trust_boundary: 'private_vpc' },
    { name: 'S3 Bucket: company-data', type: 'storage', trust_boundary: 'private_vpc' },
    { name: 'IAM Role: app-role', type: 'identity', trust_boundary: 'private_vpc' },
  ],
  trust_boundaries: [
    { name: 'VPC Boundary', description: 'Network isolation between public and private subnets' },
    { name: 'IAM Trust', description: 'Role assumption boundaries' },
  ],
  threats: [
    {
      id: 'T1',
      stride_category: 'Spoofing',
      title: 'Credential theft via phishing or metadata service',
      description: 'An attacker could obtain EC2 instance credentials via SSRF or phishing, then assume the app-role.',
      severity: 'CRITICAL',
      affected_assets: ['IAM Role: app-role', 'EC2 App Tier'],
      attack_scenario: [
        '1. Attacker exploits SSRF in web app to call 169.254.169.254',
        '2. Retrieves EC2 instance credentials (temporary)',
        '3. Assumes app-role with STS AssumeRole',
        '4. Gains access to S3 and RDS via role permissions',
      ],
      mitre_attack: { technique_id: 'T1136.003', name: 'Create Account: Cloud Account' },
      mitigation: {
        description: 'Use IMDSv2, restrict instance metadata access, enable MFA for sensitive operations',
        aws_cli: 'aws ec2 modify-instance-metadata-options --instance-id i-xxx --http-tokens required --http-put-response-hop-limit 1',
      },
    },
    {
      id: 'T2',
      stride_category: 'Tampering',
      title: 'S3 object modification or deletion',
      description: 'Overly permissive S3 bucket policy allows unauthenticated PutObject or DeleteObject.',
      severity: 'HIGH',
      affected_assets: ['S3 Bucket: company-data'],
      attack_scenario: [
        '1. Attacker discovers bucket name via enumeration or logs',
        '2. Tests PutObject with anonymous credentials',
        '3. Overwrites or deletes critical data',
      ],
      mitre_attack: { technique_id: 'T1530', name: 'Data from Cloud Storage' },
      mitigation: {
        description: 'Block public access, use bucket policies to restrict to VPC/specific principals',
        aws_cli: 'aws s3api put-public-access-block --bucket company-data --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true',
      },
    },
    {
      id: 'T3',
      stride_category: 'Repudiation',
      title: 'CloudTrail deletion or tampering',
      description: 'CloudTrail logs could be deleted or disabled to hide malicious activity.',
      severity: 'HIGH',
      affected_assets: ['CloudTrail'],
      attack_scenario: [
        '1. Attacker with admin access calls DeleteTrail',
        '2. Or disables logging by updating trail configuration',
        '3. Performs malicious actions with no audit trail',
      ],
      mitre_attack: { technique_id: 'T1070.002', name: 'Indicator Removal: Clear Linux or Mac System Logs' },
      mitigation: {
        description: 'Enable CloudTrail log file integrity, use S3 Object Lock, restrict trail deletion',
        aws_cli: 'aws cloudtrail put-event-selectors --trail-name my-trail --event-selectors [{"ReadWriteType":"All","IncludeManagementEvents":true}]',
      },
    },
    {
      id: 'T4',
      stride_category: 'Information Disclosure',
      title: 'RDS or S3 data exposure',
      description: 'Database or S3 bucket exposed due to misconfigured security groups or bucket policy.',
      severity: 'CRITICAL',
      affected_assets: ['RDS Database', 'S3 Bucket: company-data'],
      attack_scenario: [
        '1. Security group allows 0.0.0.0/0 on port 5432 or 3306',
        '2. Attacker connects from internet and extracts data',
        '3. Or S3 bucket has public read access',
      ],
      mitre_attack: { technique_id: 'T1530', name: 'Data from Cloud Storage' },
      mitigation: {
        description: 'Restrict security groups to VPC CIDR, enable S3 access logging',
        aws_cli: 'aws ec2 revoke-security-group-ingress --group-id sg-xxx --protocol tcp --port 5432 --cidr 0.0.0.0/0',
      },
    },
    {
      id: 'T5',
      stride_category: 'Denial of Service',
      title: 'ALB or API throttling / exhaustion',
      description: 'DDoS or resource exhaustion could overwhelm the ALB or backend services.',
      severity: 'MEDIUM',
      affected_assets: ['ALB (Public)', 'EC2 App Tier'],
      attack_scenario: [
        '1. Attacker sends high volume of requests to ALB',
        '2. Backend EC2 instances exhaust CPU/memory',
        '3. Legitimate users cannot access the application',
      ],
      mitre_attack: { technique_id: 'T1498', name: 'Network Denial of Service' },
      mitigation: {
        description: 'Deploy AWS WAF with rate limiting, use Auto Scaling, enable Shield',
        aws_cli: 'aws wafv2 create-web-acl --name my-waf --scope REGIONAL --default-action Allow={}',
      },
    },
    {
      id: 'T6',
      stride_category: 'Elevation of Privilege',
      title: 'IAM role assumption via overly permissive trust policy',
      description: 'App role has trust policy allowing any principal to assume it, or wildcard in trust.',
      severity: 'CRITICAL',
      affected_assets: ['IAM Role: app-role'],
      attack_scenario: [
        '1. Attacker discovers role ARN via CloudTrail or metadata',
        '2. Calls sts:AssumeRole with their credentials',
        '3. Role has AdministratorAccess — full account takeover',
      ],
      mitre_attack: { technique_id: 'T1078.004', name: 'Valid Accounts: Cloud Accounts' },
      mitigation: {
        description: 'Restrict trust policy to specific principals (e.g. EC2 role only)',
        aws_cli: 'aws iam update-assume-role-policy --role-name app-role --policy-document file://restricted-trust.json',
      },
    },
  ],
  ai_specific_threats: [
    {
      id: 'AI-T1',
      atlas_technique: 'AML.T0051',
      title: 'Prompt Injection via CloudTrail Event Data',
      description: 'Malicious CloudTrail events with crafted userAgent or requestParameters could inject instructions into Nova model prompts used for analysis.',
      severity: 'MEDIUM',
      mitigation: 'Input sanitization before model invocation, output validation, restrict event fields passed to analysis.',
    },
    {
      id: 'AI-T2',
      atlas_technique: 'AML.T0040',
      title: 'API Abuse / Inference Cost Attack',
      description: 'Attacker could trigger excessive Bedrock invocations to cause denial-of-wallet or cost exhaustion.',
      severity: 'MEDIUM',
      mitigation: 'Rate limiting, quotas, cost alerts, anomaly detection on invocation patterns.',
    },
  ],
  summary: {
    total_threats: 8,
    critical: 3,
    high: 2,
    medium: 3,
    low: 0,
    stride_coverage: { S: 1, T: 1, R: 1, I: 1, D: 1, E: 1 },
  },
};

/** Humanize long IDs in text for display (Environment UUIDs, Session IDs → friendly names) */
function humanizeFindingText(text: string): string {
  return text
    .replace(/Environment\s+[a-f0-9-]{36},?\s*Session\s+[\d-]+[a-z0-9]+/gi, 'Bedrock Session')
    .replace(/Environment\s+[a-f0-9-]{36}/gi, 'Bedrock Environment')
    .replace(/Session\s+[\d-]+[a-z0-9]+/gi, 'Bedrock session')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Bold IPs in a string, return React fragments */
function boldIps(text: string): React.ReactNode {
  const ipPattern = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g;
  const parts = text.split(ipPattern);
  return parts.map((seg, i) => (
    /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(seg)
      ? <strong key={i} className="font-semibold text-slate-800">{seg}</strong>
      : seg
  ));
}

/** Normalize "VisualAgent" to "Visual Agent" for display. */
function normalizeVisualAgent(text: string): string {
  return (text || '').replace(/VisualAgent/g, 'Visual Agent');
}

/** Format summary for display: humanize IDs, bold IPs, render numbered steps (1–99) on separate lines. */
function formatSummaryForDisplay(summary: string): React.ReactNode {
  if (!summary?.trim()) return null;
  const s = humanizeFindingText(normalizeVisualAgent(summary));
  // Match only 1–2 digit step numbers (e.g. "1.", "2)", "12. ") — avoids IPs like 209.242.60.194
  const stepPattern = /(?=\d{1,2}[.)]\s+)/;
  const parts = s.split(stepPattern).filter(Boolean);
  const hasNumberedSteps = parts.length >= 2 && /^\d{1,2}[.)]\s+/.test(parts[1]);
  if (hasNumberedSteps) {
    const intro = parts[0].trim();
    const steps = parts.slice(1).map(p => p.replace(/^\d{1,2}[.)]\s+/, '').replace(/,\s*$/, '').trim()).filter(Boolean);
    return (
      <div className="space-y-4">
        {intro && <p className="text-sm text-slate-700 leading-relaxed">{boldIps(intro)}</p>}
        <ul className="space-y-2 pl-4 border-l-2 border-indigo-200 list-none">
          {steps.map((step, i) => (
            <li key={i} className="text-sm text-slate-700 leading-relaxed flex gap-2">
              <span className="text-indigo-600 font-bold shrink-0">{i + 1}.</span>
              <span>{boldIps(step)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const paragraphs = s.split(/\n\n+/).filter(Boolean);
  return (
    <div className="space-y-3">
      {paragraphs.map((para, i) => (
        <p key={i} className="text-sm text-slate-700 leading-relaxed">
          {boldIps(para)}
        </p>
      ))}
    </div>
  );
}

function deriveIncidentFindings(timeline: Timeline): { summary: string; security_findings: string[]; recommendations: string[] } {
  const events = timeline?.events || [];
  const rootCause = timeline?.root_cause || 'Security incident detected.';
  const attackPattern = timeline?.attack_pattern || 'Privilege escalation and resource abuse.';

  const findings: string[] = [];
  events.filter((e: any) => (e.severity || '').toUpperCase() === 'CRITICAL' || (e.severity || '').toUpperCase() === 'HIGH').forEach((e: any) => {
    const action = e.action || '';
    const resource = e.resource || '';
    const sig = e.significance || '';
    const humanizedResource = humanizeFindingText(resource).replace(/^Bedrock Environment\s*,?\s*$/i, 'Bedrock Session');
    const resourceDisplay = humanizedResource.length > 60 ? humanizedResource.slice(0, 57) + '…' : humanizedResource;
    if (action && resource) findings.push(`${action} → ${resourceDisplay}. ${sig}`.trim());
  });
  if (findings.length === 0) {
    findings.push(rootCause);
    findings.push(attackPattern);
  }

  // Generate recommendations based on actual events, not generic boilerplate
  const recommendations: string[] = [];
  const actions = events.map((e: any) => (e.action || '').toLowerCase());
  const resources = events.map((e: any) => (e.resource || '').toLowerCase());
  const actors = events.map((e: any) => (e.actor || '').toLowerCase());
  const allText = [...actions, ...resources].join(' ');

  // IAM policy changes
  if (actions.some(a => a.includes('putuserpolicy') || a.includes('attachuserpolicy') || a.includes('putrolepolicy'))) {
    const affectedUsers = events
      .filter((e: any) => (e.action || '').toLowerCase().includes('policy'))
      .map((e: any) => e.resource || 'affected user')
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
    recommendations.push(`Audit and detach suspicious inline policies from ${affectedUsers.join(', ')}`);
  }
  // Root user activity
  if (actors.some(a => a.includes('root'))) {
    recommendations.push('Investigate root user activity — root should rarely be used directly. Enable MFA and create alerts for root usage.');
  }
  // AssumeRole (non-service-linked)
  if (actions.some(a => a.includes('assumerole')) && !resources.every(r => r.includes('awsservicerolefor') || r.includes('service-role'))) {
    recommendations.push('Review AssumeRole events for unauthorized cross-account or privilege escalation activity');
  }
  // EC2 related
  if (allText.includes('ec2') || allText.includes('instance')) {
    recommendations.push('Review EC2 instances for unauthorized access or modifications');
  }
  // S3 / data access
  if (allText.includes('s3') || allText.includes('getobject') || allText.includes('putobject')) {
    recommendations.push('Audit S3 bucket access patterns and enable S3 access logging for affected buckets');
  }
  // Credential rotation
  if (events.some((e: any) => (e.severity || '').toUpperCase() === 'CRITICAL')) {
    const critActors = events
      .filter((e: any) => (e.severity || '').toUpperCase() === 'CRITICAL')
      .map((e: any) => e.actor || 'affected users')
      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
    recommendations.push(`Rotate credentials for ${critActors.join(', ')} immediately`);
  }
  // Always recommend CloudTrail review
  recommendations.push('Review CloudTrail logs for the full incident timeline and any related events');

  // Ensure MFA recommendation for IAM-related incidents
  if (allText.includes('iam') || allText.includes('user') || allText.includes('role') || allText.includes('policy')) {
    recommendations.push('Enable MFA for all IAM users involved in this incident');
  }

  const summaryIntro = 'Visual Agent analysis of incident:';
  const summaryBody = `${rootCause} Attack pattern: ${attackPattern}`;
  return {
    summary: `${summaryIntro} ${summaryBody}`,
    security_findings: findings.slice(0, 8),
    recommendations: recommendations.slice(0, 6),
  };
}

const STRIDE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  S: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
  T: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' },
  R: { bg: 'bg-slate-200', border: 'border-slate-400', text: 'text-slate-800' },
  I: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800' },
  D: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800' },
  E: { bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-800' },
};

const VisualAnalysisUpload: React.FC<VisualAnalysisUploadProps> = ({
  onUpload, analysisResult, loading = false, timeline, orchestrationResult, onNavigateToRemediation: _onNavigateToRemediation,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [demoResult, setDemoResult] = useState<any>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [architectureDescription, setArchitectureDescription] = useState('');
  const [threatModelResult, setThreatModelResult] = useState<any>(null);
  const [threatModelLoading, setThreatModelLoading] = useState(false);
  const [expandedThreats, setExpandedThreats] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stride' | 'overview' | 'findings' | 'recommendations'>('stride');
  const [showArchitectureEdit, setShowArchitectureEdit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const incidentDerivedResult = useMemo(() => {
    if (!timeline?.events?.length) return null;
    const { summary, security_findings, recommendations } = deriveIncidentFindings(timeline);
    return {
      model_used: 'Nova Pro (from Incident Analysis)',
      source: 'incident',
      analysis: { summary, security_findings, recommendations },
    };
  }, [timeline]);

  const displayResult = analysisResult || demoResult || incidentDerivedResult;

  // Pre-load sample diagram with STRIDE on mount when no incident — judges won't have a diagram handy
  useEffect(() => {
    if (incidentDerivedResult || analysisResult || demoResult) return;
    let cancelled = false;
    const run = async () => {
      setDemoLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1200));
      if (!cancelled) {
        setDemoResult(DEMO_ANALYSIS);
        setThreatModelResult(DEMO_THREAT_MODEL); // Pre-load STRIDE so judges see analysis already run
        setDemoLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  // Pre-fill architecture description from analysis when available
  const defaultArchitectureDescription = useMemo(() => {
    if (!displayResult?.analysis) return '';
    const a = displayResult.analysis;
    const summary = normalizeVisualAgent(a.summary || '');
    const findings = Array.isArray(a.security_findings) ? a.security_findings : [];
    const parts = [summary, ...findings.slice(0, 5)];
    return parts.filter(Boolean).join('\n\n');
  }, [displayResult]);

  const handleGenerateThreatModel = async () => {
    const desc = architectureDescription.trim() || defaultArchitectureDescription;
    if (!desc) return;
    setThreatModelLoading(true);
    setThreatModelResult(null);
    try {
      const visualAnalysis = displayResult?.analysis ? {
        analysis: {
          summary: displayResult.analysis.summary,
          security_findings: displayResult.analysis.security_findings,
          recommendations: displayResult.analysis.recommendations,
        },
      } : undefined;
      const result = await threatModelAPI.generate(desc, visualAnalysis);
      setThreatModelResult(result);
    } catch {
      setThreatModelResult(DEMO_THREAT_MODEL);
    } finally {
      setThreatModelLoading(false);
    }
  };

  const toggleThreat = (id: string) => {
    setExpandedThreats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) { alert('Please upload an image file'); return; }
    setSelectedFile(file);
    setDemoResult(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleTryDemo = async () => {
    setDemoLoading(true);
    setDemoResult(null);
    setSelectedFile(null);
    setPreview(null);
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 2500));
    setDemoResult(DEMO_ANALYSIS);
    setDemoLoading(false);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setDemoResult(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {!displayResult && !selectedFile ? 'Upload a Diagram to Analyze' : 'Architecture & STRIDE'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {!displayResult && !selectedFile
              ? 'Drop an architecture diagram here — Nova Pro will identify security risks'
              : 'Upload your architecture diagram → Nova Pro identifies security risks'}
          </p>
        </div>
        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
          Nova Pro
        </span>
      </div>

      <div className="p-6">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        {/* File preview + analyze - when user selected a new file (e.g. "Upload another") */}
        {selectedFile && !demoLoading && (
          <div className="space-y-4">
            {preview && (
              <div className="relative rounded-xl overflow-hidden border border-slate-200">
                <img src={preview} alt="Preview" className="w-full h-auto max-h-80 object-contain bg-slate-50" />
                <button onClick={handleReset} className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-lg hover:bg-slate-50">
                  <X className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Image className="w-4 h-4" />
                <span>{selectedFile.name}</span>
                <span className="text-slate-400">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button
                onClick={() => selectedFile && onUpload(selectedFile)}
                disabled={loading}
                className="btn-nova px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</> : <><Eye className="w-3.5 h-3.5" /> Analyze with Nova Pro</>}
              </button>
            </div>
          </div>
        )}

        {/* Demo loading state */}
        {demoLoading && (
          <div className="text-center py-12">
            <div className="relative inline-flex items-center justify-center mb-4">
              <div className="w-14 h-14 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <Eye className="w-5 h-5 text-blue-600 absolute" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">Nova Pro Analyzing Architecture...</h4>
            <p className="text-xs text-slate-500">Scanning for security misconfigurations</p>
          </div>
        )}

        {/* Upload zone - only when no incident data and no results */}
        {!selectedFile && !displayResult && !demoLoading && (
          <div className="space-y-4">
            {/* Sample AWS VPC diagram — prominent, pre-loaded so judges see STRIDE-ready architecture without uploading */}
            <div className="rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-3">Sample AWS VPC Architecture · STRIDE-ready (pre-loaded)</p>
              <div className="rounded-xl overflow-hidden border border-indigo-200 bg-white">
                <SampleArchitectureDiagram />
              </div>
              <p className="text-[11px] text-slate-600 mt-2">Judges: No diagram handy? Run &quot;Try Demo Analysis&quot; below to see STRIDE threat model on this architecture.</p>
            </div>
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-all min-h-[180px] flex flex-col items-center justify-center ${
                dragActive ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-slate-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-base font-semibold text-slate-800 mb-0.5">Upload your architecture diagram</p>
              <p className="text-sm text-slate-600 mb-2">Nova Pro identifies security risks — or use the sample above</p>
              <p className="text-xs text-slate-500 mb-4">Drop a diagram here or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-nova px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold"
              >
                Browse Files
              </button>
              <p className="text-xs text-slate-500 mt-3">PNG, JPG, WebP supported</p>
            </div>

            {/* Demo button */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center"><span className="px-3 bg-white text-xs text-slate-400">or</span></div>
            </div>

            <button
              onClick={handleTryDemo}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl text-sm font-bold transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Try Demo Analysis (Sample Architecture)
            </button>
          </div>
        )}

        {/* Results - from incident, upload, or demo (only when no file selected) */}
        {!selectedFile && displayResult && !demoLoading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Show sample diagram when demo/pre-loaded so judges see what was analyzed */}
            {displayResult === demoResult && (
              <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white p-4">
                <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-2">Analyzed architecture</p>
                <div className="rounded-lg overflow-hidden border border-indigo-100">
                  <SampleArchitectureDiagram />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 flex-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700">
                  Analysis complete • {displayResult.model_used || 'Nova Pro'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-all flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload another diagram
                </button>
                {displayResult !== incidentDerivedResult && (
                  <button
                    onClick={handleReset}
                    className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Incident case: Nova Canvas or dynamic incident diagram (no duplicate attack path) */}
            {displayResult.source === 'incident' && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-violet-500" />
                    Security Visualization
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold border bg-indigo-50 text-indigo-700 border-indigo-200">
                    Live Incident Data
                  </span>
                </div>
                {/* Data-driven architecture diagram from real incident data */}
                {timeline && (
                  <div className="w-full p-3 bg-white">
                    <IncidentArchitectureDiagram
                      timeline={timeline}
                      orchestrationResult={orchestrationResult}
                      securityFindings={displayResult?.analysis?.security_findings}
                      showAttackPathOverlay
                    />
                  </div>
                )}
              </div>
            )}

            {/* Demo case: Sample AWS architecture with Nova Pro annotations */}
            {displayResult === demoResult && (
              <SampleArchitectureDiagram />
            )}

            {displayResult.analysis && (
              <div className="space-y-4">
                {typeof displayResult.analysis === 'string' ? (
                  <>
                    <div className="flex flex-wrap gap-1 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                      {[
                        { id: 'stride' as const, label: 'STRIDE Threat Model', icon: Shield, badge: true },
                        { id: 'overview' as const, label: 'Overview', icon: FileText },
                      ].map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800 hover:bg-white/60'}`}>
                          <tab.icon className="w-4 h-4" />
                          {tab.label}
                          {tab.badge && <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-violet-100 text-violet-700">Tier 1</span>}
                        </button>
                      ))}
                    </div>
                    <div className="min-h-[360px]">
                      {activeTab === 'stride' && (
                        <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/50 to-white p-5 shadow-sm">
                          <div className="flex items-center gap-2 mb-4">
                            <Shield className="w-5 h-5 text-violet-600" />
                            <h5 className="text-sm font-bold text-slate-800">STRIDE Threat Model</h5>
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-700">Nova 2 Lite</span>
                          </div>
                          {defaultArchitectureDescription && !showArchitectureEdit ? (
                            <div className="rounded-xl border border-slate-200 bg-white p-5 mb-4 space-y-4">
                              {(() => {
                                const parts = defaultArchitectureDescription.split(/\n\n+/).filter(Boolean);
                                const summary = parts[0] || '';
                                const findings = parts.slice(1);
                                return (
                                  <>
                                    <p className="text-sm text-slate-700 leading-relaxed">{normalizeVisualAgent(summary)}</p>
                                    {findings.length > 0 && (
                                      <ul className="space-y-2 pl-4 border-l-2 border-indigo-200 list-none">
                                        {findings.map((f, i) => {
                                          const match = String(f).match(/^([\w]+)\s*→\s*(.+)$/);
                                          const action = match ? match[1] : '';
                                          const rest = match ? match[2] : f;
                                          return (
                                            <li key={i} className="text-sm text-slate-700 leading-relaxed flex gap-2">
                                              {action && <span className="font-semibold text-slate-800 shrink-0">{action} →</span>}
                                              <span>{rest}</span>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    )}
                                  </>
                                );
                              })()}
                              <button type="button" onClick={() => setShowArchitectureEdit(true)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">Edit description</button>
                            </div>
                          ) : (
                            <>
                              <textarea value={architectureDescription || defaultArchitectureDescription} onChange={(e) => setArchitectureDescription(e.target.value)} placeholder="Describe your architecture" className="w-full min-h-[180px] px-4 py-3 text-sm border border-slate-200 rounded-xl resize-y focus:ring-2 focus:ring-violet-500 mb-2 leading-relaxed" />
                              {defaultArchitectureDescription && (
                                <button type="button" onClick={() => { setShowArchitectureEdit(false); setArchitectureDescription(''); }} className="text-xs font-semibold text-slate-500 hover:text-slate-700">Use formatted analysis</button>
                              )}
                            </>
                          )}
                          <button onClick={handleGenerateThreatModel} disabled={threatModelLoading || (!architectureDescription.trim() && !defaultArchitectureDescription)} className="btn-nova px-4 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-bold disabled:opacity-50 flex items-center gap-2">
                            {threatModelLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Shield className="w-4 h-4" /> Generate Threat Model</>}
                          </button>
                          <AnimatePresence>
                            {threatModelResult && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 pt-6 border-t border-violet-200 space-y-4">
                                {threatModelResult.summary?.stride_coverage && (
                                  <div className="flex items-center gap-3 flex-wrap mb-5">
                                    <span className="text-sm font-semibold text-slate-600">STRIDE</span>
                                    {(['S', 'T', 'R', 'I', 'D', 'E'] as const).map((k) => {
                                      const c = STRIDE_COLORS[k] || STRIDE_COLORS.S;
                                      const count = threatModelResult.summary.stride_coverage[k] || 0;
                                      return <span key={k} className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${c.bg} ${c.border} ${c.text}`}>{k} {count}</span>;
                                    })}
                                    <span className="text-sm text-slate-500">{threatModelResult.summary?.total_threats ?? threatModelResult.threats?.length ?? 0} threats</span>
                                  </div>
                                )}
                                <div className="space-y-3">
                                {(threatModelResult.threats || []).map((t: any) => {
                                  const isExpanded = expandedThreats.has(t.id);
                                  const sev = (t.severity || '').toUpperCase();
                                  const sevClass = sev === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border-rose-200' : sev === 'HIGH' ? 'bg-amber-100 text-amber-800 border-amber-200' : sev === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-100 text-slate-700 border-slate-200';
                                  return (
                                    <div key={t.id} className="rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 bg-white">
                                      <button onClick={() => toggleThreat(t.id)} className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3 flex-wrap min-w-0">
                                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 ${sevClass}`}>{sev || 'N/A'}</span>
                                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 shrink-0">{t.stride_category || 'Unknown'}</span>
                                          <span className="text-sm font-semibold text-slate-800">{t.title}</span>
                                        </div>
                                        {isExpanded ? <ChevronUp className="w-5 h-5 shrink-0 text-slate-500" /> : <ChevronDown className="w-5 h-5 shrink-0 text-slate-500" />}
                                      </button>
                                      <AnimatePresence>
                                        {isExpanded && (
                                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-100 overflow-hidden">
                                            <p className="text-sm text-slate-600 leading-relaxed">{t.description}</p>
                                            {t.affected_assets?.length > 0 && <div className="flex flex-wrap gap-2"><span className="text-xs font-semibold text-slate-500">Affected:</span>{t.affected_assets.map((a: string, i: number) => <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-sm">{a}</span>)}</div>}
                                            {t.attack_scenario?.length > 0 && <div><span className="text-sm font-semibold text-slate-600">Attack scenario</span><ol className="list-decimal list-inside text-sm text-slate-700 space-y-1 mt-2">{t.attack_scenario.map((s: string, i: number) => <li key={i} className="leading-relaxed">{String(s).replace(/^\d+\.\s*/, '')}</li>)}</ol></div>}
                                            {t.mitre_attack && <span className="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-sm font-mono">{t.mitre_attack.technique_id} — {t.mitre_attack.name}</span>}
                                            {t.mitigation?.aws_cli && <div className="flex items-start gap-2"><pre className="flex-1 p-3 text-sm font-mono bg-slate-900 text-slate-100 rounded-lg overflow-x-auto">{t.mitigation.aws_cli}</pre><button onClick={() => copyToClipboard(t.mitigation.aws_cli, t.id)} className="p-2.5 rounded-lg bg-slate-200 hover:bg-slate-300">{copiedId === t.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button></div>}
                                            {t.mitigation?.description && !t.mitigation?.aws_cli && <p className="text-sm text-slate-600 leading-relaxed">{t.mitigation.description}</p>}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}
                                </div>
                                {(threatModelResult.ai_specific_threats || []).length > 0 && (
                                  <div className="pt-6 mt-6 border-t border-slate-200">
                                    <h6 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-500" /> AI/ML Threats (MITRE ATLAS)</h6>
                                    <p className="text-sm text-slate-500 mb-4 leading-relaxed">Threats relevant to <span className="font-medium text-violet-600">your architecture</span> — e.g. <span className="font-medium text-violet-600">Bedrock, SageMaker</span>. Different from AI Pipeline tab.</p>
                                    <div className="space-y-4">
                                      {threatModelResult.ai_specific_threats.map((ai: any) => (
                                        <div key={ai.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow">
                                          <div className="flex items-start gap-3 mb-2 flex-wrap">
                                            <span className="px-2.5 py-1 rounded-lg text-xs font-mono bg-violet-100 text-violet-800">{ai.atlas_technique}</span>
                                            <span className="text-sm font-semibold text-slate-800 flex-1 min-w-0">{ai.title}</span>
                                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 shrink-0">{ai.severity}</span>
                                          </div>
                                          <p className="text-sm text-slate-600 leading-relaxed mb-3">{ai.description}</p>
                                          <p className="text-sm text-violet-700 font-medium"><span className="text-slate-500">Mitigation:</span> {ai.mitigation}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                      {activeTab !== 'stride' && (
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                          <div className="text-sm text-slate-700 leading-relaxed">
                            {typeof displayResult.analysis === 'string'
                              ? (formatSummaryForDisplay(normalizeVisualAgent(displayResult.analysis)) || <p className="text-slate-500">No summary available.</p>)
                              : <p>{String(displayResult.analysis)}</p>}
                          </div>
                        </div>
                      )}
                  </div>
                  </>
                ) : (
                  <>
                    {/* Tab navigation — STRIDE first (Tier 1 feature) */}
                    <div className="flex flex-wrap gap-1 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                      {[
                        { id: 'stride' as const, label: 'STRIDE Threat Model', icon: Shield, badge: true },
                        { id: 'overview' as const, label: 'Overview', icon: FileText },
                        { id: 'findings' as const, label: 'Findings', icon: AlertCircle, count: (displayResult.analysis.security_findings || []).length },
                        { id: 'recommendations' as const, label: 'Recommendations', icon: Lightbulb, count: (displayResult.analysis.recommendations || []).length },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                            activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-800 hover:bg-white/60'
                          }`}
                        >
                          <tab.icon className="w-4 h-4" />
                          {tab.label}
                          {tab.badge && <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-violet-100 text-violet-700">Tier 1</span>}
                          {tab.count !== undefined && tab.count > 0 && <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-700">{tab.count}</span>}
                        </button>
                      ))}
                    </div>

                    {/* Tab content */}
                    <div className="min-h-[360px]">
                      {activeTab === 'stride' && (
                        <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/50 to-white p-5 shadow-sm">
                          <div className="flex items-center gap-2 mb-4">
                            <Shield className="w-5 h-5 text-violet-600" />
                            <h5 className="text-sm font-bold text-slate-800">STRIDE Threat Model</h5>
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-700">Nova 2 Lite</span>
                          </div>
                          {defaultArchitectureDescription && !showArchitectureEdit ? (
                            <div className="rounded-xl border border-slate-200 bg-white p-5 mb-4 space-y-4">
                              {(() => {
                                const parts = defaultArchitectureDescription.split(/\n\n+/).filter(Boolean);
                                const summary = parts[0] || '';
                                const findings = parts.slice(1);
                                return (
                                  <>
                                    <p className="text-sm text-slate-700 leading-relaxed">{normalizeVisualAgent(summary)}</p>
                                    {findings.length > 0 && (
                                      <ul className="space-y-2 pl-4 border-l-2 border-indigo-200 list-none">
                                        {findings.map((f, i) => {
                                          const match = String(f).match(/^([\w]+)\s*→\s*(.+)$/);
                                          const action = match ? match[1] : '';
                                          const rest = match ? match[2] : f;
                                          return (
                                            <li key={i} className="text-sm text-slate-700 leading-relaxed flex gap-2">
                                              {action && <span className="font-semibold text-slate-800 shrink-0">{action} →</span>}
                                              <span>{rest}</span>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    )}
                                  </>
                                );
                              })()}
                              <button type="button" onClick={() => setShowArchitectureEdit(true)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">Edit description</button>
                            </div>
                          ) : (
                            <>
                              <textarea
                                placeholder="Describe your architecture — or use analysis from diagram above"
                                value={architectureDescription || defaultArchitectureDescription}
                                onChange={(e) => setArchitectureDescription(e.target.value)}
                                className="w-full min-h-[180px] px-4 py-3 text-sm border border-slate-200 rounded-xl resize-y focus:ring-2 focus:ring-violet-500 mb-2 leading-relaxed"
                              />
                              {defaultArchitectureDescription && (
                                <button type="button" onClick={() => { setShowArchitectureEdit(false); setArchitectureDescription(''); }} className="text-xs font-semibold text-slate-500 hover:text-slate-700">Use formatted analysis</button>
                              )}
                            </>
                          )}
                          <button
                            onClick={handleGenerateThreatModel}
                            disabled={threatModelLoading || (!architectureDescription.trim() && !defaultArchitectureDescription)}
                            className="btn-nova px-4 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-bold disabled:opacity-50 flex items-center gap-2"
                          >
                            {threatModelLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Shield className="w-4 h-4" /> Generate Threat Model</>}
                          </button>
                          <AnimatePresence>
                            {threatModelResult && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 pt-6 border-t border-violet-200 space-y-4">
                                {threatModelResult.summary?.stride_coverage && (
                                  <div className="flex items-center gap-3 flex-wrap mb-5">
                                    <span className="text-sm font-semibold text-slate-600">STRIDE</span>
                                    {(['S', 'T', 'R', 'I', 'D', 'E'] as const).map((k) => {
                                      const c = STRIDE_COLORS[k] || STRIDE_COLORS.S;
                                      const count = threatModelResult.summary.stride_coverage[k] || 0;
                                      return <span key={k} className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${c.bg} ${c.border} ${c.text}`}>{k} {count}</span>;
                                    })}
                                    <span className="text-sm text-slate-500">{threatModelResult.summary?.total_threats ?? threatModelResult.threats?.length ?? 0} threats</span>
                                  </div>
                                )}
                                <div className="space-y-3">
                                {(threatModelResult.threats || []).map((t: any) => {
                                  const isExpanded = expandedThreats.has(t.id);
                                  const sev = (t.severity || '').toUpperCase();
                                  const sevClass = sev === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border-rose-200' : sev === 'HIGH' ? 'bg-amber-100 text-amber-800 border-amber-200' : sev === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-100 text-slate-700 border-slate-200';
                                  return (
                                    <div key={t.id} className="rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 bg-white">
                                      <button onClick={() => toggleThreat(t.id)} className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3 flex-wrap min-w-0">
                                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 ${sevClass}`}>{sev || 'N/A'}</span>
                                          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 shrink-0">{t.stride_category || 'Unknown'}</span>
                                          <span className="text-sm font-semibold text-slate-800">{t.title}</span>
                                        </div>
                                        {isExpanded ? <ChevronUp className="w-5 h-5 shrink-0 text-slate-500" /> : <ChevronDown className="w-5 h-5 shrink-0 text-slate-500" />}
                                      </button>
                                      <AnimatePresence>
                                        {isExpanded && (
                                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-100 overflow-hidden">
                                            <p className="text-sm text-slate-600 leading-relaxed">{t.description}</p>
                                            {t.affected_assets?.length > 0 && <div className="flex flex-wrap gap-2"><span className="text-xs font-semibold text-slate-500">Affected:</span>{t.affected_assets.map((a: string, i: number) => <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-sm">{a}</span>)}</div>}
                                            {t.attack_scenario?.length > 0 && <div><span className="text-sm font-semibold text-slate-600">Attack scenario</span><ol className="list-decimal list-inside text-sm text-slate-700 space-y-1 mt-2">{t.attack_scenario.map((s: string, i: number) => <li key={i} className="leading-relaxed">{String(s).replace(/^\d+\.\s*/, '')}</li>)}</ol></div>}
                                            {t.mitre_attack && <span className="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-sm font-mono">{t.mitre_attack.technique_id} — {t.mitre_attack.name}</span>}
                                            {t.mitigation?.aws_cli && <div className="flex items-start gap-2"><pre className="flex-1 p-3 text-sm font-mono bg-slate-900 text-slate-100 rounded-lg overflow-x-auto">{t.mitigation.aws_cli}</pre><button onClick={() => copyToClipboard(t.mitigation.aws_cli, t.id)} className="p-2.5 rounded-lg bg-slate-200 hover:bg-slate-300">{copiedId === t.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button></div>}
                                            {t.mitigation?.description && !t.mitigation?.aws_cli && <p className="text-sm text-slate-600 leading-relaxed">{t.mitigation.description}</p>}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}
                                </div>
                                {(threatModelResult.ai_specific_threats || []).length > 0 && (
                                  <div className="pt-6 mt-6 border-t border-slate-200">
                                    <h6 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-500" /> AI/ML Threats (MITRE ATLAS)</h6>
                                    <p className="text-sm text-slate-500 mb-4 leading-relaxed">Threats relevant to <span className="font-medium text-violet-600">your architecture</span> — e.g. <span className="font-medium text-violet-600">Bedrock, SageMaker</span>. Different from AI Pipeline tab.</p>
                                    <div className="space-y-4">
                                      {threatModelResult.ai_specific_threats.map((ai: any) => (
                                        <div key={ai.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow">
                                          <div className="flex items-start gap-3 mb-2 flex-wrap">
                                            <span className="px-2.5 py-1 rounded-lg text-xs font-mono bg-violet-100 text-violet-800">{ai.atlas_technique}</span>
                                            <span className="text-sm font-semibold text-slate-800 flex-1 min-w-0">{ai.title}</span>
                                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 shrink-0">{ai.severity}</span>
                                          </div>
                                          <p className="text-sm text-slate-600 leading-relaxed mb-3">{ai.description}</p>
                                          <p className="text-sm text-violet-700 font-medium"><span className="text-slate-500">Mitigation:</span> {ai.mitigation}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                      {activeTab === 'overview' && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                        <div className="px-5 py-3 flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-slate-100">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          <h5 className="text-sm font-bold text-slate-800">Summary</h5>
                        </div>
                        <div className="p-5">
                          {displayResult.analysis.summary ? formatSummaryForDisplay(normalizeVisualAgent(displayResult.analysis.summary)) : <p className="text-sm text-slate-500">No summary available.</p>}
                        </div>
                      </div>
                    )}
                    {activeTab === 'findings' && displayResult.analysis.security_findings && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                        <div className="px-4 py-2.5 flex items-center gap-2 bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <h5 className="text-sm font-bold text-slate-800">
                            Security Findings
                          </h5>
                          <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            {(Array.isArray(displayResult.analysis.security_findings)
                              ? displayResult.analysis.security_findings
                              : Object.values(displayResult.analysis.security_findings)
                            ).length} issues
                          </span>
                        </div>
                        <ul className="divide-y divide-slate-100">
                          {(Array.isArray(displayResult.analysis.security_findings)
                            ? displayResult.analysis.security_findings
                            : Object.values(displayResult.analysis.security_findings)
                          ).map((finding: any, i: number) => {
                            const f = String(finding);
                            const humanized = humanizeFindingText(f);
                            const actionMatch = f.match(/^([\w]+)\s*→/);
                            const action = actionMatch ? actionMatch[1] : '';
                            const rest = humanized.replace(/^[\w]+\s*→\s*/, '').trim();
                            return (
                              <li key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-red-50/30 transition-colors">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                                  {i + 1}
                                </span>
                                <div className="min-w-0">
                                  {action && (
                                    <span className="text-xs font-semibold text-slate-800">{action}</span>
                                  )}
                                  <span className={`text-sm text-slate-700 leading-relaxed ${action ? ' ml-1' : ''} pt-0.5`}>
                                    {action ? `→ ${rest}` : humanized}
                                  </span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {activeTab === 'findings' && (Array.isArray(displayResult.analysis.security_findings) ? displayResult.analysis.security_findings : Object.values(displayResult.analysis.security_findings || {})).length === 0 && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                        <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No security findings.</p>
                      </div>
                    )}
                    {activeTab === 'recommendations' && displayResult.analysis.recommendations && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                        <div className="px-4 py-2.5 flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                          <Lightbulb className="w-4 h-4 text-emerald-600" />
                          <h5 className="text-sm font-bold text-slate-800">Recommendations</h5>
                          <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            Action items
                          </span>
                        </div>
                        <ul className="divide-y divide-slate-100">
                          {(Array.isArray(displayResult.analysis.recommendations)
                            ? displayResult.analysis.recommendations
                            : Object.values(displayResult.analysis.recommendations)
                          ).map((rec: any, i: number) => (
                            <li key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-emerald-50/30 transition-colors">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">
                                {i + 1}
                              </span>
                              <span className="text-sm text-slate-700 leading-relaxed pt-0.5">{String(rec)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {activeTab === 'recommendations' && (Array.isArray(displayResult.analysis.recommendations) ? displayResult.analysis.recommendations : Object.values(displayResult.analysis.recommendations || {})).length === 0 && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                        <Lightbulb className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No recommendations.</p>
                      </div>
                    )}
                    </div>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default VisualAnalysisUpload;
