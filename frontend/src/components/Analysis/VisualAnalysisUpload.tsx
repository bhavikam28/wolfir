/**
 * Visual Analysis Upload - Multimodal architecture diagram analysis
 * Focus: Nova Pro's image analysis — upload diagrams, get security findings.
 * No duplicate attack path (lives only on Attack Path page).
 * - Incident case: Nova Canvas security visualization
 * - Demo case: Sample AWS architecture diagram with annotations
 */
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Image, X, CheckCircle2, AlertCircle, Loader2, Eye, Sparkles, Palette, FileText, Shield, Lightbulb } from 'lucide-react';
import SampleArchitectureDiagram from '../Visualizations/SampleArchitectureDiagram';
import IncidentArchitectureDiagram from '../Visualizations/IncidentArchitectureDiagram';
import { novaCanvasMCPAPI } from '../../services/api';
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

function deriveIncidentFindings(timeline: Timeline): { summary: string; security_findings: string[]; recommendations: string[] } {
  const events = timeline?.events || [];
  const rootCause = timeline?.root_cause || 'Security incident detected.';
  const attackPattern = timeline?.attack_pattern || 'Privilege escalation and resource abuse.';

  const findings: string[] = [];
  events.filter((e: any) => (e.severity || '').toUpperCase() === 'CRITICAL' || (e.severity || '').toUpperCase() === 'HIGH').forEach((e: any) => {
    const action = e.action || '';
    const resource = e.resource || '';
    const sig = e.significance || '';
    if (action && resource) findings.push(`${action} → ${resource}. ${sig}`.trim());
  });
  if (findings.length === 0) {
    findings.push(rootCause);
    findings.push(attackPattern);
  }

  const recommendations = [
    'Revoke compromised IAM sessions and detach AdministratorAccess immediately',
    'Terminate unauthorized EC2 instances and restore security group rules',
    'Enable MFA for all IAM users with privileged access',
    'Review CloudTrail for full attack timeline and affected resources',
  ];

  return {
    summary: `VisualAgent analysis of incident: ${rootCause} Attack pattern: ${attackPattern}`,
    security_findings: findings.slice(0, 8),
    recommendations,
  };
}

