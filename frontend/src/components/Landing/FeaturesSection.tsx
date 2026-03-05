/**
 * Features Section - Dark Cybersecurity Command Center
 * Attack path, pipeline diagram, MCP servers, bento capabilities grid
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  Eye, Brain, Zap, Mic, FileText, Shield,
  Network, Target, Lock, Cpu, BarChart3
} from 'lucide-react';
import NovaFlowDiagram from '../Visualizations/NovaFlowDiagram';
import AttackPathVisualization from '../Visualizations/AttackPathVisualization';

const FeaturesSection: React.FC = () => {
  return (
    <section className="relative bg-[#06080d] landing-grid-bg" id="features">
      {/* ============ ATTACK PATH SHOWCASE ============ */}
      <div className="py-20 bg-[#06080d] border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-[0.15em] mb-3">
              Live Threat Detection
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 mb-5">
              <Target className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold text-red-400">Threat Intelligence</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-white mb-3 tracking-tight">
              See Attacks Before They Happen
            </h2>
            <p className="text-base text-slate-400 max-w-xl mx-auto">
              Real-time attack path visualization traces threats across your entire AWS environment
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <AttackPathVisualization />
          </motion.div>
        </div>
      </div>

      {/* ============ PIPELINE SECTION ============ */}
      <div className="py-20 bg-[#0b0f18] border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-[0.15em] mb-3">
              Multi-Agent Architecture
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-5">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-indigo-400">AI Orchestration</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-white mb-3 tracking-tight">
              5 AI Models, One Unified Pipeline
            </h2>
            <p className="text-base text-slate-400 max-w-xl mx-auto">
              Each model chosen for a specific purpose. Hover to explore each stage.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <NovaFlowDiagram />
          </motion.div>
        </div>
      </div>

      {/* ============ MCP SERVER ARCHITECTURE ============ */}
      <div className="py-20 bg-[#06080d] border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-[0.15em] mb-3">
              Multi-MCP Orchestration
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 mb-5">
              <Network className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-semibold text-violet-400">4 AWS MCP Servers</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-white mb-3 tracking-tight">
              4 AWS MCP Servers, Unified Pipeline
            </h2>
            <p className="text-base text-slate-400 max-w-2xl mx-auto">
              Orchestrates official AWS MCP servers through Strands Agents SDK —
              CloudTrail for detection, IAM for remediation, CloudWatch for monitoring, Nova Canvas for visuals.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                name: 'CloudTrail MCP',
                source: 'awslabs/mcp pattern',
                tools: ['Event Lookup', 'Trail Status', 'Anomaly Scan'],
                color: 'from-orange-500 to-amber-600',
                bgColor: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
                textColor: 'text-orange-400',
                description: 'Security event analysis and real-time anomaly detection across your AWS environment',
              },
              {
                name: 'IAM MCP',
                source: 'awslabs/mcp pattern',
                tools: ['User Audit', 'Role Audit', 'Policy Analysis', 'Account Summary'],
                color: 'from-blue-500 to-indigo-600',
                bgColor: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
                textColor: 'text-blue-400',
                description: 'IAM security auditing — MFA compliance, access key rotation, admin access detection',
              },
              {
                name: 'CloudWatch MCP',
                source: 'awslabs/mcp pattern',
                tools: ['Security Alarms', 'API Metrics', 'EC2 Security', 'Billing Anomalies'],
                color: 'from-emerald-500 to-teal-600',
                bgColor: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
                textColor: 'text-emerald-400',
                description: 'Monitoring crypto-mining, data exfiltration, and billing anomalies via CloudWatch metrics',
              },
              {
                name: 'Nova Canvas MCP',
                source: 'awslabs/mcp official',
                tools: ['Image Generation', 'Report Covers', 'Attack Path Visuals'],
                color: 'from-violet-500 to-purple-600',
                bgColor: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
                textColor: 'text-violet-400',
                description: 'Visual report generation using Amazon Nova Canvas — incident covers and diagrams',
              },
            ].map((server, i) => (
              <motion.div
                key={server.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative overflow-hidden rounded-2xl bg-[#0f1420] border border-white/[0.06] p-5 hover:border-white/[0.15] hover:bg-[#141a28] transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${server.color} flex items-center justify-center shadow-sm mb-3`}>
                  <Network className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-bold text-white text-sm mb-0.5">{server.name}</h4>
                <p className={`text-[10px] font-semibold ${server.textColor} mb-2`}>{server.source}</p>
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">{server.description}</p>
                <div className="flex flex-wrap gap-1">
                  {server.tools.map((tool) => (
                    <span key={tool} className={`px-2 py-0.5 text-[9px] font-semibold rounded-full border ${server.bgColor}`}>
                      {tool}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Architecture stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { label: 'MCP Tools', value: '22', sub: 'Registered' },
              { label: 'Strands Tools', value: '12', sub: '@tool decorated' },
              { label: 'Nova Models', value: '6', sub: 'Integrated' },
              { label: 'AWS Services', value: '7+', sub: 'Connected' },
            ].map((stat) => (
              <div key={stat.label} className="text-center px-4 py-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                <div className="text-2xl font-black text-white font-mono">{stat.value}</div>
                <div className="text-xs font-bold text-slate-400">{stat.label}</div>
                <div className="text-[10px] text-slate-500">{stat.sub}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ============ CAPABILITIES BENTO GRID ============ */}
      <div className="py-20 bg-[#0b0f18] border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-[0.15em] mb-3">
              Enterprise Capabilities
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-white mb-3 tracking-tight">
              Enterprise-Grade Capabilities
            </h2>
            <p className="text-base text-slate-400 max-w-xl mx-auto">
              Everything you need to secure your cloud, powered by Amazon Nova
            </p>
          </motion.div>

          {/* Bento Grid - Mixed sizes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[180px]">

            {/* Large card: Visual Analysis - KEEP gradient */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2 lg:row-span-2 group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white cursor-default"
            >
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M0%200h20v20H0z%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.05)%22%20stroke-width%3D%220.5%22%2F%3E%3C%2Fsvg%3E')] opacity-60" />
              <div className="relative z-10 h-full flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                  <span className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[11px] font-bold">Nova Pro</span>
                </div>
                <h3 className="text-2xl font-bold mb-2">Visual Architecture Analysis</h3>
                <p className="text-blue-100 text-sm leading-relaxed mb-auto">
                  Upload any architecture diagram — Nova Pro identifies misconfigurations, open ports,
                  overly permissive IAM policies, and security group issues in seconds.
                </p>
                <div className="flex gap-6 mt-6">
                  <div>
                    <div className="text-2xl font-black">50+</div>
                    <div className="text-[11px] text-blue-200">Check types</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black">&lt;5s</div>
                    <div className="text-[11px] text-blue-200">Analysis time</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black">PNG/JPG</div>
                    <div className="text-[11px] text-blue-200">Supported</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Risk Classification */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
              className="group relative overflow-hidden rounded-2xl bg-[#0f1420] border border-white/[0.06] p-6 hover:border-white/[0.15] hover:bg-[#141a28] transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-bold">Nova Micro</span>
              </div>
              <h4 className="font-bold text-white text-sm mb-1">Risk Classification</h4>
              <p className="text-xs text-slate-500 mb-3">Instant severity scoring</p>
              <div className="text-4xl font-black text-amber-400 font-mono metric-value">&lt;1s</div>
            </motion.div>

            {/* Timeline Intelligence */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="group relative overflow-hidden rounded-2xl bg-[#0f1420] border border-white/[0.06] p-6 hover:border-white/[0.15] hover:bg-[#141a28] transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-sm">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-[10px] font-bold">Nova 2 Lite</span>
              </div>
              <h4 className="font-bold text-white text-sm mb-1">Root Cause Analysis</h4>
              <p className="text-xs text-slate-500 mb-3">Kill chain tracing</p>
              <div className="text-4xl font-black text-purple-400 font-mono metric-value">90d</div>
            </motion.div>

            {/* Voice Investigation - already dark */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="group relative overflow-hidden rounded-2xl bg-slate-900 border border-white/[0.06] p-6 text-white"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="px-2 py-0.5 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-full text-[10px] font-bold" title="Integration-ready; requires WebSocket streaming client">Nova 2 Sonic (ready)</span>
              </div>
              <h4 className="font-bold text-sm mb-1">Voice Investigation</h4>
              <p className="text-xs text-slate-400">Hands-free analysis with natural language commands</p>
              <div className="flex items-end gap-0.5 mt-4 h-6">
                {[3, 5, 8, 12, 16, 12, 8, 14, 10, 6, 9, 13, 7, 4, 8, 11, 6, 3].map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-emerald-400/60 rounded-full"
                    animate={{ height: [h * 1.5, h * 2.5, h * 1.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.08 }}
                  />
                ))}
              </div>
            </motion.div>

            {/* Documentation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="group relative overflow-hidden rounded-2xl bg-[#0f1420] border border-white/[0.06] p-6 hover:border-white/[0.15] hover:bg-[#141a28] transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                  <FileText className="w-5 h-5 text-white" />
                </div>
              </div>
              <h4 className="font-bold text-white text-sm mb-1">Auto Documentation</h4>
              <p className="text-xs text-slate-400 leading-relaxed">JIRA tickets, Slack alerts, and Confluence post-mortems generated automatically</p>
            </motion.div>

            {/* Remediation - KEEP gradient */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25 }}
              className="lg:col-span-2 group relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white"
            >
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-full text-[10px] font-bold">Automated</span>
                  </div>
                  <h4 className="font-bold text-lg mb-1">Autonomous Remediation</h4>
                  <p className="text-emerald-100 text-sm leading-relaxed">
                    AI-generated remediation plans with human-in-the-loop approval gates.
                    Fix IAM policies, security groups, and configurations with one click.
                  </p>
                </div>
                <div className="hidden sm:flex flex-col gap-2 text-right">
                  <div className="px-4 py-2 bg-white/10 rounded-lg border border-white/20">
                    <div className="text-xl font-black">3-step</div>
                    <div className="text-[10px] text-emerald-200">Approval flow</div>
                  </div>
                  <div className="px-4 py-2 bg-white/10 rounded-lg border border-white/20">
                    <div className="text-xl font-black">1-click</div>
                    <div className="text-[10px] text-emerald-200">Apply fix</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Compliance Mapping - KEEP gradient */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2 group relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white"
            >
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-white" />
                    </div>
                    <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-full text-[10px] font-bold">NEW</span>
                  </div>
                  <h4 className="font-bold text-lg mb-1">Compliance Mapping</h4>
                  <p className="text-indigo-100 text-sm leading-relaxed">
                    Auto-maps every finding to CIS, NIST 800-53, SOC 2, PCI-DSS, SOX, and HIPAA.
                    No more manual compliance auditing.
                  </p>
                </div>
                <div className="hidden sm:flex flex-col gap-2 text-right">
                  <div className="px-4 py-2 bg-white/10 rounded-lg border border-white/20">
                    <div className="text-xl font-black">6</div>
                    <div className="text-[10px] text-indigo-200">Frameworks</div>
                  </div>
                  <div className="px-4 py-2 bg-white/10 rounded-lg border border-white/20">
                    <div className="text-xl font-black">Auto</div>
                    <div className="text-[10px] text-indigo-200">Mapped</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Cost Impact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35 }}
              className="group relative overflow-hidden rounded-2xl bg-[#0f1420] border border-white/[0.06] p-6 hover:border-white/[0.15] hover:bg-[#141a28] transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold">NEW</span>
              </div>
              <h4 className="font-bold text-white text-sm mb-1">Cost Impact Estimation</h4>
              <p className="text-xs text-slate-400">Financial exposure analysis with ROI metrics for every incident</p>
            </motion.div>

            {/* Multi-Agent */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="group relative overflow-hidden rounded-2xl bg-[#0f1420] border border-white/[0.06] p-6 hover:border-white/[0.15] hover:bg-[#141a28] transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow-sm">
                  <Network className="w-5 h-5 text-white" />
                </div>
              </div>
              <h4 className="font-bold text-white text-sm mb-1">Multi-Agent Orchestration</h4>
              <p className="text-xs text-slate-400">5 specialized agents coordinate with shared state management</p>
            </motion.div>

          </div>
        </div>
      </div>

      {/* Dashboard at a Glance */}
      <div className="py-16 bg-[#06080d] border-t border-white/[0.06]" id="demo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl lg:text-3xl font-black text-white mb-2 tracking-tight">
              Inside the Console
            </h2>
            <p className="text-slate-400 text-sm max-w-lg mx-auto">
              Timeline · Attack Path · Remediation · AI Pipeline Security · Incident History — same premium experience for Demo & Real AWS
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {['Timeline', 'Attack Path', 'Compliance', 'Cost Impact', 'Remediation', 'AI Pipeline', 'Incident History'].map((label) => (
              <span
                key={label}
                className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-300 text-xs font-semibold"
              >
                {label}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
