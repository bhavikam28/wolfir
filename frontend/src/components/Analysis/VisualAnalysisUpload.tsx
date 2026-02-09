/**
 * Visual Analysis Upload - Drag-and-drop + Demo Sample mode
 * Users can upload their own diagram or try with a built-in sample
 */
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Image, X, CheckCircle2, AlertCircle, Loader2, Eye, Sparkles } from 'lucide-react';

interface VisualAnalysisUploadProps {
  onUpload: (file: File) => Promise<void>;
  analysisResult?: any;
  loading?: boolean;
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

const VisualAnalysisUpload: React.FC<VisualAnalysisUploadProps> = ({
  onUpload, analysisResult, loading = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [demoResult, setDemoResult] = useState<any>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayResult = analysisResult || demoResult;

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
          <p className="text-xs text-slate-500 mt-0.5">Upload a diagram or try with a demo sample</p>
        </div>
        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200">
          Nova Pro
        </span>
      </div>

      <div className="p-6">
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

        {/* Upload zone */}
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
              <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" />
              <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700 mb-1">Drop a diagram here</p>
              <p className="text-xs text-slate-400 mb-4">or</p>
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

        {/* File preview + analyze */}
        {selectedFile && !displayResult && !demoLoading && (
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

        {/* Results */}
        {displayResult && !demoLoading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 flex-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700">
                  Analysis complete • {displayResult.model_used || 'Nova Pro'}
                </span>
              </div>
              <button
                onClick={handleReset}
                className="ml-3 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
              >
                New Analysis
              </button>
            </div>

            {displayResult.analysis && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 max-h-96 overflow-y-auto">
                {typeof displayResult.analysis === 'string' ? (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{displayResult.analysis}</p>
                ) : (
                  <>
                    {displayResult.analysis.summary && (
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 mb-1.5">Summary</h5>
                        <p className="text-xs text-slate-600 leading-relaxed">{displayResult.analysis.summary}</p>
                      </div>
                    )}
                    {displayResult.analysis.security_findings && (
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Security Findings ({
                            Array.isArray(displayResult.analysis.security_findings)
                              ? displayResult.analysis.security_findings.length
                              : Object.values(displayResult.analysis.security_findings).length
                          })
                        </h5>
                        <ul className="space-y-2">
                          {(Array.isArray(displayResult.analysis.security_findings)
                            ? displayResult.analysis.security_findings
                            : Object.values(displayResult.analysis.security_findings)
                          ).map((finding: any, i: number) => (
                            <li key={i} className="text-xs text-slate-600 flex items-start gap-2 p-2 bg-red-50/50 rounded-lg border border-red-100">
                              <span className="text-red-500 mt-0.5 font-bold">!</span>
                              <span className="leading-relaxed">{String(finding)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {displayResult.analysis.recommendations && (
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 mb-2">Recommendations</h5>
                        <ul className="space-y-2">
                          {(Array.isArray(displayResult.analysis.recommendations)
                            ? displayResult.analysis.recommendations
                            : Object.values(displayResult.analysis.recommendations)
                          ).map((rec: any, i: number) => (
                            <li key={i} className="text-xs text-slate-600 flex items-start gap-2 p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                              <span className="text-blue-500 mt-0.5 font-bold">→</span>
                              <span className="leading-relaxed">{String(rec)}</span>
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