const VisualAnalysisUpload: React.FC<VisualAnalysisUploadProps> = ({
  onUpload, analysisResult, loading = false, timeline, orchestrationResult, onNavigateToRemediation,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [demoResult, setDemoResult] = useState<any>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [novaCanvasImage, setNovaCanvasImage] = useState<string | null>(null);
  const [novaCanvasLoading, setNovaCanvasLoading] = useState(false);
  const [novaCanvasError, setNovaCanvasError] = useState<string | null>(null);
  const [novaCanvasTimedOut, setNovaCanvasTimedOut] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const NOVA_CANVAS_TIMEOUT_MS = 20000;

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
  const hasIncidentData = !!timeline?.events?.length;

  // Generate Nova Canvas security visualization when incident analysis completes
  useEffect(() => {
    if (!hasIncidentData || !orchestrationResult) {
      setNovaCanvasImage(null);
      setNovaCanvasError(null);
      setNovaCanvasTimedOut(false);
      return;
    }
    let cancelled = false;
    setNovaCanvasTimedOut(false);
    const incidentType = orchestrationResult.metadata?.incident_type || 'Security Incident';
    const incidentId = orchestrationResult.incident_id || 'INC-000000';
    let severity = 'HIGH';
    const events = timeline?.events || [];
    for (const e of events) {
      const s = (e.severity || '').toUpperCase();
      if (s === 'CRITICAL') { severity = 'CRITICAL'; break; }
      if (s === 'HIGH' && severity !== 'CRITICAL') severity = 'HIGH';
    }
    setNovaCanvasLoading(true);
    setNovaCanvasError(null);

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Nova Canvas timed out')), NOVA_CANVAS_TIMEOUT_MS)
    );

    Promise.race([
      novaCanvasMCPAPI.generateReportCover(incidentType, severity, incidentId),
      timeoutPromise,
    ])
      .then((res: any) => {
        if (cancelled) return;
        if (res?.success && res?.images?.[0]) {
          const img = res.images[0];
          setNovaCanvasImage(img.startsWith('data:') ? img : `data:image/png;base64,${img}`);
        } else if (res?.image_base64) {
          setNovaCanvasImage(`data:image/png;base64,${res.image_base64}`);
        } else {
          setNovaCanvasError(res?.error || 'Could not generate visualization');
        }
      })
      .catch((err: any) => {
        if (cancelled) return;
        if (err?.message === 'Nova Canvas timed out') {
          setNovaCanvasTimedOut(true);
        } else {
          setNovaCanvasError(err?.response?.data?.detail || err?.message || 'Nova Canvas unavailable');
        }
      })
      .finally(() => {
        if (!cancelled) setNovaCanvasLoading(false);
      });
    return () => { cancelled = true; };
  }, [hasIncidentData, orchestrationResult?.incident_id, orchestrationResult?.metadata?.incident_type, timeline?.events]);

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
          <h3 className="text-base font-bold text-slate-900">Visual Architecture Analysis</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload your architecture diagram → Nova Pro identifies security risks
          </p>
        </div>
        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200">
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
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-slate-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700 mb-0.5">Upload your architecture diagram</p>
              <p className="text-xs text-slate-500 mb-2">Nova Pro identifies security risks</p>
              <p className="text-xs text-slate-400 mb-4">Drop a diagram here or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-nova px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold"
              >
                Browse Files
              </button>
              <p className="text-[10px] text-slate-400 mt-3">PNG, JPG, WebP supported</p>
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
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    (novaCanvasError || novaCanvasTimedOut) && !novaCanvasLoading
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-violet-50 text-violet-700 border-violet-200'
                  }`}>
                    {(novaCanvasError || novaCanvasTimedOut) && !novaCanvasLoading
                      ? 'Powered by Nova Pro Analysis'
                      : 'Powered by Nova Canvas'}
                  </span>
                </div>
                <div className="min-h-[280px] bg-slate-100 flex items-center justify-center">
                  {novaCanvasLoading && !novaCanvasTimedOut && (
                    <div className="text-center py-8">
                      <div className="w-10 h-10 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-xs text-slate-600">Generating security visualization...</p>
                      <p className="text-[10px] text-slate-400 mt-1">Takes ~15–20 seconds</p>
                    </div>
                  )}
                  {(novaCanvasError || novaCanvasTimedOut) && !novaCanvasLoading && timeline && (
                    <div className="w-full p-4">
                      <IncidentArchitectureDiagram
                        timeline={timeline}
                        orchestrationResult={orchestrationResult}
                        securityFindings={displayResult?.analysis?.security_findings}
                      />
                    </div>
                  )}
                  {novaCanvasImage && !novaCanvasLoading && (
                    <img src={novaCanvasImage} alt="Nova Canvas security visualization" className="w-full h-auto max-h-80 object-contain" />
                  )}
                </div>
              </div>
            )}

            {/* Demo case: Sample AWS architecture with Nova Pro annotations */}
            {displayResult === demoResult && (
              <SampleArchitectureDiagram />
            )}

            {displayResult.analysis && (
              <div className="space-y-4 max-h-[480px] overflow-y-auto">
                {typeof displayResult.analysis === 'string' ? (
                  <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                    <p className="text-sm text-slate-700 leading-relaxed">{displayResult.analysis}</p>
                  </div>
                ) : (
                  <>
                    {displayResult.analysis.summary && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 shadow-sm">
                        <div className="px-4 py-2.5 flex items-center gap-2 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border-b border-indigo-100">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          <h5 className="text-sm font-bold text-slate-800">Summary</h5>
                        </div>
                        <div className="p-4">
                          <p className="text-sm text-slate-700 leading-relaxed">{displayResult.analysis.summary}</p>
                        </div>
                      </div>
                    )}
                    {displayResult.analysis.security_findings && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                        <div className="px-4 py-2.5 flex items-center gap-2 bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-100">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <h5 className="text-sm font-bold text-slate-800">
                            Security Findings
                          </h5>
                          <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
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
                          ).map((finding: any, i: number) => (
                            <li key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-red-50/30 transition-colors">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-bold">
                                {i + 1}
                              </span>
                              <span className="text-sm text-slate-700 leading-relaxed pt-0.5">{String(finding)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {displayResult.analysis.recommendations && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                        <div className="px-4 py-2.5 flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                          <Lightbulb className="w-4 h-4 text-emerald-600" />
                          <h5 className="text-sm font-bold text-slate-800">Recommendations</h5>
                          <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            Action items
                          </span>
                        </div>
                        <ul className="divide-y divide-slate-100">
                          {(Array.isArray(displayResult.analysis.recommendations)
                            ? displayResult.analysis.recommendations
                            : Object.values(displayResult.analysis.recommendations)
                          ).map((rec: any, i: number) => (
                            <li key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-emerald-50/30 transition-colors">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">
                                {i + 1}
                              </span>
                              <span className="text-sm text-slate-700 leading-relaxed pt-0.5">{String(rec)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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
