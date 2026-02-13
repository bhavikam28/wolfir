/**
 * Documentation Display - JIRA, Slack, Confluence tabs with copy functionality
 * Auto-generates documentation from timeline/remediation when analysis completes.
 */
import React, { useMemo, useState, useCallback } from 'react';
import { FileText, MessageSquare, Book, Copy, CheckCircle2, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import type { Timeline } from '../../types/incident';

interface DocumentationDisplayProps {
  documentation?: {
    jira?: any;
    slack?: any;
    confluence?: any;
  } | null;
  incidentId: string;
  timeline?: Timeline | null;
  remediationPlan?: any;
  onGenerateDocumentation?: () => Promise<void>;
}

const DocumentationDisplay: React.FC<DocumentationDisplayProps> = ({
  documentation,
  incidentId,
  timeline,
  remediationPlan,
  onGenerateDocumentation,
}) => {
  const [activeTab, setActiveTab] = useState<'jira' | 'slack' | 'confluence'>('jira');
  const [copied, setCopied] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

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
        title: 'Security Alert',
        content: `🚨 *Security Incident* \`${incidentId}\`
Post to #security-incidents

*Root Cause:* ${rootCause.substring(0, 200)}${rootCause.length > 200 ? '...' : ''}
*Remediation:* ${steps.length || 0} steps
<https://nova-sentinel.app/incidents/${incidentId}|View in Nova Sentinel>`,
      },
      confluence: {
        title: `Incident Postmortem: ${incidentId}`,
        content: `= Incident Postmortem: ${incidentId} =

h3. Timeline
${events.slice(0, 8).map((e: any, i: number) => `${i + 1}. ${e.timestamp || ''} - ${e.action || 'Event'} (${e.severity || 'N/A'})`).join('\n') || 'No events'}

h3. Impact Analysis
*Blast Radius:* ${blastRadius}

h3. Lessons Learned
- Review least privilege for contractor/external roles
- Enforce MFA for sensitive operations
- Monitor security group changes`,
      },
    };
  }, [timeline, remediationPlan, incidentId]);

  const effectiveDoc = useMemo(() => {
    const apiDoc = documentation;
    const hasApiContent = (d: any) =>
      d && (d.content || d.description || d.message) && (d.content || d.description || d.message).trim().length > 0;
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
    { id: 'jira' as const, label: 'JIRA', icon: FileText, color: 'text-blue-600 border-blue-500' },
    { id: 'slack' as const, label: 'Slack', icon: MessageSquare, color: 'text-purple-600 border-purple-500' },
    { id: 'confluence' as const, label: 'Confluence', icon: Book, color: 'text-green-600 border-green-500' },
  ];

  const getContent = useCallback(() => {
    const doc = effectiveDoc[activeTab];
    if (!doc) return '';
    if (typeof doc === 'string') return doc;
    return doc.content || doc.description || doc.message || JSON.stringify(doc, null, 2);
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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Automated Documentation</h3>
          <p className="text-xs text-slate-500 mt-0.5">Generated by Nova 2 Lite</p>
        </div>
        <span className="px-2.5 py-1 bg-violet-50 text-violet-700 text-[10px] font-bold rounded-full border border-violet-200">
          Nova 2 Lite
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 px-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 flex items-center gap-2 text-xs font-bold transition-colors border-b-2 -mb-px ${
                isActive ? tab.color : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="p-6">
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

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 max-h-80 overflow-y-auto">
          <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
            {hasContent ? content : 'Documentation will appear here after analysis. Use "Generate Documentation" to create via Nova 2 Lite, or run a demo.'}
          </pre>
        </div>

        <div className="flex gap-2 pt-4 mt-4 border-t border-slate-100">
          <button className="btn-nova px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" />
            Open in {tabs.find(t => t.id === activeTab)?.label}
          </button>
          <button
            onClick={() => {
              if (!hasContent) return;
              const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `nova-sentinel-${activeTab}-${incidentId}-${new Date().toISOString().split('T')[0]}.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={!hasContent}
            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" /> Export Markdown
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentationDisplay;
