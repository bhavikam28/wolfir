/**
 * Visual Analysis Upload Component - Upload diagrams for Nova Pro analysis
 */
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Image, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface VisualAnalysisUploadProps {
  onUpload: (file: File) => Promise<void>;
  analysisResult?: any;
  loading?: boolean;
}

const VisualAnalysisUpload: React.FC<VisualAnalysisUploadProps> = ({
  onUpload,
  analysisResult,
  loading = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (selectedFile) {
      await onUpload(selectedFile);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Visual Architecture Analysis (Nova Pro)
      </h3>
      <p className="text-sm text-slate-600 mb-6">
        Upload an architecture diagram to analyze security configurations and detect misconfigurations.
      </p>

      {!selectedFile && !analysisResult && (
        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
            dragActive
              ? 'border-indigo-400 bg-indigo-50'
              : 'border-slate-300 bg-slate-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />
          <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-700 font-medium mb-2">
            Drag and drop an architecture diagram here
          </p>
          <p className="text-sm text-slate-500 mb-4">or</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Browse Files
          </button>
          <p className="text-xs text-slate-500 mt-4">
            Supports PNG, JPG, and other image formats
          </p>
        </div>
      )}

      {selectedFile && !analysisResult && (
        <div className="space-y-4">
          <div className="relative">
            {preview && (
              <div className="relative rounded-lg overflow-hidden border border-slate-200">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-auto max-h-96 object-contain"
                />
                <button
                  onClick={handleRemove}
                  className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-slate-50 transition-colors"
                >
                  <X className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image className="w-5 h-5 text-slate-500" />
                <span className="text-sm text-slate-700">{selectedFile.name}</span>
                <span className="text-xs text-slate-500">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <button
                onClick={handleUpload}
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Analyze Diagram
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {analysisResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-4"
        >
          {/* Success Header */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-green-900">Visual Analysis Complete</h4>
                <p className="text-sm text-green-700">
                  Analyzed in {analysisResult.analysis_time_ms ? `${(analysisResult.analysis_time_ms / 1000).toFixed(1)}s` : 'N/A'} using {analysisResult.model_used || 'Nova Pro'}
                </p>
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          {analysisResult.analysis && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              {typeof analysisResult.analysis === 'string' ? (
                <div className="prose prose-sm max-w-none">
                  <p className="text-slate-700 whitespace-pre-wrap">{analysisResult.analysis}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary */}
                  {analysisResult.analysis.summary && (
                    <div>
                      <h5 className="font-semibold text-slate-900 mb-2">Summary</h5>
                      <p className="text-sm text-slate-700">{analysisResult.analysis.summary}</p>
                    </div>
                  )}

                  {/* Security Findings */}
                  {analysisResult.analysis.security_findings && (
                    <div>
                      <h5 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        Security Findings
                      </h5>
                      <ul className="space-y-2">
                        {Array.isArray(analysisResult.analysis.security_findings)
                          ? analysisResult.analysis.security_findings.map((finding: string, i: number) => (
                              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                <span className="text-red-500 mt-1">•</span>
                                <span>{finding}</span>
                              </li>
                            ))
                          : Object.entries(analysisResult.analysis.security_findings).map(([key, value]) => (
                              <li key={key} className="text-sm text-slate-700">
                                <strong className="text-slate-900">{key}:</strong> {String(value)}
                              </li>
                            ))}
                      </ul>
                    </div>
                  )}

                  {/* Configuration Drift */}
                  {analysisResult.analysis.configuration_drift && (
                    <div>
                      <h5 className="font-semibold text-slate-900 mb-3">Configuration Drift</h5>
                      <ul className="space-y-2">
                        {Array.isArray(analysisResult.analysis.configuration_drift)
                          ? analysisResult.analysis.configuration_drift.map((drift: string, i: number) => (
                              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                <span className="text-amber-500 mt-1">•</span>
                                <span>{drift}</span>
                              </li>
                            ))
                          : Object.entries(analysisResult.analysis.configuration_drift).map(([key, value]) => (
                              <li key={key} className="text-sm text-slate-700">
                                <strong className="text-slate-900">{key}:</strong> {String(value)}
                              </li>
                            ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {analysisResult.analysis.recommendations && (
                    <div>
                      <h5 className="font-semibold text-slate-900 mb-3">Recommendations</h5>
                      <ul className="space-y-2">
                        {Array.isArray(analysisResult.analysis.recommendations)
                          ? analysisResult.analysis.recommendations.map((rec: string, i: number) => (
                              <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                <span className="text-blue-500 mt-1">•</span>
                                <span>{rec}</span>
                              </li>
                            ))
                          : Object.entries(analysisResult.analysis.recommendations).map(([key, value]) => (
                              <li key={key} className="text-sm text-slate-700">
                                <strong className="text-slate-900">{key}:</strong> {String(value)}
                              </li>
                            ))}
                      </ul>
                    </div>
                  )}

                  {/* Risk Level */}
                  {analysisResult.analysis.risk_level && (
                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-700">Overall Risk Level:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          analysisResult.analysis.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-700 border border-red-200' :
                          analysisResult.analysis.risk_level === 'HIGH' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                          analysisResult.analysis.risk_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                          'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {analysisResult.analysis.risk_level}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default VisualAnalysisUpload;
