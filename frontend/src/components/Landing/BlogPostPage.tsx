/**
 * Blog Post Page — Premium full-page article renderer
 * Renders rich markdown: headings, images, code blocks, blockquotes, tables, lists,
 * architecture diagrams ([ARCH: name]), and dashboard previews ([DASHBOARD: name])
 */
import React from 'react';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import type { BlogPost } from '../../data/blogsData';

// ─────────────────────────────────────────
// Inline renderer: **bold**, `code`, [link](url)
// ─────────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[([^\]]+)\]\(([^)]+)\))/g);
  const result: React.ReactNode[] = [];
  let i = 0;
  while (i < parts.length) {
    const part = parts[i];
    if (!part) { i++; continue; }
    if (part.startsWith('**') && part.endsWith('**')) {
      result.push(<strong key={i} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>);
    } else if (part.startsWith('`') && part.endsWith('`')) {
      result.push(
        <code key={i} className="px-1.5 py-0.5 rounded-md text-[0.88em] font-mono bg-slate-100 text-blue-700 border border-slate-200">
          {part.slice(1, -1)}
        </code>
      );
    } else if (part.startsWith('[') && part.includes('](')) {
      const lm = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (lm) {
        result.push(<a key={i} href={lm[2]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline underline-offset-2 hover:text-blue-800">{lm[1]}</a>);
      } else result.push(part);
    } else {
      result.push(part);
    }
    i++;
  }
  return result;
}

// ─────────────────────────────────────────
// Architecture Diagrams
// ─────────────────────────────────────────
const ARCH_DIAGRAMS: Record<string, React.ReactNode> = {
  pipeline: (
    <div className="my-10 rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="px-6 py-4 border-b border-slate-700/50 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-red-500/80" />
        <span className="w-3 h-3 rounded-full bg-amber-400/80" />
        <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
        <span className="ml-3 text-xs font-mono text-slate-400">wolfir · Multi-Agent Incident Response Pipeline</span>
      </div>
      <div className="px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 relative">
          {[
            { label: 'CloudTrail\nEvent', icon: '📥', color: 'from-slate-700 to-slate-800', border: 'border-slate-600', text: 'text-slate-300', note: 'Raw API events' },
            { label: 'Temporal\nAgent', icon: '🕐', color: 'from-violet-900 to-violet-800', border: 'border-violet-500/40', text: 'text-violet-200', note: 'Nova Pro', model: true },
            { label: 'Investigation\nAgent', icon: '🔍', color: 'from-blue-900 to-blue-800', border: 'border-blue-500/40', text: 'text-blue-200', note: 'Nova Pro', model: true },
            { label: 'Risk\nScorer', icon: '⚡', color: 'from-amber-900 to-amber-800', border: 'border-amber-500/40', text: 'text-amber-200', note: 'Nova Micro', model: true },
            { label: 'Remediation\nAgent', icon: '🛡️', color: 'from-red-900 to-red-800', border: 'border-red-500/40', text: 'text-red-200', note: 'Nova Pro', model: true },
            { label: 'Doc\nAgent', icon: '📄', color: 'from-emerald-900 to-emerald-800', border: 'border-emerald-500/40', text: 'text-emerald-200', note: 'Nova 2 Lite', model: true },
          ].map((node, idx, arr) => (
            <React.Fragment key={idx}>
              <div className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border bg-gradient-to-b ${node.color} ${node.border} min-w-[80px] text-center`}>
                <span className="text-2xl">{node.icon}</span>
                <span className={`text-[11px] font-bold whitespace-pre-line leading-tight ${node.text}`}>{node.label}</span>
                {node.model && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/60 font-mono">{node.note}</span>}
                {!node.model && <span className="text-[9px] text-slate-500">{node.note}</span>}
              </div>
              {idx < arr.length - 1 && (
                <div className="hidden sm:flex items-center gap-1 text-slate-500">
                  <div className="w-8 h-px bg-gradient-to-r from-slate-600 to-slate-500" />
                  <span className="text-slate-500">▶</span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-[11px] font-mono text-slate-400 text-center">Shared State: <span className="text-blue-400">IncidentState</span> · Strands SDK orchestration · MCP tool calling · WebSocket streaming</p>
        </div>
      </div>
    </div>
  ),

  mcp: (
    <div className="my-10 rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <div className="px-6 py-4 border-b border-slate-700/50 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-red-500/80" />
        <span className="w-3 h-3 rounded-full bg-amber-400/80" />
        <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
        <span className="ml-3 text-xs font-mono text-slate-400">wolfir · MCP Server Architecture (6 servers · 23 tools)</span>
      </div>
      <div className="px-6 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { name: 'CloudTrail MCP', tools: 5, icon: '📋', color: 'border-blue-500/30 bg-blue-900/20', badge: 'text-blue-400' },
            { name: 'IAM Analyzer MCP', tools: 4, icon: '🔐', color: 'border-violet-500/30 bg-violet-900/20', badge: 'text-violet-400' },
            { name: 'Security Hub MCP', tools: 3, icon: '🏛️', color: 'border-emerald-500/30 bg-emerald-900/20', badge: 'text-emerald-400' },
            { name: 'Remediation MCP', tools: 6, icon: '🛠️', color: 'border-red-500/30 bg-red-900/20', badge: 'text-red-400' },
            { name: 'AI Security MCP', tools: 3, icon: '🤖', color: 'border-amber-500/30 bg-amber-900/20', badge: 'text-amber-400' },
            { name: 'Compliance MCP', tools: 2, icon: '📊', color: 'border-cyan-500/30 bg-cyan-900/20', badge: 'text-cyan-400' },
          ].map((server) => (
            <div key={server.name} className={`p-3 rounded-xl border ${server.color}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{server.icon}</span>
                <p className="text-[11px] font-bold text-white leading-tight">{server.name}</p>
              </div>
              <span className={`text-[9px] font-mono ${server.badge}`}>{server.tools} tools</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-3 text-[10px] text-slate-500 font-mono">
          <span className="px-2 py-1 rounded bg-white/5 border border-white/10">Strands SDK</span>
          <span>→</span>
          <span className="px-2 py-1 rounded bg-white/5 border border-white/10">@tool decorator</span>
          <span>→</span>
          <span className="px-2 py-1 rounded bg-white/5 border border-white/10">Amazon Bedrock</span>
          <span>→</span>
          <span className="px-2 py-1 rounded bg-white/5 border border-white/10">AWS APIs</span>
        </div>
      </div>
    </div>
  ),

  'ai-security': (
    <div className="my-10 rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-gradient-to-br from-slate-900 via-red-950 to-slate-900">
      <div className="px-6 py-4 border-b border-slate-700/50 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-red-500/80" />
        <span className="w-3 h-3 rounded-full bg-amber-400/80" />
        <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
        <span className="ml-3 text-xs font-mono text-slate-400">wolfir · AI Security Monitoring Stack</span>
      </div>
      <div className="px-6 py-8">
        <div className="space-y-3">
          {[
            { layer: 'MITRE ATLAS Framework', desc: '13 tactics, 6 monitored techniques in wolfir', color: 'bg-red-900/30 border-red-500/30', badge: 'text-red-400' },
            { layer: 'OWASP LLM Top 10', desc: 'Prompt injection, insecure output, model DoS', color: 'bg-orange-900/30 border-orange-500/30', badge: 'text-orange-400' },
            { layer: 'Bedrock Guardrails', desc: 'Content filtering, PII redaction, denied topics', color: 'bg-amber-900/30 border-amber-500/30', badge: 'text-amber-400' },
            { layer: 'Nova Act Oversight', desc: 'Browser actions logged, confirmed before execution', color: 'bg-blue-900/30 border-blue-500/30', badge: 'text-blue-400' },
            { layer: 'Token Budget Manager', desc: 'Prevents runaway inference costs and context overflow', color: 'bg-violet-900/30 border-violet-500/30', badge: 'text-violet-400' },
          ].map((item, idx) => (
            <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl border ${item.color}`}>
              <span className={`text-xs font-bold font-mono mt-0.5 w-4 text-center ${item.badge}`}>{idx + 1}</span>
              <div>
                <p className="text-sm font-bold text-white">{item.layer}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),

  'dual-mode': (
    <div className="my-10 rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="px-6 py-4 border-b border-slate-700/50 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-red-500/80" />
        <span className="w-3 h-3 rounded-full bg-amber-400/80" />
        <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
        <span className="ml-3 text-xs font-mono text-slate-400">wolfir · Dual Mode Architecture</span>
      </div>
      <div className="px-6 py-8">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-900/15">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">Demo Mode</p>
            <ul className="space-y-1.5 text-xs text-slate-300 font-mono">
              {['Pre-computed scenarios', 'No AWS credentials', 'Instant response', '3 incident types', 'Full UI features'].map(item => (
                <li key={item} className="flex items-center gap-2"><span className="text-amber-400">◆</span>{item}</li>
              ))}
            </ul>
          </div>
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-900/15">
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">Console Mode (Real AWS)</p>
            <ul className="space-y-1.5 text-xs text-slate-300 font-mono">
              {['~/.aws/credentials', 'Live CloudTrail events', 'Real IAM analysis', 'Multi-region', 'Actual remediation'].map(item => (
                <li key={item} className="flex items-center gap-2"><span className="text-emerald-400">◆</span>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-4 p-3 rounded-xl bg-blue-900/20 border border-blue-500/20 text-center">
          <p className="text-[11px] font-mono text-blue-300">Unified API contract — same React components, same agent pipeline, same user experience</p>
        </div>
      </div>
    </div>
  ),

  'tech-stack': (
    <div className="my-10 rounded-2xl overflow-hidden border border-slate-200 shadow-lg bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
      <div className="px-6 py-4 border-b border-slate-700/50 flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-red-500/80" />
        <span className="w-3 h-3 rounded-full bg-amber-400/80" />
        <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
        <span className="ml-3 text-xs font-mono text-slate-400">wolfir · Full Technology Stack</span>
      </div>
      <div className="px-6 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { cat: 'AI Layer', items: ['Amazon Bedrock', 'Strands SDK', '7 Nova Capabilities', 'MCP Protocol'], color: 'border-blue-500/30 bg-blue-900/10', head: 'text-blue-400' },
            { cat: 'Backend', items: ['Python FastAPI', 'WebSockets', 'asyncio', 'Docker'], color: 'border-violet-500/30 bg-violet-900/10', head: 'text-violet-400' },
            { cat: 'Frontend', items: ['React + TypeScript', 'Framer Motion', 'Tailwind CSS', 'Recharts'], color: 'border-emerald-500/30 bg-emerald-900/10', head: 'text-emerald-400' },
            { cat: 'AWS Services', items: ['CloudTrail', 'IAM', 'Security Hub', 'DynamoDB'], color: 'border-amber-500/30 bg-amber-900/10', head: 'text-amber-400' },
          ].map((col) => (
            <div key={col.cat} className={`p-3 rounded-xl border ${col.color}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${col.head}`}>{col.cat}</p>
              {col.items.map(item => <p key={item} className="text-[11px] text-slate-400 py-0.5">{item}</p>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
};

// ─────────────────────────────────────────
// Dashboard Preview Blocks
// ─────────────────────────────────────────
function DashboardPreview({ name }: { name: string }) {
  const previews: Record<string, React.ReactNode> = {
    'security-posture': (
      <div className="bg-slate-900 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-white">Security Posture Overview</p>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">LIVE</span>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[{ label: 'Incidents', val: '3', color: 'text-red-400' }, { label: 'Resolved', val: '12', color: 'text-emerald-400' }, { label: 'Risk Score', val: '72', color: 'text-amber-400' }, { label: 'Controls', val: '94%', color: 'text-blue-400' }].map(s => (
            <div key={s.label} className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
              <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-[10px] text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {[{ label: 'IAM Privilege Escalation', sev: 'CRITICAL', pct: 85 }, { label: 'CloudTrail Disabled', sev: 'HIGH', pct: 62 }, { label: 'S3 Public Bucket', sev: 'MEDIUM', pct: 40 }].map(item => (
            <div key={item.label} className="flex items-center gap-3">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded w-16 text-center ${item.sev === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : item.sev === 'HIGH' ? 'bg-orange-500/20 text-orange-400' : 'bg-amber-500/20 text-amber-400'}`}>{item.sev}</span>
              <p className="text-xs text-slate-400 flex-1">{item.label}</p>
              <div className="w-24 bg-slate-800 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    'remediation': (
      <div className="bg-slate-900 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-white">Remediation Plan — IAM Privilege Escalation</p>
          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">Nova Pro</span>
        </div>
        <div className="space-y-2.5">
          {[
            { step: 1, action: 'Revoke AdministratorAccess policy from compromised role', cls: 'APPROVAL', done: true },
            { step: 2, action: 'Enable CloudTrail log file validation', cls: 'AUTO', done: true },
            { step: 3, action: 'Apply permissions boundary to limit blast radius', cls: 'APPROVAL', done: false },
            { step: 4, action: 'Enable GuardDuty with all data sources', cls: 'AUTO', done: false },
          ].map(item => (
            <div key={item.step} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5 ${item.done ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`}>{item.done ? '✓' : item.step}</div>
              <p className="text-xs text-slate-300 flex-1">{item.action}</p>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${item.cls === 'AUTO' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>{item.cls}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 p-2.5 rounded-lg bg-slate-800 border border-slate-700">
          <code className="text-[10px] font-mono text-green-400">aws iam detach-role-policy --role-name CompromisedRole --policy-arn arn:aws:iam::aws:policy/AdministratorAccess</code>
        </div>
      </div>
    ),
  };
  return (
    <figure className="my-10 rounded-2xl overflow-hidden border border-slate-200 shadow-xl">
      <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2 border-b border-slate-700">
        <span className="w-3 h-3 rounded-full bg-red-500/80" />
        <span className="w-3 h-3 rounded-full bg-amber-400/80" />
        <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
        <span className="ml-3 text-xs text-slate-400">wolfir Dashboard</span>
      </div>
      <div className="bg-slate-950 p-4">
        {previews[name] || (
          <div className="py-12 text-center text-slate-500 text-sm">Dashboard preview: {name}</div>
        )}
      </div>
      <figcaption className="text-center text-sm text-slate-400 italic py-3 bg-slate-50 border-t border-slate-100">
        wolfir dashboard — {name.replace(/-/g, ' ')} view
      </figcaption>
    </figure>
  );
}

// ─────────────────────────────────────────
// Gradient Blog Banner
// ─────────────────────────────────────────
const TAG_GRADIENTS: Record<string, string> = {
  'Amazon Nova':       'from-blue-600 via-violet-600 to-blue-800',
  'Architecture':      'from-slate-700 via-blue-800 to-slate-900',
  'Security':          'from-red-700 via-rose-800 to-slate-900',
  'MITRE ATLAS':       'from-red-800 via-rose-900 to-slate-900',
  'AI Security':       'from-violet-700 via-purple-800 to-slate-900',
  'Strands Agents':    'from-emerald-700 via-teal-800 to-slate-900',
  'Engineering':       'from-slate-600 via-slate-800 to-slate-900',
  'AWS':               'from-orange-600 via-amber-700 to-slate-900',
  'Agentic AI':        'from-indigo-600 via-blue-800 to-slate-900',
  'Amazon Bedrock':    'from-blue-700 via-blue-900 to-slate-900',
  'Demo Mode':         'from-cyan-700 via-blue-800 to-slate-900',
  'Autonomous':        'from-violet-700 via-indigo-800 to-slate-900',
  'Challenges':        'from-slate-700 via-red-900 to-slate-900',
};

function getBlogGradient(tags?: string[]): string {
  if (!tags || tags.length === 0) return 'from-blue-700 via-indigo-800 to-slate-900';
  for (const tag of tags) {
    if (TAG_GRADIENTS[tag]) return TAG_GRADIENTS[tag];
  }
  return 'from-blue-700 via-indigo-800 to-slate-900';
}

// ─────────────────────────────────────────
// Main markdown renderer
// ─────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  const blocks = text.split(/\n\n+/);
  const result: React.ReactNode[] = [];
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i].trim();
    const key = `block-${i}`;

    if (!block) { i++; continue; }

    // [ARCH: name] — architecture diagram
    const archMatch = block.match(/^\[ARCH:\s*([^\]]+)\]$/);
    if (archMatch) {
      const name = archMatch[1].trim();
      result.push(
        <React.Fragment key={key}>
          {ARCH_DIAGRAMS[name] || (
            <div className="my-10 p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-400 text-sm">
              Architecture diagram: {name}
            </div>
          )}
          <figcaption className="text-center text-sm text-slate-400 italic -mt-6 mb-10">
            {name === 'pipeline' && 'The wolfir 5-stage multi-agent incident response pipeline'}
            {name === 'mcp' && 'wolfir MCP server architecture — 6 servers, 23 tools'}
            {name === 'ai-security' && 'wolfir AI security monitoring stack — MITRE ATLAS + OWASP LLM Top 10'}
            {name === 'dual-mode' && 'wolfir dual-mode architecture — Demo vs. Console'}
            {name === 'tech-stack' && 'wolfir full technology stack'}
          </figcaption>
        </React.Fragment>
      );
      i++; continue;
    }

    // [DASHBOARD: name] — dashboard preview
    const dashMatch = block.match(/^\[DASHBOARD:\s*([^\]]+)\]$/);
    if (dashMatch) {
      result.push(<DashboardPreview key={key} name={dashMatch[1].trim()} />);
      i++; continue;
    }

    // Image: ![alt](url "caption") or ![alt](url)
    // Fix: url cannot contain whitespace or quotes; caption is optional inside parens
    const imgMatch = block.match(/^!\[([^\]]*)\]\(([^\s"()]+)(?:\s+"([^"]*)")?\)$/);
    if (imgMatch) {
      const [, alt, src, caption] = imgMatch;
      result.push(
        <figure key={key} className="my-10">
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
            <img src={src} alt={alt} className="w-full h-auto object-cover" loading="lazy" />
          </div>
          {(caption || alt) && (
            <figcaption className="mt-3 text-center text-sm text-slate-400 italic">
              {caption || alt}
            </figcaption>
          )}
        </figure>
      );
      i++; continue;
    }

    // H2
    if (block.startsWith('## ')) {
      result.push(
        <h2 key={key} className="text-2xl sm:text-3xl font-bold text-slate-900 mt-14 mb-5 tracking-tight leading-snug border-b border-slate-100 pb-3">
          {renderInline(block.slice(3))}
        </h2>
      );
      i++; continue;
    }

    // H3
    if (block.startsWith('### ')) {
      result.push(
        <h3 key={key} className="text-xl font-bold text-slate-900 mt-10 mb-4 tracking-tight">
          {renderInline(block.slice(4))}
        </h3>
      );
      i++; continue;
    }

    // H4
    if (block.startsWith('#### ')) {
      result.push(
        <h4 key={key} className="text-lg font-semibold text-slate-800 mt-8 mb-3">
          {renderInline(block.slice(5))}
        </h4>
      );
      i++; continue;
    }

    // Blockquote
    if (block.startsWith('> ')) {
      const lines = block.split('\n').map((l) => l.replace(/^> ?/, ''));
      result.push(
        <blockquote key={key} className="my-8 pl-5 border-l-4 border-blue-500 bg-blue-50/60 rounded-r-xl py-4 pr-5">
          {lines.map((line, j) => (
            <p key={j} className="text-slate-700 leading-relaxed text-base font-medium italic">
              {renderInline(line)}
            </p>
          ))}
        </blockquote>
      );
      i++; continue;
    }

    // Code block (``` ... ```)
    if (block.startsWith('```')) {
      const lines = block.split('\n');
      const lang = lines[0].replace('```', '').trim();
      const endIdx = lines.slice(1).findIndex(l => l.trim() === '```');
      const code = endIdx >= 0 ? lines.slice(1, endIdx + 1).join('\n') : lines.slice(1).join('\n');
      result.push(
        <div key={key} className="my-8 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
          <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
            <div className="w-3 h-3 rounded-full bg-green-400/80" />
            {lang && <span className="ml-2 text-xs font-mono text-slate-400">{lang}</span>}
          </div>
          <pre className="bg-slate-900 text-green-300 text-sm font-mono p-5 overflow-x-auto leading-relaxed">
            <code>{code}</code>
          </pre>
        </div>
      );
      i++; continue;
    }

    // Horizontal rule
    if (block === '---' || block === '***' || block === '___') {
      result.push(
        <hr key={key} className="my-12 border-none h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      );
      i++; continue;
    }

    // Table (| col | col |)
    if (block.includes('|') && block.split('\n').length >= 2 && block.split('\n').every((l) => l.includes('|'))) {
      const rows = block.split('\n').filter((l) => !l.match(/^\|[-| :]+\|$/));
      const headers = rows[0]?.split('|').filter(Boolean).map((c) => c.trim()) ?? [];
      const dataRows = rows.slice(1);
      result.push(
        <div key={key} className="my-8 overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {headers.map((h, j) => (
                  <th key={j} className="px-4 py-3 text-left font-bold text-slate-700 text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, rIdx) => {
                const cells = row.split('|').filter(Boolean).map((c) => c.trim());
                return (
                  <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    {cells.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-3 text-slate-600 border-b border-slate-100">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      i++; continue;
    }

    // Unordered list
    if (block.startsWith('- ') || block.startsWith('* ')) {
      const items = block.split('\n').filter(Boolean).map((line) => line.replace(/^[-*]\s+/, ''));
      result.push(
        <ul key={key} className="my-6 space-y-2.5 ml-1">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-3 text-slate-600 text-[1.05rem] leading-relaxed">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      i++; continue;
    }

    // Ordered list
    if (block.match(/^\d+\. /)) {
      const items = block.split(/\n(?=\d+\. )/).filter(Boolean).map((item) => item.replace(/^\d+\.\s*/, ''));
      result.push(
        <ol key={key} className="my-6 space-y-2.5 ml-1">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-3 text-slate-600 text-[1.05rem] leading-relaxed">
              <span className="mt-0.5 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {j + 1}
              </span>
              <span className="flex-1">{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      i++; continue;
    }

    // Callout box: [!NOTE], [!TIP], [!IMPORTANT], [!WARNING]
    if (block.startsWith('[!')) {
      const typeMatch = block.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING)\]/);
      const type = typeMatch?.[1] ?? 'NOTE';
      const content = block.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING)\]\n?/, '');
      const colors: Record<string, string> = {
        NOTE: 'bg-blue-50 border-blue-300 text-blue-800',
        TIP: 'bg-emerald-50 border-emerald-300 text-emerald-800',
        IMPORTANT: 'bg-purple-50 border-purple-300 text-purple-800',
        WARNING: 'bg-amber-50 border-amber-300 text-amber-800',
      };
      result.push(
        <div key={key} className={`my-8 p-5 rounded-xl border-l-4 ${colors[type]}`}>
          <p className="font-bold text-xs uppercase tracking-widest mb-2 opacity-70">{type}</p>
          <p className="text-sm leading-relaxed">{renderInline(content)}</p>
        </div>
      );
      i++; continue;
    }

    // Regular paragraph
    if (block) {
      result.push(
        <p key={key} className="text-slate-600 text-[1.08rem] leading-[1.85] my-5">
          {renderInline(block)}
        </p>
      );
    }
    i++;
  }

  return result;
}

// ─────────────────────────────────────────
// Blog Post Page Component
// ─────────────────────────────────────────
interface BlogPostPageProps {
  post: BlogPost;
  onBack: () => void;
}

const BlogPostPage: React.FC<BlogPostPageProps> = ({ post, onBack }) => {
  const gradient = getBlogGradient(post.tags);
  const hasBannerImage = !!post.image;

  return (
    <div className="min-h-screen bg-white">

      {/* Hero Banner — image bg if available, else gradient */}
      <div className={`relative overflow-hidden ${hasBannerImage ? '' : `bg-gradient-to-br ${gradient}`}`}>
        {/* Banner image with dark overlay */}
        {hasBannerImage && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${post.image})` }}
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(2,6,23,0.88) 0%, rgba(15,23,42,0.82) 50%, rgba(30,27,75,0.90) 100%)' }} />
          </>
        )}

        {/* Gradient-only texture */}
        {!hasBannerImage && (
          <>
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '28px 28px' }} />
            <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.8), transparent 70%)' }} />
            <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.8), transparent 70%)' }} />
          </>
        )}

        <div className="relative max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 pt-28 pb-16">
          {/* Back button */}
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white mb-10 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Blog
          </button>

          {/* Category label */}
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-white/50 mb-5">
            <span className="w-8 h-px bg-white/30" />
            wolfir · Engineering Blog
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {post.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 rounded-lg text-[10px] font-bold tracking-wide bg-white/10 border border-white/20 text-white/80">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Title — wider, more impact */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.05] mb-6 max-w-4xl">
            {post.title}
          </h1>

          {/* Excerpt */}
          <p className="text-xl text-white/70 leading-relaxed mb-8 max-w-3xl font-light">
            {post.excerpt}
          </p>

          {/* Author + metadata */}
          <div className="flex flex-wrap items-center gap-5 pt-6 border-t border-white/10">
            {post.author && (
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white/20"
                  style={{ background: 'rgba(255,255,255,0.15)' }}>
                  BM
                </div>
                <p className="text-sm font-semibold text-white">{post.author}</p>
              </div>
            )}
            <div className="flex items-center gap-5 text-sm text-white/50">
              {post.date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {post.date}
                </span>
              )}
              {post.readTime && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {post.readTime}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Thin accent line */}
      <div className="w-full h-0.5" style={{ background: 'linear-gradient(90deg, #2563EB, #6366F1, #8B5CF6)' }} />

      {/* Article body — wider container */}
      <article className="max-w-4xl mx-auto px-6 sm:px-10 lg:px-16 py-16 pb-28">
        <div className="prose-content">
          {renderMarkdown(post.content)}
        </div>

        {/* Footer CTA */}
        <div className="mt-20 pt-10 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <p className="text-sm font-semibold text-slate-600">Bhavika Mantri · wolfir</p>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              More Articles
            </button>
          </div>
        </div>
      </article>
    </div>
  );
};

export default BlogPostPage;
