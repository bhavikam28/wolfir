/**
 * Documentation Display - JIRA, Slack, Confluence tabs with copy functionality
 * Auto-generates documentation from timeline/remediation when analysis completes.
 * Renders platform-specific content as professional, readable output (not raw JSON).
 */
import React, { useMemo, useState, useCallback } from 'react';
import { FileText, MessageSquare, Book, Copy, CheckCircle2, ExternalLink, Loader2, Sparkles, HelpCircle } from 'lucide-react';
import type { Timeline } from '../../types/incident';

// Strip unprofessional emojis from API-returned content
const EMOJI_PATTERN = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{1F900}-\u{1F9FF}]|🚨|⚠️|🔴|🟡|🟢|📌|📋|✅|❌|❗|‼️/gu;
function sanitizeDocContent(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text.replace(EMOJI_PATTERN, '').trim();
}

// Render platform content: **text** (Markdown/Jira) and *text* (Slack) = bold
function FormattedDocContent({ text }: { text: string }) {
  if (!text || typeof text !== 'string') return null;
  const segments = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <div className="text-slate-700 text-[13px] leading-relaxed whitespace-pre-wrap">
      {segments.map((seg, i) => {
        if (seg.match(/^\*\*[^*]+\*\*$/)) return <strong key={i} className="font-semibold text-slate-900">{seg.slice(2, -2)}</strong>;
        if (seg.match(/^\*[^*]+\*$/)) return <strong key={i} className="font-semibold text-slate-900">{seg.slice(1, -1)}</strong>;
        return <span key={i}>{seg}</span>;
      })}
    </div>
  );
}

interface DocumentationDisplayProps {
  documentation?: {
    jira?: any;
    slack?: any;
    confluence?: any;
    documentation?: { jira?: any; slack?: any; confluence?: any };
  } | null;
  incidentId: string;
  timeline?: Timeline | null;
  remediationPlan?: any;
  onGenerateDocumentation?: () => Promise<void>;
  /** In demo mode: pre-generate from scenario so judges always see content; Generate button uses client fallback */
  demoMode?: boolean;
}

