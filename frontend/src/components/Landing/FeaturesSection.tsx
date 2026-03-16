/**
 * Features Section - Premium White Theme
 * Full content: Attack path, pipeline, MCP servers, bento grid, dashboard
 * Enterprise cloud security aesthetic
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  Eye, Brain, Zap, Mic, FileText, Shield,
  Network, Target, Lock, Cpu, BarChart3
} from 'lucide-react';
import {
  IconCloudTrail, IconIAM, IconCloudWatch, IconSecurityHub, IconNovaCanvas,
} from '../ui/MinimalIcons';
import NovaFlowDiagram from '../Visualizations/NovaFlowDiagram';
import AttackPathVisualization from '../Visualizations/AttackPathVisualization';
import DashboardPreview from './DashboardPreview';

const FeaturesSection: React.FC = () => {
  return (
    <section className="relative bg-white" id="features">
      {/* ============ END-TO-END PIPELINE (moved up — core value prop first) ============ */}
      <div className="py-20 bg-gradient-to-b from-slate-50/80 to-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-[0.2em] mb-3">
              Cloud + AI Security Pipeline
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
              Incident Response + AI Pipeline Monitoring
            </h2>
            <p className="text-base text-slate-600 max-w-xl mx-auto">
              Cloud threats resolved autonomously. AI pipeline monitored with MITRE ATLAS — we secure both. Powered by Amazon Nova.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Visual Analysis - gradient */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-2 min-h-0 sm:min-h-[220px] group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white cursor-default shadow-lg shadow-indigo-500/15 hover:shadow-xl hover:shadow-indigo-500/20 transition-shadow"
            >
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M0%200h20v20H0z%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.08)%22%20stroke-width%3D%220.5%22%2F%3E%3C%2Fsvg%3E')] opacity-60" />
              <div className="relative z-10 h-full flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                  <span className="px-2.5 py-1 bg-white/10 border border-white/20 rounded-full text-[10px] font-bold">Nova Pro</span>
                </div>
                <h3 className="text-lg font-bold mb-2">Architecture & STRIDE</h3>
                <p className="text-blue-100 text-sm leading-relaxed mb-4 flex-1">
                  Upload architecture diagrams — Nova Pro identifies misconfigurations and generates STRIDE threat models in seconds.
                </p>
                <div className="flex gap-5">
                  <div><div className="text-xl font-bold">50+</div><div className="text-[10px] text-blue-200">Check types</div></div>
                  <div><div className="text-xl font-bold">&lt;5s</div><div className="text-[10px] text-blue-200">Analysis</div></div>
                  <div><div className="text-xl font-bold">PNG/JPG</div><div className="text-[10px] text-blue-200">Supported</div></div>
                </div>
              </div>
            </motion.div>

            {/* Risk Classification */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.05 }}
              className="min-h-0 sm:min-h-[220px] group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-bold">Nova Micro</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Risk Classification</h4>
              <p className="text-xs text-slate-500 mb-3">Instant severity scoring</p>
              <div className="text-4xl font-bold text-indigo-600 font-mono metric-value">&lt;1s</div>
            </motion.div>

            {/* Root Cause Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="min-h-0 sm:min-h-[220px] group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:border-violet-200 transition-all flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-[10px] font-bold">Nova 2 Lite</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Root Cause Analysis</h4>
              <p className="text-xs text-slate-500 mb-3">Kill chain tracing</p>
              <div className="text-4xl font-bold text-indigo-600 font-mono metric-value">90d</div>
            </motion.div>

            {/* Voice Investigation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="min-h-0 sm:min-h-[220px] group relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 p-6 text-white shadow-lg flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 border-emerald-200 text-emerald-700 border rounded-full text-[10px] font-bold" title="Integration-ready">Nova 2 Sonic (ready)</span>
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
              className="min-h-0 sm:min-h-[220px] group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:border-violet-200 transition-all flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md">
                  <FileText className="w-5 h-5 text-white" />
                </div>
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Auto Documentation</h4>
              <p className="text-xs text-slate-600 leading-relaxed">JIRA tickets, Slack alerts, and Confluence post-mortems generated automatically</p>
            </motion.div>

            {/* Remediation - gradient */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25 }}
              className="lg:col-span-2 min-h-[220px] group relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white shadow-lg shadow-emerald-500/15 hover:shadow-xl transition-shadow"
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
                    <div className="text-xl font-bold">3-step</div>
                    <div className="text-[10px] text-emerald-200">Approval flow</div>
                  </div>
                  <div className="px-4 py-2 bg-white/10 rounded-lg border border-white/20">
                    <div className="text-xl font-bold">1-click</div>
                    <div className="text-[10px] text-emerald-200">Apply fix</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Compliance Mapping - gradient */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="min-h-0 sm:min-h-[220px] group relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white shadow-lg shadow-indigo-500/15 hover:shadow-xl transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                  <span className="px-2 py-0.5 bg-white/10 border border-white/20 rounded-full text-[10px] font-bold">NEW</span>
                </div>
                <h4 className="font-bold text-lg mb-1">Compliance Mapping</h4>
                <p className="text-indigo-100 text-sm leading-relaxed">
                  Auto-maps to CIS, NIST, SOC 2, PCI-DSS, SOX, HIPAA. No manual auditing.
                </p>
              </div>
              <div className="flex gap-3 mt-4">
                <div className="px-3 py-2 bg-white/10 rounded-lg border border-white/20">
                  <div className="text-lg font-bold">6</div>
                  <div className="text-[10px] text-indigo-200">Frameworks</div>
                </div>
                <div className="px-3 py-2 bg-white/10 rounded-lg border border-white/20">
                  <div className="text-lg font-bold">Auto</div>
                  <div className="text-[10px] text-indigo-200">Mapped</div>
                </div>
              </div>
            </motion.div>

            {/* Cost Impact */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.35 }}
              className="min-h-0 sm:min-h-[220px] group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all flex flex-col"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">NEW</span>
              </div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Cost Impact Estimation</h4>
              <p className="text-xs text-slate-600">Financial exposure analysis with ROI metrics for every incident</p>
            </motion.div>

            {/* Multi-Agent */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="lg:col-span-2 min-h-0 sm:min-h-[220px] group relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all flex flex-col justify-center"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md flex-shrink-0">
                  <Network className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base mb-1">Multi-Agent Orchestration</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">7 Nova capabilities, 19 registered Strands tools, persistent async worker — Detect, Investigate, Classify, Remediate, Document in one coordinated pipeline.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ============ ATTACK PATH SHOWCASE ============ */}
      <div className="py-20 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-[0.2em] mb-3">
              Live Threat Detection
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-200 mb-5">
              <Target className="w-4 h-4 text-red-500" />
              <span className="text-sm font-semibold text-red-600">Threat Intelligence</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
              See Attacks Before They Happen
            </h2>
            <p className="text-base text-slate-600 max-w-xl mx-auto">
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
      <div className="py-20 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-[0.2em] mb-3">
              Model Specialization
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 mb-5">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-700">Context-Aware Orchestration</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
              7 Nova Capabilities — Right Model, Right Task
            </h2>
            <p className="text-base text-slate-600 max-w-xl mx-auto">
              Agents share state across the pipeline. Click any stage to explore.
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
      <div className="py-20 bg-gradient-to-b from-white to-slate-50/50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="text-[11px] font-semibold text-violet-600 uppercase tracking-[0.2em] mb-3">
              Multi-MCP Orchestration
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-50 border border-violet-200 mb-5">
              <Network className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-semibold text-violet-700">6 AWS MCP Servers</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
              6 AWS MCP Servers, Unified Pipeline
            </h2>
            <p className="text-base text-slate-600 max-w-2xl mx-auto">
              Orchestrates official AWS MCP servers through Strands Agents SDK —
              CloudTrail, IAM, CloudWatch, Security Hub, Nova Canvas.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {[
              { name: 'CloudTrail MCP', source: 'awslabs/mcp pattern', tools: ['Event Lookup', 'Trail Status', 'Anomaly Scan'], description: 'Security event analysis and real-time anomaly detection across your AWS environment', icon: IconCloudTrail },
              { name: 'IAM MCP', source: 'awslabs/mcp pattern', tools: ['User Audit', 'Role Audit', 'Policy Analysis', 'Account Summary'], description: 'IAM security auditing — MFA compliance, access key rotation, admin access detection', icon: IconIAM },
              { name: 'CloudWatch MCP', source: 'awslabs/mcp pattern', tools: ['Security Alarms', 'API Metrics', 'EC2 Security', 'Billing Anomalies'], description: 'Monitoring crypto-mining, data exfiltration, and billing anomalies via CloudWatch metrics', icon: IconCloudWatch },
              { name: 'Security Hub MCP', source: 'awslabs/mcp pattern', tools: ['Findings', 'GuardDuty', 'Inspector', 'Pre-correlation'], description: 'Security Hub findings — GuardDuty, Inspector, and pre-correlated security events', icon: IconSecurityHub },
              { name: 'Nova Canvas MCP', source: 'awslabs/mcp official', tools: ['Image Generation', 'Report Covers', 'Attack Path Visuals'], description: 'Visual report generation using Amazon Nova Canvas — incident covers and diagrams', icon: IconNovaCanvas },
            ].map((server, i) => {
              const Icon = server.icon;
              return (
              <motion.div
                key={server.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-0.5">{server.name}</h4>
                <p className="text-[10px] font-semibold text-slate-500 mb-2">{server.source}</p>
                <p className="text-xs text-slate-600 mb-3 leading-relaxed">{server.description}</p>
                <div className="flex flex-wrap gap-1">
                  {server.tools.map((tool) => (
                    <span key={tool} className="px-2 py-0.5 text-[10px] font-semibold rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
                      {tool}
                    </span>
                  ))}
                </div>
              </motion.div>
            );})}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { label: 'Strands Tools', value: '19', sub: 'Agent-registered' },
              { label: 'Nova Capabilities', value: '7', sub: 'Integrated' },
              { label: 'ATLAS Techniques', value: '6', sub: 'Monitored live' },
              { label: 'AWS Services', value: '7+', sub: 'Connected' },
            ].map((stat) => (
              <div key={stat.label} className="text-center px-4 py-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="text-2xl font-bold text-slate-900 font-mono">{stat.value}</div>
                <div className="text-xs font-semibold text-slate-600">{stat.label}</div>
                <div className="text-[10px] text-slate-500">{stat.sub}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Dashboard Preview — Seddle-style embedded screenshot */}
      <div className="py-20 bg-gradient-to-b from-slate-50 to-white border-t border-slate-200" id="demo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="text-[11px] font-semibold text-indigo-600 uppercase tracking-[0.2em] mb-3">
              Premium Console
            </div>
            <h2 className="text-2xl lg:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
              Inside the Console
            </h2>
            <p className="text-slate-600 text-base max-w-xl mx-auto">
              Timeline · Attack Path · Remediation · AI Pipeline Security · Incident History — same premium experience for Demo & Real AWS
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="max-w-4xl mx-auto"
          >
            <DashboardPreview />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
            {['Timeline', 'Attack Path', 'Compliance', 'Cost Impact', 'Remediation', 'AI Pipeline', 'Incident History'].map((label) => (
              <span
                key={label}
                className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 hover:border-slate-300 transition-colors"
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
