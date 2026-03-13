/**
 * Under the Hood — How wolfir Works
 * 3 differentiators: Memory, Execution, AI Self-Defense
 * Premium white theme
 */
import React from 'react';
import { motion } from 'framer-motion';

const UnderTheHoodSection: React.FC = () => {
  return (
    <div className="py-20 bg-gradient-to-b from-slate-50 to-white border-y border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-[0.2em] mb-3">
            Under the Hood
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
            How wolfir Works
          </h2>
          <p className="text-base text-slate-600 max-w-2xl mx-auto">
            Multi-model specialization. Persistent cross-incident memory. Autonomous remediation with human-in-loop. And AI pipeline self-monitoring with MITRE ATLAS — who protects the AI? wolfir does.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Memory */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:border-cyan-200 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-indigo-500" />
            <div className="text-[11px] font-semibold text-slate-500 tracking-wider mb-4">01 — MEMORY</div>
            <h3 className="text-lg font-bold text-slate-900 mb-3">Cross-Incident Correlation</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              DynamoDB-backed persistent memory. Run two demos — the second one detects it&apos;s the same attacker.
              Ask Aria &quot;have we seen this before?&quot; and get real cross-incident intelligence.
            </p>
            <div className="font-mono text-xs text-cyan-600 p-3 bg-cyan-50 border border-cyan-200 rounded-lg leading-relaxed">
              → INC-001 and INC-002 share IP 203.0.113.42<br />
              &nbsp;&nbsp;Campaign probability: 78%
            </div>
          </motion.div>

          {/* Card 2: Execution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="text-[11px] font-semibold text-slate-500 tracking-wider mb-4">02 — EXECUTION</div>
            <h3 className="text-lg font-bold text-slate-900 mb-3">Remediation with Proof</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Not just plans — actual AWS API execution. Before/after state snapshots,
              CloudTrail confirmation, and one-click rollback on every action.
            </p>
            <div className="font-mono text-xs text-emerald-600 p-3 bg-emerald-50 border border-emerald-200 rounded-lg leading-relaxed">
              → Before: {`{"policies": ["ReadOnly"]}`}<br />
              &nbsp;&nbsp;After: + &quot;wolfir-EmergencyDeny&quot;
            </div>
          </motion.div>

          {/* Card 3: AI Self-Defense */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:border-amber-200 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="text-[11px] font-semibold text-slate-500 tracking-wider mb-4">03 — AI SELF-DEFENSE</div>
            <h3 className="text-lg font-bold text-slate-900 mb-3">MITRE ATLAS + AI Guardrails</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              &quot;Who protects the AI?&quot; wolfir monitors its own pipeline for prompt injection,
              API abuse, and data exfiltration using MITRE ATLAS. Works with Amazon Bedrock Guardrails for defense in depth — content filters, prompt-attack detection, PII protection.
            </p>
            <div className="font-mono text-xs text-amber-600 p-3 bg-amber-50 border border-amber-200 rounded-lg leading-relaxed">
              → 6 ATLAS techniques monitored real-time<br />
              &nbsp;&nbsp;NIST AI RMF governance aligned
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default UnderTheHoodSection;
