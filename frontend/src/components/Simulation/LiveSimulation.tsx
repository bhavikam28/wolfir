/**
 * Live Simulation — Full-screen animated attack replay
 * 45-second cinematic demo of incident detection and containment
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Volume2, VolumeX } from 'lucide-react';
import { getQuickDemoResult } from '../../data/quickDemoResult';
import { ArchitectureCanvas } from './ArchitectureCanvas';
import { EventFeed } from './EventFeed';
import { DetectionBar } from './DetectionBar';
import { useSimulationNarrator } from './SimulationNarrator';

type DetStep = 'detecting' | 'temporal' | 'risk' | 'remediation' | 'contained';
type AttackerPos = 'internet' | 'iam' | 'iam2' | 'iam3' | 'ec2' | 's3' | 'contained' | null;

// Natural-language narrations — conversational, explanatory (not headline-style)
const NARRATIONS: Record<string, string[]> = {
  'crypto-mining': [
    "Here's what's happening: an attacker from the internet has assumed the contractor-temp IAM role, which has administrator access. That's a critical privilege escalation — they now have full control of your AWS account.",
    "The attacker is moving deeper. They've modified the security group to expose SSH to the entire internet — port 22 is now open to 0.0.0.0 slash 0. That creates a direct path for remote access.",
    "Now the real damage: they've launched three GPU instances. GPUs are expensive and perfect for cryptocurrency mining. Your cloud bill is about to spike while they mine crypto on your dime.",
    "Nova Sentinel has detected the threat. Our temporal agent correlated the IAM assumption, security group change, and instance launch. We're now scoring the risk and preparing autonomous remediation.",
    "Incident contained. Nova has revoked the role session, detached the administrator policy, and terminated the mining instances. The attack is stopped. You've avoided thousands in daily crypto-mining costs.",
  ],
  'data-exfiltration': [
    "Someone with the data-analyst identity has just downloaded sensitive customer PII from your company bucket. This looks like the start of a data breach — customer records are being exfiltrated.",
    "It's getting worse. They've now pulled financial records — Q4 2024 data. Multiple large downloads from a single session suggest systematic data theft, not a one-off mistake.",
    "Nova Sentinel has detected the exfiltration pattern. We're correlating the GetObject events and initiating containment to stop further data loss.",
    "Containment complete. We've disabled the data-analyst access keys and updated the bucket policy. The breach is stopped. You'll want to audit who else has access and consider key rotation.",
  ],
  'privilege-escalation': [
    "A junior developer with limited permissions has just assumed the AdminRole. That's a massive privilege jump — they went from read-only to full administrator in one API call.",
    "This is serious. While holding the admin role, they've created a new IAM user called backdoor-admin and attached AdministratorAccess. That's a persistence mechanism — the attacker now has a permanent admin account.",
    "Nova Sentinel has detected the privilege escalation chain. We're analyzing the AssumeRole and CreateUser sequence and preparing to remove the backdoor.",
    "Incident contained. We've deleted the backdoor-admin user and restricted who can assume the AdminRole. The insider threat has been neutralized.",
  ],
  'unauthorized-access': [
    "An external IP — 198.51.100.100 — just attempted to assume an IAM role. The attempt failed, but it tells us someone outside your network is probing with what might be stolen credentials.",
    "They got in. Using compromised credentials for external-user, they've downloaded production API keys from your secrets bucket. Those keys can unlock your entire production environment.",
    "Nova Sentinel has detected the unauthorized access. We're correlating the external IP with the GetObject on secrets and initiating containment.",
    "Containment complete. We've revoked the external-user credentials and initiated key rotation for production. You'll need to rotate those API keys everywhere they're used.",
  ],
};

interface LiveSimulationProps {
  scenarioId: string;
  onComplete: () => void;
  onSkip: () => void;
}

export const LiveSimulation: React.FC<LiveSimulationProps> = ({ scenarioId, onComplete, onSkip }) => {
  const data = getQuickDemoResult(scenarioId);
  const events = (data.results?.timeline?.events || []).sort(
    (a: any, b: any) => (a.timestamp || '').localeCompare(b.timestamp || '')
  );
  const getAttackerPosForEvent = (idx: number): AttackerPos => {
    if (scenarioId === 'crypto-mining') {
      if (idx < 2) return 'internet';
      if (idx < 4) return 'iam';
      return 'ec2';
    }
    if (scenarioId === 'data-exfiltration' || scenarioId === 'unauthorized-access') {
      if (idx < 1) return 'internet';
      return 's3';
    }
    if (scenarioId === 'privilege-escalation') {
      if (idx < 1) return 'iam';
      if (idx < 3) return 'iam2';
      return 'iam3';
    }
    return 'internet';
  };

  const [simTime, setSimTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const lastNarrationRef = useRef(-1);
  const { speak, stop } = useSimulationNarrator(muted ? 0 : volume);

  // Derive all state from simTime (ms)
  const phase = simTime < 3000 ? 0 : simTime < 5000 ? 1 : 2;
  const visibleEvents = phase >= 2 ? Math.min(Math.floor((simTime - 5000) / 4000), events.length) : 0;
  const detThreshold = scenarioId === 'crypto-mining' ? 5 : Math.min(3, events.length);
  const contained = simTime >= 43000;
  const detStep: DetStep =
    contained ? 'contained' :
    visibleEvents >= detThreshold && simTime >= 27000 ? (simTime >= 32000 ? (simTime >= 37000 ? 'remediation' : 'risk') : 'temporal') :
    'detecting';
  const remediationStep = simTime >= 37000 ? (simTime >= 40000 ? (simTime >= 43000 ? 3 : 2) : 1) : 0;
  const attackerPos: AttackerPos = contained ? 'contained' : phase >= 2 && visibleEvents > 0 ? getAttackerPosForEvent(visibleEvents - 1) : null;

  const compromised = new Set<string>();
  if (scenarioId === 'crypto-mining') {
    if (visibleEvents >= 2) compromised.add('iam');
    if (visibleEvents >= 3) compromised.add('sg');
    if (visibleEvents >= 4) compromised.add('ec2');
  }
  if (scenarioId === 'data-exfiltration' || scenarioId === 'unauthorized-access') {
    if (visibleEvents >= 1) compromised.add('s3');
  }
  if (scenarioId === 'privilege-escalation') {
    if (visibleEvents >= 1) compromised.add('iam');
    if (visibleEvents >= 2) compromised.add('iam2');
    if (visibleEvents >= 3) compromised.add('iam3');
  }

  const scenarioName = scenarioId === 'crypto-mining' ? 'Cryptocurrency Mining Attack' :
    scenarioId === 'data-exfiltration' ? 'Data Exfiltration' :
    scenarioId === 'privilege-escalation' ? 'Privilege Escalation' : 'Unauthorized Access';

  // Timeline driver
  useEffect(() => {
    const interval = setInterval(() => {
      setSimTime((t) => Math.min(t + 100 * speed, 50000));
    }, 100);
    return () => clearInterval(interval);
  }, [speed]);

  // Show complete button
  useEffect(() => {
    if (simTime >= 47000) setShowComplete(true);
  }, [simTime]);

  // Narration
  useEffect(() => {
    const narrations = NARRATIONS[scenarioId] || NARRATIONS['crypto-mining'];
    const idx = visibleEvents - 1;
    if (idx >= 0 && idx < narrations.length && idx !== lastNarrationRef.current) {
      lastNarrationRef.current = idx;
      speak(narrations[idx]);
    }
    if (contained && lastNarrationRef.current !== 999) {
      lastNarrationRef.current = 999;
      const narrations = NARRATIONS[scenarioId] || NARRATIONS['crypto-mining'];
      speak(narrations[narrations.length - 1]);
    }
  }, [visibleEvents, contained, scenarioId, speak]);

  useEffect(() => () => stop(), [stop]);

  const riskLevel = visibleEvents >= 5 ? 'CRITICAL' : visibleEvents >= 3 ? 'HIGH' : visibleEvents >= 1 ? 'MEDIUM' : 'LOW';

  // Real-time attack cost ticker: ~$0.20/sec during attack, stops at containment
  const attackStartMs = 5000; // when events start
  const attackDurationMs = Math.max(0, simTime - attackStartMs);
  const costRatePerSec = 0.2;
  const liveCost = contained ? 0 : Math.min(2400, Math.round(attackDurationMs / 1000 * costRatePerSec * 100) / 100);
  const projectedDailyCost = 2400; // savings when contained (avoided cost)

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950 to-indigo-950/20">
      {/* SOC-style grid background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />
      {/* Subtle ambient gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.12),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_80%,rgba(239,68,68,0.06),transparent_40%)] pointer-events-none" />

      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
        {/* Volume — larger slider, visible label */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-600/80 bg-slate-900/60 backdrop-blur-sm px-3 py-2">
          <button
            onClick={() => setMuted((m) => !m)}
            className="p-1.5 text-slate-400 hover:text-white transition-colors rounded"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          {!muted && (
            <>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={Math.round(volume * 100)}
                onChange={(e) => setVolume(Number(e.target.value) / 100)}
                className="w-20 h-2.5 accent-indigo-500 cursor-pointer"
                title="Volume"
              />
              <span className="text-[10px] font-mono text-slate-400 w-8">{Math.round(volume * 100)}%</span>
            </>
          )}
        </div>
        <div className="flex rounded-xl overflow-hidden border border-slate-600/80 bg-slate-900/60 backdrop-blur-sm shadow-lg">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-4 py-2 text-xs font-semibold transition-all ${speed === s ? 'bg-indigo-600 text-white shadow-inner' : 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
            >
              {s}x
            </button>
          ))}
        </div>
        <button
          onClick={onSkip}
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-600/50 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); onSkip(); }}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
        >
          Skip to Results
        </a>
      </div>

      {/* Metrics */}
      <div className="absolute top-4 left-4 flex gap-3 z-10">
        {[
          { label: 'Time', value: `${Math.floor(simTime / 1000)}s`, mono: true },
          { label: 'Events', value: `${visibleEvents}/${events.length}`, mono: true },
          { label: 'Risk', value: contained ? 'CONTAINED' : riskLevel, mono: false, highlight: contained ? 'text-emerald-400' : riskLevel === 'CRITICAL' ? 'text-red-400' : riskLevel === 'HIGH' ? 'text-orange-400' : 'text-amber-400' },
          {
            label: contained ? 'Savings' : 'Cost',
            value: contained ? `$${projectedDailyCost.toLocaleString()}/day` : `$${liveCost.toFixed(2)}`,
            mono: true,
            highlight: contained ? 'text-emerald-400' : 'text-rose-400',
            sub: contained ? 'avoided' : 'accumulating',
          },
        ].map((m) => (
          <div key={m.label} className="rounded-xl px-4 py-2.5 bg-slate-900/70 backdrop-blur-sm border border-slate-700/50 shadow-lg min-w-[80px]">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{m.label}</p>
            <p className={`text-sm font-bold ${m.mono ? 'font-mono' : ''} ${m.highlight || 'text-white'}`}>{m.value}</p>
            {(m as { sub?: string }).sub && <p className="text-[9px] text-slate-500 mt-0.5">{(m as { sub: string }).sub}</p>}
          </div>
        ))}
      </div>

      {/* Title */}
      <AnimatePresence>
        {phase >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-center"
          >
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Simulating</p>
            <p className="text-lg font-bold text-white tracking-tight">{scenarioName}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 pt-16 pb-24 min-h-0">
        {/* Architecture — full width on mobile, flex on desktop */}
        <div className="flex-1 min-w-0 min-h-[280px] md:min-h-[320px] overflow-visible rounded-xl border border-slate-700/40 bg-slate-900/30 backdrop-blur-sm">
          <ArchitectureCanvas
            scenarioId={scenarioId}
            attackerPosition={attackerPos}
            compromisedResources={compromised}
            remediationStep={remediationStep}
          />
        </div>
        {/* Event feed */}
        <div className="w-full md:w-[320px] shrink-0">
          <EventFeed
            events={events.map((e: any) => ({ timestamp: e.timestamp, action: e.action, resource: e.resource, severity: e.severity || 'MEDIUM' }))}
            visibleCount={visibleEvents}
          />
        </div>
      </div>

      {/* What this does — dedicated info bar above detection */}
      <div className="mx-4 mb-2 px-4 py-3 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-slate-600/50 shrink-0">
        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
          <strong className="text-slate-200">What this does:</strong> Watch the attack move through your AWS resources while Aria explains each step in plain language. The Event Feed shows live CloudTrail events. Hover diagram nodes for MITRE ATT&CK details. When Nova detects the threat, the pipeline activates — see &quot;What Nova is doing&quot; below. Then click &quot;View Full Analysis&quot; for the full report.
        </p>
      </div>

      {/* Detection bar */}
      <DetectionBar step={detStep} />

      {/* Contained banner — premium, refined */}
      <AnimatePresence>
        {contained && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none"
          >
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xl" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.12, type: 'spring', damping: 20, stiffness: 180 }}
              className="relative px-16 py-10 rounded-2xl bg-slate-900/95 border border-slate-600/40 shadow-2xl max-w-md"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-emerald-500/10 to-transparent" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-400/30">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-white tracking-tight">
                    Incident Contained
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Nova Sentinel autonomous response complete
                  </p>
                </div>
              </div>
            </motion.div>
            {/* Key takeaways — premium card */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="relative mt-5 px-6 py-4 rounded-xl bg-slate-800/80 border border-slate-600/30 max-w-md"
            >
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Key Takeaways</p>
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <li className="flex gap-2"><span className="text-slate-500">—</span> Attack path: Internet → IAM → {scenarioId === 'crypto-mining' ? 'EC2' : 'S3'}</li>
                <li className="flex gap-2"><span className="text-slate-500">—</span> Nova detected, scored risk, and contained autonomously</li>
                <li className="flex gap-2"><span className="text-slate-500">—</span> Savings: ~${projectedDailyCost.toLocaleString()}/day avoided</li>
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Complete CTA */}
      <AnimatePresence>
        {showComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30"
          >
            <button
              onClick={onComplete}
              className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-xl shadow-indigo-500/25 border border-indigo-400/30 transition-all hover:scale-[1.02]"
            >
              View Full Analysis
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
