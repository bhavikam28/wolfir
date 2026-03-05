/**
 * Report Export - Generate and download analysis reports
 * Markdown/PDF export with executive summary and Nova Canvas cover
 */
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Download, FileText, Printer, Copy, CheckCircle2,
  Clock, Shield, AlertTriangle, Target, ChevronDown, ChevronUp, Loader2, Image
} from 'lucide-react';
import type { Timeline, OrchestrationResponse } from '../../types/incident';
import { novaCanvasMCPAPI, reportAPI } from '../../services/api';

interface ReportExportProps {
  timeline: Timeline;
  orchestrationResult?: OrchestrationResponse | null;
  incidentId?: string;
  analysisTime?: number;
  remediationPlan?: any;
  incidentType?: string;
}

/** Convert markdown report to professional HTML for print/PDF (blue header like compliance report) */
function reportMarkdownToPrintHtml(markdown: string, incidentId?: string): string {
  const now = new Date().toLocaleString();
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = markdown.split('\n');
  const parts: string[] = [];
  parts.push(`<div class="report-header"><h1>Security Incident Report</h1><p>Generated ${now} | ${incidentId || 'Nova Sentinel'}</p></div>`);
  parts.push('<div class="report-body">');
  let inTable = false;
  let tableRows: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (!t && !inTable) { parts.push('<p>&nbsp;</p>'); continue; }
    if (t.startsWith('# ')) { parts.push(`<h1>${escape(t.slice(2))}</h1>`); continue; }
    if (t.startsWith('## ')) { parts.push(`<h2>${escape(t.slice(3))}</h2>`); continue; }
    if (t.startsWith('### ')) { parts.push(`<h3>${escape(t.slice(4))}</h3>`); continue; }
    if (t.startsWith('---')) { continue; }
    if (t.startsWith('|')) {
      const cells = t.split('|').filter(Boolean).map(c => escape(c.trim()));
      if (!inTable) { inTable = true; tableRows = []; }
      if (t.includes('---') || cells.every(c => /^-+$/.test(c))) { continue; }
      tableRows.push('<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>');
      continue;
    }
    if (inTable && tableRows.length > 0) {
      const header = tableRows[0];
      const body = tableRows.slice(1).join('');
      parts.push(`<table><thead>${header.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>')}</thead><tbody>${body}</tbody></table>`);
      tableRows = [];
      inTable = false;
    }
    if (t.startsWith('- ') || t.startsWith('* ')) { parts.push(`<ul><li>${escape(t.slice(2)).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</li></ul>`); continue; }
    parts.push(`<p>${escape(t).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</p>`);
  }
  if (inTable && tableRows.length > 0) {
    const header = tableRows[0];
    const body = tableRows.slice(1).join('');
    parts.push(`<table><thead>${header.replace(/<td>/g, '<th>').replace(/<\/td>/g, '</th>')}</thead><tbody>${body}</tbody></table>`);
  }
  parts.push('</div>');
  return parts.join('');
}

const REPORT_MODEL_ATTRIBUTION = `
---

## Model Attribution

This report was generated using the following Amazon Nova AI models:

| Model | Purpose |
|-------|---------|
| Amazon Nova Pro | Incident detection, visual diagram analysis |
| Amazon Nova 2 Lite | Temporal analysis, documentation generation |
| Amazon Nova Micro | Risk scoring and classification |
| Amazon Nova Canvas | Report cover and security visualizations |

*Nova Sentinel — AI-powered AWS security analysis. Infrastructure: MCP Server, Strands Agents Framework.*
`;

