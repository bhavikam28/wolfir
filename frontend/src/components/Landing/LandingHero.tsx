/**
 * Nova Sentinel Hero — Cybersecurity Command Center
 * Dark theme, terminal simulation, technical credibility
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, Cloud, Play } from 'lucide-react';

const terminalLines = [
  { html: '<span class="text-green-400">▸</span> <span class="text-white">nova-sentinel analyze --scenario iam-privilege-escalation</span>', delay: 0 },
  { html: '<span class="text-slate-600">───────────────────────────────────────────</span>', delay: 600 },
  { html: '<span class="text-cyan-400">[CloudTrail MCP]</span> <span class="text-slate-400">Fetching events from us-east-1...</span> <span class="text-green-400">247 events loaded</span>', delay: 1200 },
  { html: '<span class="text-cyan-400">[Nova 2 Lite]</span> <span class="text-slate-400">Temporal analysis — reconstructing timeline...</span>', delay: 2200 },
  { html: '  <span class="text-slate-400">→ Entry point: API Gateway via compromised key</span>', delay: 3000 },
  { html: '  <span class="text-slate-400">→ Lateral movement: AssumeRole to contractor-temp</span>', delay: 3600 },
  { html: '  <span class="text-slate-400">→ Privilege escalation: AttachRolePolicy (AdminAccess)</span>', delay: 4200 },
  { html: '<span class="text-cyan-400">[Nova Micro]</span> <span class="text-slate-400">Risk classification...</span> <span class="text-red-400 font-semibold">CRITICAL 92/100</span> <span class="text-slate-500">| T1078, T1098</span>', delay: 5200 },
  { html: '<span class="text-cyan-400">[IAM MCP]</span> <span class="text-slate-400">Auditing contractor-temp...</span> <span class="text-amber-400">⚠ AdminAccess attached</span>', delay: 6200 },
  { html: '<span class="text-cyan-400">[DynamoDB]</span> <span class="text-slate-400">Cross-incident correlation...</span> <span class="text-amber-400">⚠ Pattern match with INC-56601</span>', delay: 7400 },
  { html: '<span class="text-slate-600">───────────────────────────────────────────</span>', delay: 8400 },
  { html: '<span class="text-cyan-400">[Remediation]</span> <span class="text-slate-400">5-step plan generated...</span>', delay: 9000 },
  { html: '  <span class="text-green-400">✓</span> <span class="text-slate-400">Step 1: Deny policy attached</span> <span class="text-green-400">[AUTO-EXECUTED]</span>', delay: 9800 },
  { html: '  <span class="text-amber-400">⏳</span> <span class="text-slate-400">Step 2: Detach AdminAccess</span> <span class="text-amber-400">[AWAITING APPROVAL]</span>', delay: 10400 },
  { html: '<span class="text-cyan-400">[Documentation]</span> <span class="text-slate-400">JIRA + Slack + Confluence</span> <span class="text-green-400">created</span>', delay: 11200 },
  { html: '<span class="text-slate-600">───────────────────────────────────────────</span>', delay: 12000 },
  { html: '<span class="text-green-400 font-semibold">✔ INCIDENT RESPONSE COMPLETE</span> <span class="text-slate-600">|</span> <span class="text-cyan-400">Time:</span> <span class="text-indigo-400">47.2s</span> <span class="text-slate-600">|</span> <span class="text-cyan-400">Cost:</span> <span class="text-indigo-400">$0.013</span>', delay: 12800 },
];

const LandingHero: React.FC = () => {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [loopKey, setLoopKey] = useState(0);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    terminalLines.forEach((line) => {
      const t = setTimeout(() => {
        setVisibleLines((prev) => [...prev, line.html]);
        if (terminalRef.current) {
          terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
      }, line.delay);
      timeouts.push(t);
    });
    const lastDelay = terminalLines[terminalLines.length - 1].delay;
    const restart = setTimeout(() => {
      setVisibleLines([]);
      setLoopKey((k) => k + 1);
    }, lastDelay + 5000);
    timeouts.push(restart);
    return () => timeouts.forEach(clearTimeout);
  }, [loopKey]);

  return (
    <section className="relative min-h-[95vh] flex items-center overflow-hidden" style={{ background: '#06080d' }}>
      {/* Grid lines */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99,130,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,130,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Subtle dark radial glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[800px] h-[800px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
            top: '-15%',
            right: '-10%',
          }}
        />
        <div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(34,211,238,0.05) 0%, transparent 60%)',
            bottom: '5%',
            left: '-8%',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-24 w-full">
        <div className="text-center max-w-4xl mx-auto">
          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-white mb-6 tracking-tight leading-[1.02]"
          >
            <span className="block">Security Incidents</span>
            <span className="block mt-2 gradient-text-hero-cyber">Resolved in Seconds</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Not a dashboard. Not a SIEM. An{' '}
            <span className="text-white font-semibold">autonomous agentic pipeline</span>{' '}
            where 5 specialized Nova models investigate, classify, remediate, and document
            security threats — with zero human latency.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
          >
            <a
              href="#console"
              className="btn-nova group px-8 py-4 bg-indigo-600 text-white rounded-xl font-mono font-semibold text-sm flex items-center gap-3 justify-center border border-indigo-500/30"
            >
              <Shield className="w-5 h-5" />
              Launch Console
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#demo"
              className="px-8 py-4 bg-transparent border border-white/[0.1] text-slate-400 rounded-xl font-mono text-sm hover:border-white/[0.2] hover:text-white transition-all flex items-center gap-3 justify-center"
            >
              <Zap className="w-5 h-5 text-amber-400" />
              Try Demo
            </a>
          </motion.div>

          {/* Two Paths */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8"
          >
            <a
              href="#demo"
              className="group p-5 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:border-violet-500/40 hover:bg-white/[0.06] transition-all text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center group-hover:bg-violet-500/30 transition-colors">
                  <Play className="w-5 h-5 text-violet-400" />
                </div>
                <span className="text-sm font-bold text-white">Demo Scenarios</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Crypto mining, data exfiltration, privilege escalation — explore instantly with no AWS setup
              </p>
            </a>
            <a
              href="#console"
              className="group p-5 rounded-2xl bg-white/[0.04] border border-white/[0.06] hover:border-emerald-500/40 hover:bg-white/[0.06] transition-all text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                  <Cloud className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-sm font-bold text-white">Real AWS Account</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your account — credentials stay local. Analyze live CloudTrail in &lt;60 seconds
              </p>
            </a>
          </motion.div>

          {/* Terminal Simulation */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="w-full max-w-3xl mx-auto mt-8"
          >
            <div
              className="rounded-xl border border-white/[0.08] overflow-hidden"
              style={{
                boxShadow: '0 0 30px rgba(99,102,241,0.1), 0 25px 60px rgba(0,0,0,0.4)',
              }}
            >
              <div className="flex items-center gap-2 px-4 py-3 bg-[#0f1420] border-b border-white/[0.06]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-[11px] text-slate-500 font-mono ml-2">
                  nova-sentinel — incident response pipeline
                </span>
              </div>

              <div
                className="p-5 font-mono text-[13px] leading-[1.9] min-h-[300px] bg-[#0b0f18]"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(99,130,255,0.01) 2px, rgba(99,130,255,0.01) 4px)',
                }}
                ref={terminalRef}
              >
                {visibleLines.map((line, i) => (
                  <motion.div
                    key={`${loopKey}-${i}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    dangerouslySetInnerHTML={{ __html: line }}
                  />
                ))}
                <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-0.5" />
              </div>

              <div className="flex items-center justify-between px-4 py-2 bg-green-500/[0.04] border-t border-green-500/10 text-[11px] font-mono text-green-400">
                <span>▸ PIPELINE: ACTIVE</span>
                <span>5 MODELS · 22 MCP TOOLS · 4 AWS SERVERS</span>
                <span>DEMO MODE</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Powered by bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#0b0f18]/80 backdrop-blur-sm border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-wrap justify-center items-center gap-4">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">Powered by</span>
            {[
              { name: 'Nova Pro', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
              { name: 'Nova 2 Lite', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
              { name: 'Nova Micro', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
              { name: 'Nova 2 Sonic (ready)', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
              { name: 'Nova Act', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
            ].map((tech) => (
              <span key={tech.name} className={`px-4 py-1.5 rounded-full text-xs font-bold border ${tech.color}`}>
                {tech.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