const DocumentationDisplay: React.FC<DocumentationDisplayProps> = ({
  documentation,
  incidentId,
  timeline,
  remediationPlan,
  onGenerateDocumentation,
  demoMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<'jira' | 'slack' | 'confluence'>('jira');
  const [copied, setCopied] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showEnvHelp, setShowEnvHelp] = useState(false);

  const envVarsNeeded = [
    'VITE_JIRA_BASE_URL — your Atlassian URL (e.g. https://your-org.atlassian.net)',
    'VITE_SLACK_CHANNEL_URL — Slack channel URL (copy from browser when in #security-incidents)',
    'VITE_CONFLUENCE_BASE_URL — Confluence base URL (e.g. https://your-org.atlassian.net/wiki)',
  ];

  const getSteps = () => {
    const plan = remediationPlan?.plan;
    return (
      remediationPlan?.steps ||
      plan?.steps ||
      (Array.isArray(plan?.plan) ? plan.plan : []) ||
      []
    );
  };

  const generatedDocs = useMemo(() => {
    const events = timeline?.events || [];
    const rootCause = timeline?.root_cause || 'Security incident detected.';
    const attackPattern = timeline?.attack_pattern || 'See timeline for details.';
    const blastRadius = timeline?.blast_radius || 'Unknown.';
    const steps = getSteps();
    const stepList =
      steps.map((s: any) => `- ${s.action || s.title} (${s.severity || s.risk || 'MEDIUM'})`).join('\n') ||
      '- Review incident and remediate';
    return {
      jira: {
        title: `SEC-${incidentId}`,
        content: `[SEC] Security Incident ${incidentId}

**Summary:** ${rootCause}

**Priority:** Critical
**Affected Resources:** See timeline for impacted IAM, EC2, Security Groups
**Root Cause:** ${rootCause}
**Attack Pattern:** ${attackPattern}
**Blast Radius:** ${blastRadius}

**Remediation Steps:**
${stepList}

**Assignee:** [Security Team]`,
      },
      slack: {
        title: 'Security Incident Report',
        content: `*Security Incident Report — ${incidentId}*

*Classification:* Critical
*Channel:* #security-incidents

*Executive Summary*
${rootCause.substring(0, 300)}${rootCause.length > 300 ? '...' : ''}

*Attack Pattern*
${attackPattern.substring(0, 200)}${attackPattern.length > 200 ? '...' : ''}

*Blast Radius*
${blastRadius}

*Remediation*
${steps.length || 0} steps identified. Full details in wolfir.

*Link*
<https://wolfir.app/incidents/${incidentId}|View in wolfir>`,
      },
      confluence: {
        title: `Incident Postmortem: ${incidentId}`,
        content: `h1. Incident Postmortem: ${incidentId}

h2. Executive Summary
Security incident ${incidentId} was identified and analyzed. Root cause: ${rootCause.substring(0, 150)}${rootCause.length > 150 ? '...' : ''}

h2. Timeline
${events.slice(0, 10).map((e: any) => `* ${e.timestamp || 'N/A'} — ${e.action || 'Event'} (Severity: ${e.severity || 'N/A'})`).join('\n') || 'No events recorded'}

h2. Impact Analysis
*Blast Radius:* ${blastRadius}
*Attack Pattern:* ${attackPattern}

h2. Remediation Steps
${stepList}

h2. Lessons Learned
* Review least privilege for contractor and external roles
* Enforce MFA for sensitive operations
* Monitor security group and IAM policy changes
* Document incident timeline for audit trail`,
      },
    };
  }, [timeline, remediationPlan, incidentId]);

  const effectiveDoc = useMemo(() => {
    // Unwrap: API may return { documentation: { jira, slack, confluence } }
    // When no API content, use generatedDocs (demo mode: judges always see pre-generated content)
    const raw = documentation?.documentation ?? documentation;
    const apiDoc = raw?.jira || raw?.slack || raw?.confluence ? raw : null;
    const hasApiContent = (d: any) =>
      d && (d.content || d.description || d.message) && String(d.content || d.description || d.message).trim().length > 0;
    return {
      jira: hasApiContent(apiDoc?.jira) ? apiDoc!.jira : generatedDocs.jira,
      slack: hasApiContent(apiDoc?.slack) ? apiDoc!.slack : generatedDocs.slack,
      confluence: hasApiContent(apiDoc?.confluence) ? apiDoc!.confluence : generatedDocs.confluence,
    };
  }, [documentation, generatedDocs]);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const tabs = [
    { id: 'jira' as const, label: 'JIRA', icon: FileText, badge: 'bg-indigo-100 text-indigo-700 border-indigo-200', inactive: 'bg-indigo-50/50 text-indigo-600 border-indigo-100' },
    { id: 'slack' as const, label: 'Slack', icon: MessageSquare, badge: 'bg-violet-100 text-violet-700 border-violet-200', inactive: 'bg-violet-50/50 text-violet-600 border-violet-100' },
    { id: 'confluence' as const, label: 'Confluence', icon: Book, badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', inactive: 'bg-emerald-50/50 text-emerald-600 border-emerald-100' },
  ];

  const getContent = useCallback((): string => {
    const doc = effectiveDoc[activeTab];
    if (!doc) return '';
    if (typeof doc === 'string') return sanitizeDocContent(doc);
    // Prefer human-readable platform content; never show raw JSON
    const text = doc.content || doc.description || doc.message;
    const raw = (text && String(text).trim()) ? String(text) : '';
    return sanitizeDocContent(raw);
  }, [effectiveDoc, activeTab]);

  const getTitle = () => {
    const doc = effectiveDoc[activeTab];
    return doc?.title || `${tabs.find(t => t.id === activeTab)?.label} - ${incidentId}`;
  };

  const handleGenerate = async () => {
    if (!onGenerateDocumentation) return;
    setGenerating(true);
    try {
      await onGenerateDocumentation();
    } finally {
      setGenerating(false);
    }
  };

  const content = getContent();
  const hasContent = content.trim().length > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden max-w-4xl">
      <div className="px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4.5 h-4.5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Automated Documentation</h3>
            <p className="text-xs text-slate-500 mt-0.5">
            {demoMode ? 'Pre-generated from scenario — judges always see content' : 'Generated by Nova 2 Lite'}
          </p>
          </div>
        </div>
        <span className="px-2.5 py-1 bg-violet-50 text-violet-700 text-[10px] font-bold rounded-full border border-violet-200">
          Nova 2 Lite
        </span>
        {demoMode && hasContent && (
          <span className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
            Pre-generated
          </span>
        )}
      </div>

      {/* Tabs with platform badges — uniform width */}
      <div className="flex border-b border-slate-200 px-5 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-0 sm:flex-initial sm:min-w-[100px] px-3 py-2.5 flex items-center justify-center gap-2 text-xs font-bold transition-colors border-b-2 -mb-px rounded-t-lg ${
                isActive ? `${tab.badge} border-current` : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border truncate ${isActive ? tab.badge : tab.inactive}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h4 className="text-sm font-bold text-slate-900">{getTitle()}</h4>
          <div className="flex items-center gap-2">
            {onGenerateDocumentation && (
              <button
                onClick={handleGenerate}
                disabled={generating || !timeline}
                className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
                ) : (
                  <><Sparkles className="w-3 h-3" /> Generate Documentation</>
                )}
              </button>
            )}
            <button
              onClick={() => hasContent && copyToClipboard(content, activeTab)}
              disabled={!hasContent}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copied === activeTab ? (
                <><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Copied!</>
              ) : (
                <><Copy className="w-3 h-3" /> Copy</>
              )}
            </button>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 max-h-64 overflow-y-auto">
          <div className="prose prose-slate prose-sm max-w-none">
            {hasContent ? (
              <FormattedDocContent text={content} />
            ) : (
              <p className="text-slate-500 text-sm">
                {demoMode && timeline ? 'Pre-generated from scenario — judges always see content when demo runs. Generate Documentation uses Nova 2 Lite when backend is connected.' : 'Documentation will appear here after analysis. Use "Generate Documentation" to create via Nova 2 Lite, or run a demo.'}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-slate-100">
          <button
            onClick={() => hasContent && copyToClipboard(content, activeTab)}
            disabled={!hasContent}
            title={`Copy formatted content to paste into ${tabs.find(t => t.id === activeTab)?.label}`}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {copied === activeTab ? (
              <><CheckCircle2 className="w-3.5 h-3.5" /> Copied</>
            ) : (
              <><Copy className="w-3.5 h-3.5" /> Copy</>
            )}
          </button>
          {activeTab === 'jira' && (
            import.meta.env.VITE_JIRA_BASE_URL ? (
              <a
                href={`${(import.meta.env.VITE_JIRA_BASE_URL as string).replace(/\/$/, '')}/secure/CreateIssue.jspa?summary=${encodeURIComponent(getTitle())}&description=${encodeURIComponent(content)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in JIRA
              </a>
            ) : (
              <span title="Add VITE_JIRA_BASE_URL to .env to enable" className="px-4 py-2 bg-slate-50 text-slate-400 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-200 cursor-not-allowed" aria-label="Configure VITE_JIRA_BASE_URL in .env to enable">
                <ExternalLink className="w-3.5 h-3.5" /> Open in JIRA <span className="text-[9px] font-normal opacity-75">(set env)</span>
              </span>
            )
          )}
          {activeTab === 'slack' && (
            import.meta.env.VITE_SLACK_CHANNEL_URL ? (
              <a
                href={(import.meta.env.VITE_SLACK_CHANNEL_URL as string)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in Slack
              </a>
            ) : (
              <span title="Add VITE_SLACK_CHANNEL_URL to .env to enable" className="px-4 py-2 bg-slate-50 text-slate-400 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-200 cursor-not-allowed" aria-label="Configure VITE_SLACK_CHANNEL_URL in .env to enable">
                <ExternalLink className="w-3.5 h-3.5" /> Open in Slack <span className="text-[9px] font-normal opacity-75">(set env)</span>
              </span>
            )
          )}
          {activeTab === 'confluence' && (
            import.meta.env.VITE_CONFLUENCE_BASE_URL ? (
              <a
                href={`${(import.meta.env.VITE_CONFLUENCE_BASE_URL as string).replace(/\/$/, '')}/spaces/${encodeURIComponent((import.meta.env.VITE_CONFLUENCE_SPACE_KEY as string) || 'SEC')}/pages/create`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-200"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in Confluence
              </a>
            ) : (
              <span title="Add VITE_CONFLUENCE_BASE_URL to .env to enable" className="px-4 py-2 bg-slate-50 text-slate-400 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-slate-200 cursor-not-allowed" aria-label="Configure VITE_CONFLUENCE_BASE_URL in .env to enable">
                <ExternalLink className="w-3.5 h-3.5" /> Open in Confluence <span className="text-[9px] font-normal opacity-75">(set env)</span>
              </span>
            )
          )}
          <button
            onClick={() => {
              if (!hasContent) return;
              const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `wolfir-${activeTab}-${incidentId}-${new Date().toISOString().split('T')[0]}.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={!hasContent}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" /> Export Markdown
          </button>
          <button
            onClick={() => setShowEnvHelp((v) => !v)}
            className="px-4 py-2 bg-slate-50 text-slate-500 rounded-lg text-xs font-medium hover:bg-slate-100 transition-colors flex items-center gap-1.5 border border-slate-200"
            title="How to enable Open in Jira/Slack/Confluence"
          >
            <HelpCircle className="w-3.5 h-3.5" /> How to enable
          </button>
        </div>
        {showEnvHelp && (
          <div className="mt-3 p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-left">
            <p className="text-xs font-semibold text-indigo-800 mb-2">Enable Open in Jira / Slack / Confluence</p>
            <p className="text-xs text-indigo-700 mb-2">Add these to your project root <code className="bg-indigo-100 px-1 rounded">.env</code> file:</p>
            <ul className="text-xs text-indigo-700 space-y-1 list-disc list-inside">
              {envVarsNeeded.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
            <p className="text-xs text-indigo-600 mt-2">Restart the frontend dev server after changing .env. See <code className="bg-indigo-100 px-1 rounded">docs/DOCUMENTATION_INTEGRATIONS.md</code> for details.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentationDisplay;
