/**
 * Features Section - Unique Premium Bento Grid
 * Mixed card sizes, dark accent cards, metrics, and mini-visualizations
 * Inspired by CrowdStrike, Wiz, Palo Alto enterprise design
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
    <section className="relative" id="features">
      {/* ============ ATTACK PATH SHOWCASE ============ */}
      <div className="py-20 bg-gradient-to-b from-slate-50 via-red-50/40 to-indigo-50/30 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-100 mb-5">
              <Target className="w-4 h-4 text-red-500" />
              <span className="text-sm font-semibold text-red-600">Live Threat Detection</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-3 tracking-tight">
              See Attacks Before They Happen
            </h2>
            <p className="text-base text-slate-500 max-w-xl mx-auto">
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
      <div className="py-20 bg-gradient-to-b from-indigo-50/50 via-blue-50/40 to-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-5">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-700">Multi-Agent Architecture</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-3 tracking-tight">
              5 AI Models, One Unified Pipeline
            </h2>
            <p className="text-base text-slate-500 max-w-xl mx-auto">
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
      <div className="py-20 bg-gradient-to-b from-slate-50 via-violet-50/30 to-indigo-50/20 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-50 border border-violet-100 mb-5">
              <Network className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-semibold text-violet-700">Multi-MCP Orchestration</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-3 tracking-tight">
              4 AWS MCP Servers, Unified Pipeline
            </h2>
            <p className="text-base text-slate-500 max-w-2xl mx-auto">
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
                bgColor: 'bg-orange-50 border-orange-200',
                textColor: 'text-orange-700',
                description: 'Security event analysis and real-time anomaly detection across your AWS environment',
              },
              {
                name: 'IAM MCP',
                source: 'awslabs/mcp pattern',
                tools: ['User Audit', 'Role Audit', 'Policy Analysis', 'Account Summary'],
                color: 'from-blue-500 to-indigo-600',
                bgColor: 'bg-blue-50 border-blue-200',
                textColor: 'text-blue-700',
                description: 'IAM security auditing — MFA compliance, access key rotation, admin access detection',
              },
              {
                name: 'CloudWatch MCP',
                source: 'awslabs/mcp pattern',
                tools: ['Security Alarms', 'API Metrics', 'EC2 Security', 'Billing Anomalies'],
                color: 'from-emerald-500 to-teal-600',
                bgColor: 'bg-emerald-50 border-emerald-200',
                textColor: 'text-emerald-700',
                description: 'Monitoring crypto-mining, data exfiltration, and billing anomalies via CloudWatch metrics',
              },
              {
                name: 'Nova Canvas MCP',
                source: 'awslabs/mcp official',
                tools: ['Image Generation', 'Report Covers', 'Attack Path Visuals'],
                color: 'from-violet-500 to-purple-600',
                bgColor: 'bg-violet-50 border-violet-200',
                textColor: 'text-violet-700',
                description: 'Visual report generation using Amazon Nova Canvas — incident covers and diagrams',
              },
            ].map((server, i) => (
              <motion.div
                key={server.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-5 hover:shadow-card-hover transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${server.color} flex items-center justify-center shadow-sm mb-3`}>
                  <Network className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-0.5">{server.name}</h4>
                <p className={`text-[10px] font-semibold ${server.textColor} mb-2`}>{server.source}</p>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">{server.description}</p>
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
              <div key={stat.label} className="text-center px-4 py-4 bg-white/60 rounded-xl border border-slate-100">
                <div className="text-2xl font-black text-slate-900">{stat.value}</div>
                <div className="text-xs font-bold text-slate-600">{stat.label}</div>
                <div className="text-[10px] text-slate-400">{stat.sub}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ============ CAPABILITIES BENTO GRID ============ */}
      <div className="py-20 bg-gradient-to-b from-slate-50/70 via-blue-50/20 to-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 mb-3 tracking-tight">
              Enterprise-Grade Capabilities
            </h2>
            <p className="text-base text-slate-500 max-w-xl mx-auto">
              Everything you need to secure your cloud, powered by Amazon Nova
            </p>
          </motion.div>

          {/* Bento Grid - Mixed sizes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[180px]">
            
            {/* Large card: Visual Analysis - spans 2 cols */}
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

            {/* Risk Classification - metric card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
              className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 hover:border-amber-200 hover:shadow-card-hover transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-[10px] font-bold">Nova Micro</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Risk Classification</h4>
              <p className="text-xs text-slate-500 mb-3">Instant severity scoring</p>
              <div className="text-4xl font-black text-amber-600 metric-value">&lt;1s</div>
            </motion.div>

            {/* Timeline Intelligence */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 hover:border-purple-200 hover:shadow-card-hover transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-sm">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-[10px] font-bold">Nova 2 Lite</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Root Cause Analysis</h4>
              <p className="text-xs text-slate-500 mb-3">Kill chain tracing</p>
              <div className="text-4xl font-black text-purple-600 metric-value">90d</div>
            </motion.div>

            {/* Voice Investigation - dark card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="group relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-bold">Nova 2 Sonic</span>
              </div>
              <h4 className="font-bold text-sm mb-1">Voice Investigation</h4>
              <p className="text-xs text-slate-400">Hands-free analysis with natural language commands</p>
              {/* Mini waveform */}
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
              className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 hover:border-violet-200 hover:shadow-card-hover transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                  <FileText className="w-5 h-5 text-white" />
                </div>
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Auto Documentation</h4>
              <p className="text-xs text-slate-500 leading-relaxed">JIRA tickets, Slack alerts, and Confluence post-mortems generated automatically</p>
            </motion.div>

            {/* Remediation - wide card */}
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

            {/* Compliance Mapping - wide card */}
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
              className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 hover:border-emerald-200 hover:shadow-card-hover transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-bold">NEW</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Cost Impact Estimation</h4>
              <p className="text-xs text-slate-500">Financial exposure analysis with ROI metrics for every incident</p>
            </motion.div>

            {/* Multi-Agent */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 hover:border-sky-200 hover:shadow-card-hover transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center shadow-sm">
                  <Network className="w-5 h-5 text-white" />
                </div>
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Multi-Agent Orchestration</h4>
              <p className="text-xs text-slate-500">5 specialized agents coordinate with shared state management</p>
            </motion.div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