const ReportExport: React.FC<ReportExportProps> = ({
  timeline,
  orchestrationResult: _orchestrationResult,
  incidentId,
  analysisTime,
  remediationPlan,
  incidentType = 'Security Incident',
}) => {
  const [copied, setCopied] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const getSteps = () =>
    remediationPlan?.steps ||
    remediationPlan?.plan?.steps ||
    (Array.isArray(remediationPlan?.plan?.plan) ? remediationPlan.plan.plan : []) ||
    [];

  const generateMarkdownReport = useCallback(() => {
    const events = timeline?.events || [];
    const criticalCount = events.filter(e => (e.severity as string)?.toUpperCase() === 'CRITICAL').length;
    const highCount = events.filter(e => (e.severity as string)?.toUpperCase() === 'HIGH').length;
    const mediumCount = events.filter(e => (e.severity as string)?.toUpperCase() === 'MEDIUM').length;
    const lowCount = events.filter(e => (e.severity as string)?.toUpperCase() === 'LOW').length;
    const confidence = timeline?.confidence || 0;
    const steps = getSteps();

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return `# Security Incident Report

**Incident ID:** ${incidentId || 'N/A'}  
**Generated:** ${dateStr} at ${timeStr}  
**Analysis Time:** ${analysisTime ? `${(analysisTime / 1000).toFixed(1)} seconds` : 'N/A'}  
**AI Confidence:** ${(confidence * 100).toFixed(0)}%

---

## Executive Summary

### Root Cause
${timeline?.root_cause || 'Not determined'}

### Attack Pattern
${timeline?.attack_pattern || 'Not determined'}

### Blast Radius
${timeline?.blast_radius || 'Not determined'}

---

## Risk Distribution

| Severity | Count |
|----------|-------|
| Critical | ${criticalCount} |
| High | ${highCount} |
| Medium | ${mediumCount} |
| Low | ${lowCount} |

**Total Events:** ${events.length}

---

## Event Timeline

| # | Severity | Event | Actor | Resource | Time |
|---|----------|-------|-------|----------|------|
${events.slice(0, 20).map((e: any, i: number) => `| ${i + 1} | ${(e.severity as string)?.toUpperCase() || 'N/A'} | ${(e.event_name || e.action || 'Unknown').replace(/\|/g, '\\|')} | ${(e.actor || 'Unknown').replace(/\|/g, '\\|')} | ${(e.resource || 'Unknown').replace(/\|/g, '\\|')} | ${e.timestamp || 'N/A'} |`).join('\n')}
${events.length > 20 ? `\n*... and ${events.length - 20} more events*` : ''}

---

## Remediation Plan

${steps.length > 0 ? steps.map((s: any, i: number) => `### Step ${i + 1}: ${s.action || s.title || 'Unknown'}
- **Priority:** ${(s.priority || s.severity || 'MEDIUM').toUpperCase()}
- ${s.details || s.description || 'No details provided'}

`).join('') : '*No remediation plan generated yet.*'}

---

## Compliance Impact

**Frameworks Assessed:** CIS Benchmarks, NIST 800-53, SOC 2, PCI-DSS  
**Status:** See Compliance Mapping feature for detailed control mappings

---

## Cost Impact Estimate

See Cost Impact Estimation feature for detailed financial analysis including breach liability, downtime costs, and ROI calculation.
${REPORT_MODEL_ATTRIBUTION}
`;
  }, [timeline, incidentId, analysisTime, remediationPlan]);

  const generatePlainReport = useCallback(() => {
    const md = generateMarkdownReport();
    return md.replace(/#+/g, '').replace(/\|/g, ' ').replace(/-+/g, '─').replace(/\*\*/g, '');
  }, [generateMarkdownReport]);

  const reportMarkdown = generateMarkdownReport();

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = reportMarkdown;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([reportMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nova-sentinel-report-${incidentId || 'analysis'}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTxt = () => {
    const plain = generatePlainReport();
    const blob = new Blob([plain], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nova-sentinel-report-${incidentId || 'analysis'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const coverB64 = coverImage?.startsWith('data:') ? coverImage : coverImage ? `data:image/png;base64,${coverImage}` : null;
      const blob = await reportAPI.exportPdf(incidentId || 'analysis', reportMarkdown, coverB64);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nova-sentinel-report-${incidentId || 'analysis'}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: trigger print (user can save as PDF)
      handlePrintReport(!!coverImage, !coverImage);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleGenerateCover = async () => {
    setCoverLoading(true);
    setCoverImage(null);
    setCoverError(null);
    const timeoutMs = 15000;
    try {
      const res = await Promise.race([
        novaCanvasMCPAPI.generateReportCover(
          incidentType,
          'CRITICAL',
          incidentId || 'INC-000000'
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Nova Canvas timed out after 15s')), timeoutMs)
        ),
      ]);
      const img = res?.image_base64 ?? res?.image;
      if (img) {
        setCoverImage(img.startsWith('data:') ? img : `data:image/png;base64,${img}`);
      } else {
        setCoverError('No image returned. Ensure Nova Canvas MCP server is running.');
      }
    } catch (err: any) {
      setCoverImage(null);
      setCoverError(err?.message || err?.response?.data?.detail || 'Nova Canvas unavailable. Use "Print with Cover" above — it always works.');
    } finally {
      setCoverLoading(false);
    }
  };

  const builtInCoverHtml = () => {
    const d = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return `
      <div style="page-break-after:avoid;padding:48px 24px;text-align:center;border-bottom:2px solid #e2e8f0;margin-bottom:32px">
        <div style="width:64px;height:64px;margin:0 auto 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:28px">🛡️</div>
        <h1 style="font-size:24px;font-weight:700;color:#0f172a;margin:0 0 8px">Security Incident Report</h1>
        <p style="font-size:16px;font-weight:600;color:#6366f1;margin:0 0 4px">${incidentId || 'Nova Sentinel'}</p>
        <p style="font-size:12px;color:#64748b;margin:0">Generated ${d} · Nova Sentinel</p>
      </div>`;
  };

  const handlePrintReport = (includeCover: boolean = false, useBuiltInCover: boolean = false) => {
    const coverHtml =
      includeCover && coverImage
        ? `<div style="text-align:center;margin-bottom:24px;page-break-after:avoid"><img src="${coverImage}" alt="Report Cover" style="max-width:100%;max-height:280px;object-fit:contain" /><p style="color:#64748b;font-size:10px;margin-top:8px">Cover by Amazon Nova Canvas</p></div>`
        : includeCover && useBuiltInCover
          ? builtInCoverHtml()
          : '';
    const bodyHtml = reportMarkdownToPrintHtml(reportMarkdown, incidentId);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Security Incident Report — ${incidentId || 'Nova Sentinel'}</title>
            <style>
              body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; font-size: 13px; padding: 40px 60px; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 0 auto; }
              .report-header { background: #4f46e5; color: white; margin: -40px -60px 32px -60px; padding: 24px 60px 20px; }
              .report-header h1 { margin: 0; font-size: 22px; font-weight: 700; }
              .report-header p { margin: 6px 0 0; font-size: 11px; opacity: 0.95; }
              h2 { font-size: 16px; margin-top: 24px; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
              h3 { font-size: 14px; margin-top: 16px; color: #334155; }
              table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 12px; }
              th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
              th { background: #3730a3; color: white; font-weight: 600; }
              tr:nth-child(even) { background: #f8fafc; }
              ul { padding-left: 20px; margin: 8px 0; }
              .footer { font-size: 10px; color: #64748b; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
              @media print { body { padding: 20px; } .report-header { margin: -20px -20px 24px -20px; padding: 20px 20px 16px; } }
            </style>
          </head>
          <body>${coverHtml}${bodyHtml}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-5">
      {/* Export Options */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50/30">
          <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Export Analysis Report</h3>
            <p className="text-xs text-slate-500">Generate a comprehensive incident report for your team</p>
          </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Download Markdown (primary) */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadMarkdown}
            className="flex flex-col items-center justify-center gap-3 p-5 min-h-[140px] bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 group-hover:border-indigo-300 flex items-center justify-center transition-colors">
              <Download className="w-5 h-5 text-slate-600 group-hover:text-indigo-600 transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Download Report</p>
              <p className="text-[10px] text-slate-400">Save as .md (Markdown)</p>
            </div>
          </motion.button>

          {/* Download TXT */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadTxt}
            className="flex flex-col items-center justify-center gap-3 p-5 min-h-[140px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center transition-colors">
              <FileText className="w-5 h-5 text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900">Plain Text</p>
              <p className="text-[10px] text-slate-400">Save as .txt</p>
            </div>
          </motion.button>

          {/* Copy to Clipboard */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopyReport}
            className="flex flex-col items-center justify-center gap-3 p-5 min-h-[140px] bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 group-hover:border-emerald-300 flex items-center justify-center transition-colors">
              {copied ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <Copy className="w-5 h-5 text-slate-600 group-hover:text-emerald-600 transition-colors" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </p>
              <p className="text-[10px] text-slate-400">Paste into Slack, JIRA</p>
            </div>
          </motion.button>

          {/* Print / PDF with optional Nova Canvas cover */}
          <div className="flex flex-col gap-2 min-h-[140px]">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handlePrintReport(false)}
              className="flex flex-col items-center justify-center gap-3 p-4 bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-300 rounded-xl transition-all group flex-1 min-h-0"
            >
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 group-hover:border-violet-300 flex items-center justify-center transition-colors">
                <Printer className="w-5 h-5 text-slate-600 group-hover:text-violet-600 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-900 group-hover:text-violet-600 transition-colors">Print / Save PDF</p>
                <p className="text-[10px] text-slate-400">Opens print dialog</p>
              </div>
            </motion.button>
            <div className="space-y-1.5">
              <button
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-violet-300 bg-violet-100 text-violet-800 text-[11px] font-bold hover:bg-violet-200 transition-colors disabled:opacity-50"
              >
                {pdfLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                {pdfLoading ? 'Generating...' : 'Download PDF (Nova Canvas)'}
              </button>
              <button
                onClick={() => handlePrintReport(true, true)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-[11px] font-bold hover:bg-slate-100 transition-colors"
              >
                <FileText className="w-3 h-3" />
                Print with Cover
              </button>
              <button
                onClick={coverImage ? () => handlePrintReport(true, false) : handleGenerateCover}
                disabled={coverLoading}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-violet-200 bg-violet-50 text-violet-700 text-[11px] font-bold hover:bg-violet-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {coverLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Image className="w-3 h-3" />}
                {coverImage ? 'Print with Nova Canvas Cover' : coverLoading ? 'Generating...' : 'Nova Canvas cover (optional)'}
              </button>
              {coverError && (
                <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                  {coverError}
                </p>
              )}
              {coverImage && (
                <p className="text-[10px] text-emerald-600">Nova Canvas cover ready</p>
              )}
            </div>
          </div>
        </div>

        {/* Report Preview - expandable full report */}
        <div className="bg-slate-900 rounded-xl p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-mono">nova-sentinel-report.md</span>
              <button
                onClick={() => setPreviewExpanded(!previewExpanded)}
                className="text-[10px] text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1"
              >
                {previewExpanded ? <><ChevronUp className="w-3 h-3" /> Collapse</> : <><ChevronDown className="w-3 h-3" /> View Full Report</>}
              </button>
            </div>
          </div>
          <pre className={`text-[10px] text-slate-400 font-mono leading-relaxed overflow-x-auto scrollbar-thin ${previewExpanded ? 'max-h-[480px]' : 'max-h-60'}`}>
            {previewExpanded ? reportMarkdown : `# Security Incident Report

**Incident ID:** ${incidentId || 'N/A'}
**Analysis Time:** ${analysisTime ? `${(analysisTime / 1000).toFixed(1)}s` : 'N/A'}
**AI Confidence:** ${((timeline?.confidence || 0) * 100).toFixed(0)}%

## Executive Summary

### Root Cause
${(timeline?.root_cause || 'Not determined').slice(0, 200)}${(timeline?.root_cause?.length || 0) > 200 ? '...' : ''}

### Attack Pattern
${(timeline?.attack_pattern || 'Not determined').slice(0, 200)}${(timeline?.attack_pattern?.length || 0) > 200 ? '...' : ''}

### Blast Radius
${(timeline?.blast_radius || 'Not determined').slice(0, 150)}${(timeline?.blast_radius?.length || 0) > 150 ? '...' : ''}

...

[Expand to view full report with Risk Distribution, Event Timeline, Remediation Plan, and Model Attribution]`}
          </pre>
        </div>
        </div>
      </div>

      {/* Report Contents Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5">
        <h4 className="text-sm font-bold text-slate-900 mb-3">Report Includes</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Executive Summary', icon: FileText, check: true },
            { label: 'Risk Distribution', icon: AlertTriangle, check: true },
            { label: 'Event Timeline', icon: Clock, check: true },
            { label: 'Remediation Plan', icon: Shield, check: !!remediationPlan },
            { label: 'Compliance Impact', icon: Target, check: true },
            { label: 'Cost Estimation', icon: Target, check: true },
            { label: 'Attack Pattern', icon: Target, check: true },
            { label: 'Blast Radius', icon: Target, check: true },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
              <CheckCircle2 className={`w-3.5 h-3.5 ${item.check ? 'text-emerald-500' : 'text-slate-300'}`} />
              <span className={`text-[11px] font-medium ${item.check ? 'text-slate-700' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportExport;
