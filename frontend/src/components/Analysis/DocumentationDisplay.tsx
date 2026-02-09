/**
 * Documentation Display Component - Shows JIRA, Slack, and Confluence documentation
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, MessageSquare, Book, Copy, CheckCircle2, ExternalLink } from 'lucide-react';

interface DocumentationDisplayProps {
  documentation: {
    jira?: any;
    slack?: any;
    confluence?: any;
  };
  incidentId: string;
}

const DocumentationDisplay: React.FC<DocumentationDisplayProps> = ({ documentation, incidentId }) => {
  const [activeTab, setActiveTab] = useState<'jira' | 'slack' | 'confluence'>('jira');
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const tabs = [
    { id: 'jira' as const, label: 'JIRA Ticket', icon: FileText, color: 'blue' },
    { id: 'slack' as const, label: 'Slack Message', icon: MessageSquare, color: 'purple' },
    { id: 'confluence' as const, label: 'Confluence Page', icon: Book, color: 'green' },
  ];

  const getContent = () => {
    const doc = documentation[activeTab];
    if (!doc) return 'No documentation available';
    
    if (typeof doc === 'string') return doc;
    if (doc.content) return doc.content;
    if (doc.description) return doc.description;
    if (doc.message) return doc.message;
    return JSON.stringify(doc, null, 2);
  };

  const getTitle = () => {
    const doc = documentation[activeTab];
    if (!doc) return 'Documentation';
    if (doc.title) return doc.title;
    return `${tabs.find(t => t.id === activeTab)?.label} - ${incidentId}`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Automated Documentation
          </h3>
          <p className="text-sm text-slate-600">
            Generated documentation for JIRA, Slack, and Confluence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-200">
            Nova Act
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 flex items-center gap-2 font-medium text-sm transition-colors border-b-2 ${
                isActive
                  ? `border-${tab.color}-500 text-${tab.color}-600`
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-slate-900">{getTitle()}</h4>
          <button
            onClick={() => copyToClipboard(getContent(), activeTab)}
            className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            {copied === activeTab ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono overflow-x-auto">
            {getContent()}
          </pre>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-slate-200">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Open in {tabs.find(t => t.id === activeTab)?.label}
          </button>
          <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors">
            Export as Markdown
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentationDisplay;
