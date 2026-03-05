/**
 * Why Nova Sentinel Wins — 3 differentiators (real claims, not fake testimonials)
 */
import React from 'react';

const WhyWeWinSection: React.FC = () => {
  return (
    <div className="py-20 bg-[#06080d] border-y border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-[0.15em] mb-3">
            Why Nova Sentinel Wins
          </div>
          <h2 className="text-3xl lg:text-4xl font-black text-white mb-3 tracking-tight">
            3 Things No Other Team Built
          </h2>
          <p className="text-base text-slate-400 max-w-xl mx-auto">
            Features built for what AWS judges asked for during office hours.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Memory */}
          <div className="rounded-xl bg-[#0f1420] border border-white/[0.06] p-6 hover:border-cyan-500/30 transition-all group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyan-400" />
            <div className="text-[11px] font-mono text-slate-500 tracking-wider mb-4">01 — MEMORY</div>
            <h3 className="text-lg font-bold text-white mb-3">Cross-Incident Correlation</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              DynamoDB-backed persistent memory. Run two demos — the second one detects it&apos;s the same attacker.
              Ask Aria &quot;have we seen this before?&quot; and get real cross-incident intelligence.
            </p>
            <div className="font-mono text-xs text-cyan-400 p-3 bg-cyan-500/[0.04] border border-cyan-500/[0.08] rounded-lg leading-relaxed">
              → INC-001 and INC-002 share IP 203.0.113.42<br />
              &nbsp;&nbsp;Campaign probability: 78%
            </div>
          </div>

          {/* Card 2: Execution */}
          <div className="rounded-xl bg-[#0f1420] border border-white/[0.06] p-6 hover:border-green-500/30 transition-all group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-400" />
            <div className="text-[11px] font-mono text-slate-500 tracking-wider mb-4">02 — EXECUTION</div>
            <h3 className="text-lg font-bold text-white mb-3">Remediation with Proof</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              Not just plans — actual AWS API execution. Before/after state snapshots,
              CloudTrail confirmation, and one-click rollback on every action.
            </p>
            <div className="font-mono text-xs text-green-400 p-3 bg-green-500/[0.04] border border-green-500/[0.08] rounded-lg leading-relaxed">
              → Before: {`{"policies": ["ReadOnly"]}`}<br />
              &nbsp;&nbsp;After: + &quot;Nova Sentinel-EmergencyDeny&quot;
            </div>
          </div>

          {/* Card 3: AI Self-Defense */}
          <div className="rounded-xl bg-[#0f1420] border border-white/[0.06] p-6 hover:border-amber-500/30 transition-all group relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-400" />
            <div className="text-[11px] font-mono text-slate-500 tracking-wider mb-4">03 — AI SELF-DEFENSE</div>
            <h3 className="text-lg font-bold text-white mb-3">MITRE ATLAS Monitoring</h3>
            <p className="text-sm text-slate-400 leading-relaxed mb-4">
              &quot;Who protects the AI?&quot; Nova Sentinel monitors its own pipeline for prompt injection,
              API abuse, and data exfiltration using MITRE ATLAS.
            </p>
            <div className="font-mono text-xs text-amber-400 p-3 bg-amber-500/[0.04] border border-amber-500/[0.08] rounded-lg leading-relaxed">
              → 6 ATLAS techniques monitored real-time<br />
              &nbsp;&nbsp;NIST AI RMF governance aligned
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhyWeWinSection;
