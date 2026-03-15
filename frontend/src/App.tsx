/**
 * wolfir - AI that secures your cloud — and secures itself
 * Enterprise sidebar layout with clearly named features
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, AlertCircle, CheckCircle2, Menu, X, ChevronRight, ChevronDown,
  Loader2, Eye, Brain, Zap, Shield, FileText
} from 'lucide-react';
import WolfirLogo, { WolfirWordmark } from './components/Logo';
import LandingHero from './components/Landing/LandingHero';
import FeaturesSection from './components/Landing/FeaturesSection';
import SOCProblemsSection from './components/Landing/SOCProblemsSection';
import FAQSection from './components/Landing/FAQSection';
import ScrollToTop from './components/Landing/ScrollToTop';
import StatsCards from './components/Landing/StatsCards';
import IndustryStatsSection from './components/Landing/IndustryStatsSection';
import UseCasesSection from './components/Landing/UseCasesSection';
import PricingSection from './components/Landing/PricingSection';
import PlatformFeaturesSection from './components/Landing/PlatformFeaturesSection';
import BlogSection from './components/Landing/BlogSection';
import BlogPostPage from './components/Landing/BlogPostPage';
import MITREAtlasTeaser from './components/Landing/MITREAtlasTeaser';
import DashboardShowcase from './components/Landing/DashboardShowcase';
import DashboardLayout from './components/Dashboard/DashboardLayout';
import ScenarioPicker from './components/Dashboard/ScenarioPicker';
import RealAWSConnect from './components/Dashboard/RealAWSConnect';
import TimelineView from './components/Analysis/TimelineView';
import AttackPathDiagram from './components/Visualizations/AttackPathDiagram';
import AttackPathReactFlow from './components/Visualizations/AttackPathReactFlow';
import VisualAnalysisUpload from './components/Analysis/VisualAnalysisUpload';
import RemediationPlan from './components/Analysis/RemediationPlan';
import DocumentationDisplay from './components/Analysis/DocumentationDisplay';
import ComplianceMapping from './components/Analysis/ComplianceMapping';
import BlastRadiusSimulator from './components/Analysis/BlastRadiusSimulator';
import CostImpact from './components/Analysis/CostImpact';
import SecurityPostureDashboard from './components/Analysis/SecurityPostureDashboard';
import ReportExport from './components/Analysis/ReportExport';
import { demoAPI, orchestrationAPI, visualAPI, documentationAPI, authAPI, incidentHistoryAPI, healthCheck } from './services/api';
import type { AnalysisResponse, DemoScenario, OrchestrationResponse } from './types/incident';
import { formatAnalysisTime, formatLastAnalyzed, maskAccountId } from './utils/formatting';
import { hasAwsServicePrincipalInTimeline } from './utils/awsServiceDetection';
import { deriveSLACheckpoints } from './components/Analysis/SLATracker';
import { demoAnalysisData } from './data/demoAnalysis';
import { getQuickDemoResult } from './data/quickDemoResult';
import { DEFAULT_DEMO_SCENARIOS } from './data/demoScenarios';
import { BLOGS } from './data/blogsData';
import AgentProgress from './components/Analysis/AgentProgress';
import VoiceAssistant from './components/Analysis/VoiceAssistant';
import IncidentHistory from './components/Dashboard/IncidentHistory';
import AIPipelineSecurity from './components/Dashboard/AIPipelineSecurity';
import AISecurityGraph from './components/Dashboard/AISecurityGraph';
import AICompliance from './components/Dashboard/AICompliance';
import DemoChecklist from './components/Dashboard/DemoChecklist';
import AgenticQuery from './components/Analysis/AgenticQuery';
import ChangeSetAnalysis from './components/Analysis/ChangeSetAnalysis';
import ProtocolAdherence from './components/Analysis/ProtocolAdherence';
import LoginPage from './components/Auth/LoginPage';
import OrganizationsDashboard from './components/Dashboard/OrganizationsDashboard';
import { LiveSimulation } from './components/Simulation/LiveSimulation';
import {
  SecurityHealthCheck,
  DEMO_HEALTH_CHECK,
  parseHealthCheckResult,
  type SecurityHealthCheckResult,
} from './components/Analysis/SecurityHealthCheck';

type AppMode = 'landing' | 'login' | 'demo' | 'console';

function App() {
  const [mode, setMode] = useState<AppMode>('landing');
  const [scenarios, setScenarios] = useState<DemoScenario[]>(DEFAULT_DEMO_SCENARIOS);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(() => {
    try { const s = localStorage.getItem('wolfir_analysis_result'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [orchestrationResult, setOrchestrationResult] = useState<OrchestrationResponse | null>(() => {
    try { const s = localStorage.getItem('wolfir_orchestration_result'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [visualAnalysisResult, setVisualAnalysisResult] = useState<any>(null);
  const [remediationPlan, setRemediationPlan] = useState<any>(() => {
    try { const s = localStorage.getItem('wolfir_remediation_plan'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [documentationResult, setDocumentationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [awsProfile, setAwsProfile] = useState<string>(() => {
    try { return localStorage.getItem('wolfir_aws_profile') || 'default'; } catch { return 'default'; }
  });
  const [awsConnected, setAwsConnected] = useState<boolean>(() => {
    try { return localStorage.getItem('wolfir_aws_connected') === 'true'; } catch { return false; }
  });
  const [awsAccountId, setAwsAccountId] = useState<string | null>(() => {
    try { return localStorage.getItem('wolfir_aws_account_id') || null; } catch { return null; }
  });
  const [activeFeature, setActiveFeature] = useState('overview');
  const [useFullAI, setUseFullAI] = useState(false);
  const [backendOffline, setBackendOffline] = useState(() =>
    typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
  );
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [incidentHistoryRefreshTrigger, setIncidentHistoryRefreshTrigger] = useState(0);
  const [visitedFeatures, setVisitedFeatures] = useState<Set<string>>(new Set());
  const [lastDemoScenarioId, setLastDemoScenarioId] = useState<string | null>(null);
  const [simulationScenarioId, setSimulationScenarioId] = useState<string | null>(null);
  const [healthCheckResult, setHealthCheckResult] = useState<SecurityHealthCheckResult | null>(() => {
    try { const s = localStorage.getItem('wolfir_health_check'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [healthCheckLoading, setHealthCheckLoading] = useState(false);
  const [resourcesDropdownOpen, setResourcesDropdownOpen] = useState(false);
  const [cloudTrailEmptyState, setCloudTrailEmptyState] = useState<{ daysBack: number } | null>(null);
  const [accountTeaser, setAccountTeaser] = useState<{ cloudtrail_events_7d: number; iam_users: number; security_hub_findings: number } | null>(null);
  type LandingSection = 'home' | 'product' | 'features' | 'use-cases' | 'faq' | 'pricing' | 'blog' | 'blog-post';
  const [landingSection, setLandingSection] = useState<LandingSection>('home');
  const [blogPostId, setBlogPostId] = useState<string | null>(null);
  const correlationSeededRef = useRef(false);

  const getLandingSection = (h: string): { section: LandingSection; postId: string | null } => {
    if (h === '#product') return { section: 'product', postId: null };
    if (h === '#features') return { section: 'features', postId: null };
    if (h === '#use-cases') return { section: 'use-cases', postId: null };
    if (h === '#faq') return { section: 'faq', postId: null };
    if (h === '#blog') return { section: 'blog', postId: null };
    const blogMatch = h.match(/^#blog\/(\d+)$/);
    if (blogMatch) return { section: 'blog-post', postId: blogMatch[1].padStart(2, '0') };
    if (h === '#pricing') return { section: 'pricing', postId: null };
    return { section: 'home', postId: null };
  };

  useEffect(() => {
    if (activeFeature) setVisitedFeatures((prev) => new Set(prev).add(activeFeature));
  }, [activeFeature]);

  // Persist analysis state to localStorage so results survive tab switches / idle
  useEffect(() => {
    try {
      if (analysisResult) localStorage.setItem('wolfir_analysis_result', JSON.stringify(analysisResult));
      else localStorage.removeItem('wolfir_analysis_result');
    } catch { /* quota exceeded — ignore */ }
  }, [analysisResult]);
  useEffect(() => {
    try {
      if (orchestrationResult) localStorage.setItem('wolfir_orchestration_result', JSON.stringify(orchestrationResult));
      else localStorage.removeItem('wolfir_orchestration_result');
    } catch { /* quota exceeded — ignore */ }
  }, [orchestrationResult]);
  useEffect(() => {
    try {
      if (remediationPlan) localStorage.setItem('wolfir_remediation_plan', JSON.stringify(remediationPlan));
      else localStorage.removeItem('wolfir_remediation_plan');
    } catch { /* quota exceeded — ignore */ }
  }, [remediationPlan]);
  useEffect(() => {
    try {
      if (healthCheckResult) localStorage.setItem('wolfir_health_check', JSON.stringify(healthCheckResult));
      else localStorage.removeItem('wolfir_health_check');
    } catch { /* quota exceeded — ignore */ }
  }, [healthCheckResult]);
  useEffect(() => {
    try {
      localStorage.setItem('wolfir_aws_profile', awsProfile);
      localStorage.setItem('wolfir_aws_connected', String(awsConnected));
      if (awsAccountId) localStorage.setItem('wolfir_aws_account_id', awsAccountId);
      else localStorage.removeItem('wolfir_aws_account_id');
    } catch { /* quota exceeded — ignore */ }
  }, [awsProfile, awsConnected, awsAccountId]);

  useEffect(() => {
    loadScenarios();
    const updateFromHash = () => {
      const h = window.location.hash;
      if (h === '#demo') { setMode('demo'); return; }
      if (h === '#console') { setMode('console'); return; }
      if (h === '#login') { setMode('login'); return; }
      setMode('landing');
      const { section, postId } = getLandingSection(h || '');
      setLandingSection(section);
      setBlogPostId(postId);
    };
    updateFromHash();
    window.addEventListener('hashchange', updateFromHash);
    return () => window.removeEventListener('hashchange', updateFromHash);
  }, []);

  const loadScenarios = async () => {
    // Always use the frontend-defined scenario list — backend shouldn't control what we show.
    setScenarios(DEFAULT_DEMO_SCENARIOS);
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) return;
    // Still ping backend to determine online/offline status
    try {
      await demoAPI.listScenarios();
      setBackendOffline(false);
    } catch {
      // backend offline — demo mode still works fully with local scenarios
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) return;
    healthCheck().then((ok) => setBackendOffline(!ok));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) return;
    if (mode === 'demo' || mode === 'console') {
      healthCheck().then((ok) => setBackendOffline(!ok));
    }
  }, [mode]);

  // Seed scenario 1 silently on first demo load so correlation shows when judges run scenario 2
  useEffect(() => {
    if (mode !== 'demo' || correlationSeededRef.current) return;
    correlationSeededRef.current = true;
    demoAPI.getQuickDemo('crypto-mining').catch(() => { /* Backend offline — skip */ });
  }, [mode]);

  const resetAnalysis = () => {
    setAnalysisResult(null);
    setOrchestrationResult(null);
    setVisualAnalysisResult(null);
    setRemediationPlan(null);
    setDocumentationResult(null);
    setHealthCheckResult(null);
    setCloudTrailEmptyState(null);
    setAccountTeaser(null);
    setError(null);
    setActiveFeature('overview');
    try {
      ['wolfir_analysis_result', 'wolfir_orchestration_result', 'wolfir_remediation_plan', 'wolfir_health_check'].forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
  };

  const handleHealthCheck = async () => {
    try {
      setHealthCheckLoading(true);
      setError(null);
      setHealthCheckResult(null);
      const backendOk = await healthCheck();
      if (backendOk) {
        const data = await orchestrationAPI.runSecurityHealthCheck(awsProfile, awsAccountId || undefined);
        const parsed = parseHealthCheckResult(data.results, data.account_id);
        setHealthCheckResult(parsed);
      } else {
        setHealthCheckResult(DEMO_HEALTH_CHECK);
      }
    } catch (err: any) {
      console.error('Health check error:', err);
      setHealthCheckResult(DEMO_HEALTH_CHECK);
      setError('Backend unreachable. Showing demo health report.');
    } finally {
      setHealthCheckLoading(false);
    }
  };

  const goBack = () => {
    setMode('landing');
    resetAnalysis();
    window.location.hash = '';
  };

  const handleSelectScenario = async (scenarioId: string) => {
    setLastDemoScenarioId(scenarioId);
    setLoading(true);
    setError(null);
    resetAnalysis();

    const useClientSideFallback = backendOffline || !useFullAI;

    try {
      let result;

      if (useClientSideFallback) {
        result = getQuickDemoResult(scenarioId);
      } else {
        let incidentType = 'Unknown';
        if (scenarioId === 'crypto-mining') incidentType = 'Cryptocurrency Mining Attack';
        else if (scenarioId === 'data-exfiltration') incidentType = 'Data Exfiltration';
        else if (scenarioId === 'privilege-escalation') incidentType = 'Privilege Escalation';
        else if (scenarioId === 'unauthorized-access') incidentType = 'Unauthorized Access';
        else if (scenarioId === 'shadow-ai') incidentType = 'Shadow AI / LLM Abuse';
        else if (scenarioId === 'organizations-breach') incidentType = 'AWS Organizations Cross-Account Breach';

        let events: any[] = [];
        if (scenarioId === 'crypto-mining') events = (await demoAPI.getCryptoMiningScenario()).events;
        else if (scenarioId === 'data-exfiltration') events = (await demoAPI.getDataExfiltrationScenario()).events;
        else if (scenarioId === 'privilege-escalation') events = (await demoAPI.getPrivilegeEscalationScenario()).events;
        else if (scenarioId === 'unauthorized-access') events = (await demoAPI.getUnauthorizedAccessScenario()).events;
        else if (scenarioId === 'shadow-ai') events = (await demoAPI.getShadowAIScenario()).events;
        else if (scenarioId === 'organizations-breach') events = (await demoAPI.getPrivilegeEscalationScenario()).events; // reuse priv-esc events as base
        result = await orchestrationAPI.analyzeIncident(events, undefined, incidentType);
        setBackendOffline(false);
      }

      setOrchestrationResult(result);

      if (result.results.remediation_plan) {
        setRemediationPlan(result.results.remediation_plan);
      }

      if (result.results.timeline) {
        setAnalysisResult({
          incident_id: result.incident_id,
          timeline: result.results.timeline,
          analysis_time_ms: result.analysis_time_ms,
          model_used: useClientSideFallback ? 'Instant demo (client-side)' : 'Multi-Agent Orchestration (Nova 2 Lite, Nova Pro, Nova Micro)',
        });
      } else {
        setAnalysisResult(demoAnalysisData);
      }
    } catch (err: any) {
      console.error('Orchestration error:', err);
      const fallback = getQuickDemoResult(scenarioId);
      setOrchestrationResult(fallback);
      setRemediationPlan(fallback.results.remediation_plan);
      setAnalysisResult({
        incident_id: fallback.incident_id,
        timeline: fallback.results.timeline ?? demoAnalysisData.timeline,
        analysis_time_ms: fallback.analysis_time_ms,
        model_used: 'Instant demo (fallback)',
      });
      setError(err.message || 'Backend unreachable. Showing instant demo.');
    } finally {
      setLoading(false);
      setIncidentHistoryRefreshTrigger((t) => t + 1);
    }
  };

  const handleRealAWSAnalysis = async (daysBack: number, maxEvents: number) => {
    try {
      setLoading(true);
      setError(null);
      resetAnalysis();

      // Single backend call: fetch CloudTrail + run orchestration (no double analysis)
      const result = await orchestrationAPI.analyzeFromCloudTrail(
        daysBack,
        maxEvents,
        awsProfile,
        awsAccountId || undefined
      );

      if ((result as any).status === 'no_events') {
        setCloudTrailEmptyState({ daysBack });
        setError(null);
        setLoading(false);
        return;
      }

      setOrchestrationResult(result);

      if (result.results?.remediation_plan) {
        setRemediationPlan(result.results.remediation_plan);
      }

      const tl = result.results?.timeline;
      const eventsCount = (result as any).events_analyzed ?? tl?.events?.length ?? 0;
      const derivedIncidentType =
        result.metadata?.incident_type ||
        tl?.attack_pattern ||
        tl?.root_cause ||
        `Real AWS (last ${daysBack} days)`;

      setAnalysisResult({
        incident_id: result.incident_id,
        timeline: tl,
        analysis_time_ms: result.analysis_time_ms || 0,
        model_used: 'Multi-Agent Orchestration (Real AWS)',
        incident_type: derivedIncidentType,
        events_analyzed: eventsCount,
        time_range_days: daysBack,
      } as any);
    } catch (err: any) {
      console.error('Real AWS analysis error:', err);
      setError('Failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
      setIncidentHistoryRefreshTrigger((t) => t + 1);
    }
  };

  // ========== RENDER FEATURE CONTENT ==========
  const renderFeatureContent = () => {
    // Health check loading
    if (healthCheckLoading) {
      return (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Running Security Health Check</h3>
                  <p className="text-xs text-slate-500">5 Autonomous Agent queries: IAM, CloudTrail, Billing, Security Hub</p>
                </div>
              </div>
              <div className="space-y-2">
                {['IAM users audit', 'IAM roles audit', 'CloudTrail anomalies', 'CloudWatch billing', 'Security Hub'].map((label, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-100"
                  >
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    // Health check result (proactive audit — no incident) — only on Security Overview tab
    if (healthCheckResult && activeFeature === 'overview') {
      return (
        <SecurityHealthCheck
          result={healthCheckResult}
          onNewCheck={() => { setHealthCheckResult(null); }}
          demoMode={backendOffline}
        />
      );
    }

    // Loading state (incident analysis)
    if (loading) {
      const agents = [
        { name: 'Detect', model: 'Nova Pro', Icon: Eye, delay: 0 },
        { name: 'Investigate', model: 'Nova 2 Lite', Icon: Brain, delay: 1 },
        { name: 'Classify', model: 'Nova Micro', Icon: Zap, delay: 2 },
        { name: 'Remediate', model: 'Orchestrator', Icon: Shield, delay: 3 },
        { name: 'Document', model: 'Nova 2 Lite', Icon: FileText, delay: 4 },
      ];

      return (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden"
          >
            {/* Progress bar */}
            <div className="h-1 bg-slate-100 overflow-hidden">
              <motion.div
                className="h-full bg-indigo-500"
                animate={{ width: ['0%', '100%'] }}
                transition={{ duration: 25, ease: 'easeInOut' }}
              />
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 className="w-5 h-5 text-indigo-600" />
                </motion.div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Running Multi-Agent Pipeline</h3>
                  <p className="text-xs text-slate-500">5 Nova AI models analyzing your incident</p>
                </div>
              </div>

              {/* Agent Steps */}
              <div className="space-y-2">
                {agents.map((agent, i) => (
                  <motion.div
                    key={agent.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <motion.div
                      className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center"
                      animate={i < 2 ? { backgroundColor: ['#e0e7ff', '#c7d2fe', '#e0e7ff'] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <agent.Icon className="w-4 h-4 text-indigo-600" />
                    </motion.div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-900">{agent.name}</p>
                      <p className="text-[10px] text-slate-400">{agent.model}</p>
                    </div>
                    <div className="w-24">
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-indigo-500 rounded-full"
                          animate={{ width: ['0%', '100%'] }}
                          transition={{ duration: 6 + i * 2, delay: i * 1.5, ease: 'easeInOut' }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <p className="text-center text-[10px] text-slate-400 mt-4">
                {useFullAI ? 'Estimated time: ~30 seconds (full Nova AI)' : 'Instant demo: ~2 seconds'}
              </p>
            </div>
          </motion.div>
          {orchestrationResult && <AgentProgress agents={orchestrationResult.agents} />}
        </div>
      );
    }

    // Standalone tools — no incident analysis required
    if (activeFeature === 'changeset') {
      return <ChangeSetAnalysis backendOffline={backendOffline} />;
    }

    // CloudTrail empty state — friendly UI when no events found
    if (mode === 'console' && cloudTrailEmptyState) {
      return (
        <div className="space-y-6">
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/80 p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-emerald-600" strokeWidth={1.8} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No security events in the last {cloudTrailEmptyState.daysBack} days</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
              Your account is quiet! Try expanding to 30 days or checking a different region.
            </p>
            <button
              onClick={() => setCloudTrailEmptyState(null)}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors"
            >
              Try Different Parameters
            </button>
          </div>
          <RealAWSConnect
            onAnalyze={handleRealAWSAnalysis}
            onHealthCheck={handleHealthCheck}
            loading={loading}
            healthCheckLoading={healthCheckLoading}
          />
        </div>
      );
    }

    // No analysis yet — show scenario picker or AWS connect (unless we have health check result — then let switch handle tab-specific empty states)
    if (!analysisResult && !healthCheckResult) {
      if (mode === 'demo') {
        return (
          <ScenarioPicker
            scenarios={scenarios}
            onSelectScenario={handleSelectScenario}
            onStartSimulation={(id) => setSimulationScenarioId(id)}
            loading={loading}
            useFullAI={useFullAI}
            onUseFullAIChange={setUseFullAI}
          />
        );
      }
      if (mode === 'console') {
        return (
          <div className="space-y-5">
            {/* Connection Card */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {/* Header */}
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Connect Your AWS Account</h2>
                </div>
                <p className="text-xs text-slate-500 ml-11">Credentials stay local — never transmitted or stored.</p>
              </div>

              {/* Auth Form — CLI Profile only (secure method) */}
              <div className="px-6 pb-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5 p-3 bg-indigo-50 border border-indigo-100 rounded-xl mb-3">
                    <Shield className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-indigo-600 leading-relaxed">
                      CLI Profile only — Access Keys removed (security best practice). For SSO, run <code className="bg-indigo-100 px-1 rounded font-mono">aws sso login</code> first, then use your profile name below.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Profile Name</label>
                    <input
                      type="text"
                      value={awsProfile}
                      onChange={(e) => setAwsProfile(e.target.value)}
                      placeholder="default"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Run <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">aws configure</code> or <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">aws sso login</code> first.
                    </p>
                  </div>
                </div>

                {/* Test Connection */}
                <div className="mt-4 space-y-3">
                  <button
                    onClick={async () => {
                      setConnectionLoading(true);
                      setConnectionError(null);
                      try {
                        {
                          const result = await authAPI.testConnection(awsProfile);
                          setAwsConnected(result.connected);
                          setAwsAccountId(result.account_id || null);
                          if (result.connected) {
                            setConnectionError(null);
                            authAPI.getAccountTeaser(awsProfile || undefined).then((t) => setAccountTeaser(t)).catch(() => {});
                          } else {
                            setConnectionError('Connection failed. Check your profile name and run aws configure or aws sso login first.');
                          }
                        }
                      } catch (err: any) {
                        setAwsConnected(false);
                        const msg = err?.response?.data?.detail || err?.message;
                        setConnectionError(
                          err?.response
                            ? `Connection failed: ${msg || 'Check backend logs.'}`
                            : 'Backend unreachable. Start backend: cd backend && uvicorn main:app --reload'
                        );
                      } finally {
                        setConnectionLoading(false);
                      }
                    }}
                    disabled={connectionLoading}
                    className="w-full px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {connectionLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
                    ) : awsConnected ? (
                      <><CheckCircle2 className="w-4 h-4" /> Connected — Test Again</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4" /> Test Connection</>
                    )}
                  </button>

                  {awsConnected && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-emerald-700">Connected</span>
                        {awsAccountId && <span className="text-[10px] text-emerald-600 ml-auto font-mono">{maskAccountId(awsAccountId)}</span>}
                      </div>
                      {accountTeaser && (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                            <p className="text-sm font-bold text-slate-900">{accountTeaser.cloudtrail_events_7d.toLocaleString()}</p>
                            <p className="text-[10px] text-slate-500">Events (7d)</p>
                          </div>
                          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                            <p className="text-sm font-bold text-slate-900">{accountTeaser.iam_users}</p>
                            <p className="text-[10px] text-slate-500">IAM Users</p>
                          </div>
                          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                            <p className="text-sm font-bold text-slate-900">{accountTeaser.security_hub_findings}</p>
                            <p className="text-[10px] text-slate-500">Hub Findings</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {connectionError && (
                    <p className="text-xs text-amber-700 bg-amber-50 px-4 py-2.5 rounded-xl border border-amber-200">
                      {connectionError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Analysis Trigger — Health Check + CloudTrail */}
            <RealAWSConnect
              onAnalyze={handleRealAWSAnalysis}
              onHealthCheck={handleHealthCheck}
              loading={loading}
              healthCheckLoading={healthCheckLoading}
            />
          </div>
        );
      }
      return null;
    }

    // ========== Analysis results — render by active feature ==========
    switch (activeFeature) {
      case 'overview': {
        const ar = analysisResult;
        if (!ar) {
          if (healthCheckResult) {
            return (
              <SecurityHealthCheck
                result={healthCheckResult}
                onNewCheck={() => { setHealthCheckResult(null); }}
                demoMode={backendOffline}
              />
            );
          }
          return (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <Shield className="w-14 h-14 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Run a scenario to get started</h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
                Security Overview shows your incident analysis. In Demo mode, pick a scenario below. In Console mode, connect AWS and analyze CloudTrail.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {mode === 'demo' && (
                  <button
                    onClick={resetAnalysis}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Choose Demo Scenario
                  </button>
                )}
                {mode === 'console' && (
                  <p className="text-xs text-slate-500">Connect your AWS account in the main view to analyze CloudTrail.</p>
                )}
              </div>
            </div>
          );
        }
        return (
          <div className="space-y-5">
            {/* ── INCIDENT HEADER ─────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-indigo-50/60 to-slate-50/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-indigo-600" strokeWidth={1.8} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 mb-0.5">
                        <h2 className="text-base font-bold text-slate-900">Incident {ar.incident_id}</h2>
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span className="text-[11px] font-bold text-emerald-700">{(ar.timeline.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Analyzed in <span className="font-semibold text-slate-700">{formatAnalysisTime(ar.analysis_time_ms)}</span>
                        <span className="text-slate-400 mx-1">·</span>
                        Last analyzed: <span className="font-medium text-slate-600">{formatLastAnalyzed(ar.timeline)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {orchestrationResult && (
                      <div className="hidden sm:flex flex-wrap gap-1.5">
                        {orchestrationResult.results.risk_scores && (
                          <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200 font-semibold">
                            {orchestrationResult.results.risk_scores.length} Risk Scores
                          </span>
                        )}
                        {orchestrationResult.results.remediation_plan && (
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200 font-semibold">
                            Remediation Ready
                          </span>
                        )}
                        {(() => {
                          const checkpoints = deriveSLACheckpoints(orchestrationResult.analysis_time_ms ?? 0, !!orchestrationResult.results?.remediation_plan, !!orchestrationResult.results?.documentation);
                          return checkpoints.every(c => c.status === 'met') ? (
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200 font-semibold">SLA met</span>
                          ) : null;
                        })()}
                      </div>
                    )}
                    <button onClick={resetAnalysis} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
                      New Analysis
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── ORGANIZATIONS DASHBOARD — shown when org scenario is selected ── */}
            {lastDemoScenarioId === 'organizations-breach' && mode === 'demo' && (
              <OrganizationsDashboard awsAccountId={null} isRealMode={false} />
            )}

            {/* ── MAIN DASHBOARD (charts + KPIs) — PRIMARY CONTENT ── */}
            {lastDemoScenarioId !== 'organizations-breach' && <SecurityPostureDashboard
              timeline={analysisResult.timeline}
              orchestrationResult={orchestrationResult}
              analysisTime={analysisResult.analysis_time_ms}
              incidentId={analysisResult.incident_id}
              onNavigateToCostImpact={() => setActiveFeature('cost')}
              onNavigateToTimeline={() => setActiveFeature('timeline')}
              onNavigateToIncidentHistory={() => setActiveFeature('incident-history')}
              onNavigateToProtocol={() => setActiveFeature('protocol')}
              onNavigateToExport={() => setActiveFeature('export')}
              onNavigateToRemediation={() => setActiveFeature('remediation')}
            />}

            {/* ── SECONDARY INFO — Pipeline + Agent details ───────── */}
            {orchestrationResult && lastDemoScenarioId !== 'organizations-breach' && <AgentProgress agents={orchestrationResult.agents} />}

            {/* ── CONTEXTUAL WARNINGS — collapsed / de-emphasised ─── */}
            {(
              (orchestrationResult?.metadata?.agent_pivot) ||
              (typeof (ar as any)?.events_analyzed === 'number' && (ar as any).events_analyzed <= 5) ||
              hasAwsServicePrincipalInTimeline(analysisResult.timeline) ||
              orchestrationResult
            ) && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 divide-y divide-slate-100 overflow-hidden">
                {/* Agentic CTA */}
                {orchestrationResult && (
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-600">
                      The pipeline ran {Object.keys(orchestrationResult.agents || {}).length || 4} agents in sequence. Want to see the agent think for itself?
                    </p>
                    <button onClick={() => setActiveFeature('agentic-query')}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 border border-indigo-200 rounded-lg transition-colors">
                      Try Autonomous Agent <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {/* Agent Pivot */}
                {orchestrationResult?.metadata?.agent_pivot && (
                  <div className="px-4 py-3 flex items-start gap-3">
                    <Zap className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" strokeWidth={1.8} />
                    <div>
                      <p className="text-xs font-bold text-violet-700">Agent pivot detected</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">{orchestrationResult.metadata.agent_pivot}</p>
                    </div>
                  </div>
                )}
                {/* Low event warning */}
                {typeof (ar as any)?.events_analyzed === 'number' && (ar as any).events_analyzed <= 5 && typeof (ar as any)?.time_range_days === 'number' && (
                  <div className="px-4 py-3 flex items-start gap-3">
                    <Eye className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" strokeWidth={1.8} />
                    <p className="text-[11px] text-slate-600">
                      <span className="font-semibold">Limited event data:</span> analysis based on {(ar as any).events_analyzed} events from the last {(ar as any).time_range_days} days. Consider increasing time range.
                    </p>
                  </div>
                )}
                {/* AWS service principal */}
                {hasAwsServicePrincipalInTimeline(analysisResult.timeline) && (
                  <div className="px-4 py-3 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" strokeWidth={1.8} />
                    <p className="text-[11px] text-slate-600">
                      <span className="font-semibold">AWS service activity detected:</span> One or more actors appear to be AWS service principals (*.amazonaws.com) — often benign automated activity. Verify before treating as malicious.
                    </p>
                  </div>
                )}
                {/* Validation note */}
                <div className="px-4 py-3 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" strokeWidth={1.8} />
                  <p className="text-[11px] text-slate-500">wolfir flags potential threats. Always validate before treating findings as confirmed.</p>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'timeline':
        if (!analysisResult) {
          return (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700 mb-1">No incident timeline yet</p>
              <p className="text-xs text-slate-500">{mode === 'console' ? 'Run "Investigate Threats" to fetch CloudTrail events and build a timeline.' : 'Select a demo scenario to see the incident timeline.'}</p>
            </div>
          );
        }
        return <TimelineView timeline={analysisResult.timeline} onNavigateToExport={() => setActiveFeature('export')} />;

      case 'incident-history':
        return (
          <IncidentHistory
            accountId={mode === 'console' && awsAccountId ? awsAccountId : 'demo-account'}
            refreshTrigger={incidentHistoryRefreshTrigger}
            backendOffline={backendOffline}
            onSelectIncident={async (id) => {
              if (id === orchestrationResult?.incident_id) {
                setActiveFeature('overview');
                return;
              }
              const acctId = mode === 'console' && awsAccountId ? awsAccountId : 'demo-account';
              try {
                setLoading(true);
                setError(null);
                const inc = await incidentHistoryAPI.getIncident(id, acctId);
                const minimalTimeline = {
                  events: [],
                  root_cause: inc.summary || inc.attack_type || 'Security incident',
                  attack_pattern: inc.attack_type || 'Unknown',
                  blast_radius: (Array.isArray(inc.affected_resources) && inc.affected_resources.length ? `${inc.affected_resources.length} resources` : 'Unknown'),
                  confidence: 0.7,
                };
                setAnalysisResult({
                  incident_id: inc.incident_id,
                  timeline: minimalTimeline,
                  analysis_time_ms: 0,
                  model_used: 'Incident History (summary only)',
                });
                setOrchestrationResult({
                  incident_id: inc.incident_id,
                  status: 'completed',
                  analysis_time_ms: 0,
                  agents: {},
                  results: { timeline: minimalTimeline },
                  metadata: { incident_type: inc.attack_type },
                });
                setRemediationPlan(null);
                setActiveFeature('overview');
              } catch {
                setError('Could not load incident details. It may have been analyzed in a previous session.');
              } finally {
                setLoading(false);
              }
            }}
            onRunDemoClick={() => { setMode('demo'); window.location.hash = '#demo'; }}
          />
        );

      case 'attack-path': {
        if (!analysisResult) {
          return (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700 mb-1">No attack path yet</p>
              <p className="text-xs text-slate-500">{mode === 'console' ? 'Run "Investigate Threats" to detect attack patterns and visualize the kill chain.' : 'Select a demo scenario to visualize the attack path.'}</p>
            </div>
          );
        }
        const useNarrative = mode === 'demo' || !!orchestrationResult?.metadata?.quick_demo;
        const demoIncidentType =
          orchestrationResult?.metadata?.incident_type ||
          (orchestrationResult?.metadata as any)?.scenario ||
          (analysisResult as any)?.scenario_id || '';
        if (useNarrative) {
          return (
            <AttackPathReactFlow
              incidentType={demoIncidentType}
              timeline={analysisResult?.timeline}
              demoMode={mode === 'demo' || backendOffline}
              onNavigateToRemediation={() => setActiveFeature('remediation')}
            />
          );
        }
        return (
          <AttackPathDiagram
            timeline={analysisResult.timeline}
            orchestrationResult={orchestrationResult}
            onNavigateToRemediation={() => setActiveFeature('remediation')}
            useNarrativeDemoGraph={false}
            eventsAnalyzed={(analysisResult as any)?.events_analyzed}
            timeRangeDays={(analysisResult as any)?.time_range_days}
          />
        );
      }

      case 'compliance':
        if (!analysisResult) {
          return (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700 mb-1">No compliance data yet</p>
              <p className="text-xs text-slate-500">{mode === 'console' ? 'Run a threat investigation to map findings to MITRE, NIST, and CIS frameworks.' : 'Select a demo scenario to see compliance mapping.'}</p>
            </div>
          );
        }
        return (
          <ComplianceMapping
            timeline={analysisResult.timeline}
            incidentType={orchestrationResult?.metadata?.incident_type}
            awsAccountId={mode === 'console' ? awsAccountId : null}
          />
        );

      case 'cost':
        if (!analysisResult) {
          return (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700 mb-1">No cost impact data yet</p>
              <p className="text-xs text-slate-500">{mode === 'console' ? 'Run a threat investigation to estimate financial impact of detected incidents.' : 'Select a demo scenario to see cost impact.'}</p>
            </div>
          );
        }
        return (
          <CostImpact
            timeline={analysisResult.timeline}
            incidentType={
              orchestrationResult?.metadata?.incident_type ||
              orchestrationResult?.results?.timeline?.attack_pattern ||
              (analysisResult as any)?.incident_type
            }
            eventsAnalyzed={(analysisResult as any)?.events_analyzed}
            timeRangeDays={(analysisResult as any)?.time_range_days}
            hasAwsServicePrincipal={hasAwsServicePrincipalInTimeline(analysisResult.timeline)}
          />
        );

      case 'organizations':
        return (
          <OrganizationsDashboard
            awsAccountId={awsAccountId}
            isRealMode={mode === 'console' && !!awsAccountId}
          />
        );

      case 'protocol':
        return analysisResult ? (
          <ProtocolAdherence
            timeline={analysisResult.timeline}
            remediationPlan={remediationPlan || orchestrationResult?.results?.remediation_plan}
            documentation={documentationResult || orchestrationResult?.results?.documentation}
            backendOffline={backendOffline}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Run an analysis to see IR protocol adherence.</p>
          </div>
        );

      case 'remediation':
        return remediationPlan ? (
          <RemediationPlan
            plan={remediationPlan}
            incidentId={orchestrationResult?.incident_id || analysisResult?.incident_id}
            incidentType={orchestrationResult?.metadata?.incident_type || analysisResult?.timeline?.attack_pattern || 'Security Incident'}
            rootCause={analysisResult?.timeline?.root_cause || orchestrationResult?.results?.timeline?.root_cause || 'Unknown'}
            onNavigateToFeature={setActiveFeature}
            affectedResources={(() => {
              const tl = analysisResult?.timeline || orchestrationResult?.results?.timeline;
              const blast = tl?.blast_radius;
              const events = tl?.events || [];
              const resources = new Set<string>();
              events.forEach((e: any) => {
                if (e?.resource?.ARN) resources.add(e.resource.ARN);
                if (e?.requestParameters?.roleName) resources.add(`arn:aws:iam::*:role/${e.requestParameters.roleName}`);
              });
              return blast ? [blast] : Array.from(resources).slice(0, 5);
            })()}
            demoMode={mode === 'demo'}
            onApprove={async () => {
              try {
                setLoading(true);
                setError(null);
                if (orchestrationResult?.incident_id && orchestrationResult.results.timeline) {
                  const tl = orchestrationResult.results.timeline;
                  const docResult = await documentationAPI.generateDocumentation(
                    orchestrationResult.incident_id,
                    { severity: 'CRITICAL', ...tl } as any,
                    tl,
                    remediationPlan || orchestrationResult.results.remediation_plan
                  );
                  setDocumentationResult(docResult);
                  setOrchestrationResult(prev => prev ? {
                    ...prev,
                    agents: { ...prev.agents, documentation: { status: 'COMPLETED' } },
                    results: { ...prev.results, documentation: docResult }
                  } : null);
                  setActiveFeature('documentation');
                }
              } catch {
                // Backend offline — DocumentationDisplay shows client-generated docs
              } finally {
                setLoading(false);
              }
            }}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Remediation plan not yet generated.</p>
          </div>
        );

      case 'agentic-query':
        return <AgenticQuery backendOffline={backendOffline} />;

      case 'blast-radius':
        return (
          <BlastRadiusSimulator
            timeline={analysisResult?.timeline}
            incidentType={orchestrationResult?.metadata?.incident_type || (orchestrationResult?.metadata as any)?.scenario || ''}
            awsAccountId={awsAccountId}
            backendOffline={backendOffline}
          />
        );

      case 'visual':
        return (
          <VisualAnalysisUpload
            timeline={analysisResult?.timeline}
            orchestrationResult={orchestrationResult}
            onNavigateToRemediation={() => setActiveFeature('remediation')}
            onUpload={async (file) => {
              try {
                setLoading(true);
                setError(null);
                if (orchestrationResult?.incident_id) {
                  const result = await orchestrationAPI.analyzeIncident(
                    orchestrationResult.results.timeline?.events || [],
                    file,
                    orchestrationResult.metadata?.incident_type
                  );
                  setOrchestrationResult(result);
                  setVisualAnalysisResult(result.results.visual);
                } else {
                  const result = await visualAPI.analyzeDiagram(file);
                  setVisualAnalysisResult(result);
                }
              } catch (err: any) {
                setError('Visual analysis error: ' + (err.response?.data?.detail || err.message));
              } finally {
                setLoading(false);
              }
            }}
            analysisResult={visualAnalysisResult}
            loading={loading}
          />
        );

      case 'aria':
        return (
          <div className="space-y-4">
            {/* Aria tab IS the voice interface — embedded, no pointer to floating button */}
            <VoiceAssistant
              incidentContext={orchestrationResult?.results ? {
                timeline: orchestrationResult.results.timeline,
                remediation_plan: orchestrationResult.results.remediation_plan,
                risk_scores: orchestrationResult.results.risk_scores,
                correlation: orchestrationResult.results.correlation,
                incident_id: orchestrationResult.incident_id,
                incident_type: orchestrationResult.metadata?.incident_type,
              } : undefined}
              incidentId={orchestrationResult?.incident_id || analysisResult?.incident_id}
              isAnalysisComplete={!!analysisResult && !loading}
              awsAccountId={mode === 'console' ? awsAccountId : null}
              embedded
            />
          </div>
        );

      case 'documentation':
        return analysisResult ? (
          <DocumentationDisplay
            documentation={(documentationResult || orchestrationResult?.results?.documentation)?.documentation || (documentationResult || orchestrationResult?.results?.documentation)}
            incidentId={orchestrationResult?.incident_id || analysisResult?.incident_id || 'Unknown'}
            timeline={analysisResult.timeline}
            remediationPlan={remediationPlan || orchestrationResult?.results?.remediation_plan}
            demoMode={mode === 'demo'}
            onGenerateDocumentation={async () => {
              try {
                setLoading(true);
                setError(null);
                const incId = orchestrationResult?.incident_id || analysisResult?.incident_id;
                const tl = analysisResult?.timeline || orchestrationResult?.results?.timeline;
                const remPlan = remediationPlan || orchestrationResult?.results?.remediation_plan;
                if (!incId || !tl) return;
                const docResult = await documentationAPI.generateDocumentation(
                  incId,
                  { severity: 'CRITICAL', ...tl } as any,
                  tl,
                  remPlan
                );
                setDocumentationResult(docResult);
                if (orchestrationResult) {
                  setOrchestrationResult(prev => prev ? {
                    ...prev,
                    agents: { ...prev.agents, documentation: { status: 'COMPLETED' } },
                    results: { ...prev.results, documentation: docResult }
                  } : null);
                }
              } catch {
                // Backend offline — DocumentationDisplay shows client-generated docs
              } finally {
                setLoading(false);
              }
            }}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">{mode === 'console' ? 'Run a threat investigation first to generate documentation.' : 'Select a demo scenario first.'}</p>
            <button
              onClick={() => setActiveFeature('overview')}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              {mode === 'console' ? 'Back to Overview →' : 'Go to Demo Scenarios →'}
            </button>
          </div>
        );

      case 'ai-pipeline':
        return <AIPipelineSecurity onNavigateToFeature={setActiveFeature} />;

      case 'security-graph':
        return <AISecurityGraph incidentType={orchestrationResult?.metadata?.incident_type || (orchestrationResult?.metadata as any)?.scenario || ''} />;

      case 'ai-compliance':
        return <AICompliance incidentType={orchestrationResult?.metadata?.incident_type || (orchestrationResult?.metadata as any)?.scenario || ''} />;

      case 'export':
        return analysisResult ? (
          <ReportExport
            timeline={analysisResult.timeline}
            orchestrationResult={orchestrationResult}
            incidentId={analysisResult.incident_id}
            analysisTime={analysisResult.analysis_time_ms}
            remediationPlan={remediationPlan}
            incidentType={orchestrationResult?.metadata?.incident_type || 'Security Incident'}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Run a demo scenario or AWS analysis first.</p>
          </div>
        );

      default:
        return null;
    }
  };

  const handleSimulationComplete = () => {
    const id = simulationScenarioId;
    setSimulationScenarioId(null);
    if (id) handleSelectScenario(id);
  };

  const handleLoginTryDemo = () => {
    setMode('demo');
    window.location.hash = '#demo';
  };

  const handleLoginConnectAWS = () => {
    setMode('console');
    window.location.hash = '#console';
  };

  const handleBackToHome = () => {
    setMode('landing');
    window.location.hash = '';
  };

  // ========== LOGIN PAGE (Premium gate) ==========
  if (mode === 'login') {
    return (
      <LoginPage
        onTryDemo={handleLoginTryDemo}
        onConnectAWS={handleLoginConnectAWS}
        onBackToHome={handleBackToHome}
      />
    );
  }

  // ========== DEMO or CONSOLE MODE ==========
  if (mode === 'demo' || mode === 'console') {
    return (
      <>
        {simulationScenarioId && (
          <LiveSimulation
            scenarioId={simulationScenarioId}
            onComplete={handleSimulationComplete}
            onSkip={handleSimulationComplete}
          />
        )}
        {!simulationScenarioId && (
        <DashboardLayout
          mode={mode}
          activeFeature={activeFeature}
          onFeatureChange={setActiveFeature}
          onBack={goBack}
          onBackToScenarios={mode === 'demo' ? resetAnalysis : undefined}
          hasAnalysis={!!analysisResult}
          awsAccountId={awsAccountId}
          headerRight={
            <div className="flex items-center gap-3">
              {typeof window !== 'undefined' && !window.location.hostname.includes('vercel.app') && (
                <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-semibold ${
                  backendOffline ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                }`} title={backendOffline ? 'Backend unreachable — using demo data' : 'Backend connected'}>
                  <div className={`w-1.5 h-1.5 rounded-full ${backendOffline ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  {backendOffline ? 'Offline' : 'Online'}
                </div>
              )}
              {mode === 'console' && awsAccountId && (
                <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg" title={`Account: ${awsAccountId}`}>
                  <span className="text-[10px] font-medium text-indigo-600 uppercase tracking-wider">AWS</span>
                  <span className="ml-1.5 text-xs font-mono font-bold text-indigo-800">{maskAccountId(awsAccountId)}</span>
                </div>
              )}
              {mode === 'demo' && analysisResult && (
                <DemoChecklist
                  runScenarioDone={!!orchestrationResult}
                  visitedFeatures={visitedFeatures}
                  activeFeature={activeFeature}
                  onNavigate={setActiveFeature}
                />
              )}
              {analysisResult && lastDemoScenarioId && mode === 'demo' && (
                <button
                  onClick={() => setSimulationScenarioId(lastDemoScenarioId)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                  title="Replay attack simulation"
                >
                  <Play className="w-3 h-3" />
                  Simulation
                </button>
              )}
              {analysisResult && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-emerald-700">Analysis Complete</span>
                </div>
              )}
              {loading && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg">
                  <Loader2 className="w-3 h-3 text-slate-600 animate-spin" />
                  <span className="text-xs font-bold text-slate-700">Analyzing...</span>
                </div>
              )}
            </div>
          }
        >
          {/* Backend offline (subtle) */}
          {backendOffline && !error && (
            <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 mb-4 flex items-center gap-2">
              <span className="text-xs text-slate-600">
                Demo mode — backend offline. Instant demo works. For full AI, start backend: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-700">cd backend && uvicorn main:app --reload</code>
              </span>
            </div>
          )}
          {/* Prominent fallback banner — when useFullAI was ON but backend offline, user sees demo data */}
          {mode === 'demo' && analysisResult?.model_used === 'Instant demo (fallback)' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-500 border-2 border-amber-600 rounded-xl px-4 py-3 flex items-center gap-3 mb-4 shadow-lg"
            >
              <AlertCircle className="h-6 w-6 text-amber-900 flex-shrink-0" strokeWidth={2.5} />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-950">
                  You are viewing demo data — backend was unreachable for full AI analysis
                </p>
                <p className="text-xs text-amber-900/90 mt-0.5">
                  Start the backend for real Nova AI: <code className="bg-amber-600/30 px-1.5 py-0.5 rounded font-mono text-[11px]">cd backend && uvicorn main:app --reload</code>
                </p>
              </div>
            </motion.div>
          )}

          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start justify-between gap-3 mb-6"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-red-900">Error</h4>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {lastDemoScenarioId && mode === 'demo' && (
                  <button
                    onClick={() => { setError(null); handleSelectScenario(lastDemoScenarioId); }}
                    className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" /> Retry
                  </button>
                )}
                <button
                  onClick={() => { setActiveFeature('overview'); setError(null); }}
                  className="px-3 py-1.5 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                >
                  Back to Overview
                </button>
                <button
                  onClick={() => setError(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}

          {/* Feature Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeFeature + (loading ? '-loading' : '')}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {renderFeatureContent()}
            </motion.div>
          </AnimatePresence>
        </DashboardLayout>
        )}

        {/* Voice Assistant — hidden during simulation and when on Aria tab (tab is the interface) */}
        {!simulationScenarioId && activeFeature !== 'aria' && (
        <VoiceAssistant
          incidentContext={orchestrationResult?.results ? {
            timeline: orchestrationResult.results.timeline,
            remediation_plan: orchestrationResult.results.remediation_plan,
            risk_scores: orchestrationResult.results.risk_scores,
            correlation: orchestrationResult.results.correlation,
            incident_id: orchestrationResult.incident_id,
            incident_type: orchestrationResult.metadata?.incident_type,
          } : undefined}
          incidentId={orchestrationResult?.incident_id || analysisResult?.incident_id}
          isAnalysisComplete={!!analysisResult && !loading}
        />
        )}
      </>
    );
  }

  // ========== LANDING PAGE ==========
  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Navigation — premium */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/70 shadow-sm shadow-slate-900/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[68px]">
            <div className="flex items-center gap-2.5">
              <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ''; window.dispatchEvent(new HashChangeEvent('hashchange')); }} className="flex items-center gap-2.5 hover:opacity-75 transition-opacity" title="Home">
                <WolfirLogo size={30} animated={false} />
                <WolfirWordmark size="lg" />
              </a>
            </div>

            <div className="hidden md:flex items-center gap-1">
              {[
                { label: 'Product', href: '#product', active: landingSection === 'product' },
                { label: 'Features', href: '#features', active: landingSection === 'features' },
                { label: 'Use Cases', href: '#use-cases', active: landingSection === 'use-cases' },
                { label: 'Blog', href: '#blog', active: landingSection === 'blog' || landingSection === 'blog-post' },
                { label: 'Pricing', href: '#pricing', active: landingSection === 'pricing' },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    item.active
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </a>
              ))}
              <div className="relative ml-1">
                <button
                  onClick={() => setResourcesDropdownOpen(!resourcesDropdownOpen)}
                  onBlur={() => setTimeout(() => setResourcesDropdownOpen(false), 150)}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium transition-all"
                >
                  Resources
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${resourcesDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {resourcesDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-48 py-1.5 bg-white rounded-xl border border-slate-200 shadow-xl shadow-slate-900/10 z-50">
                    <a href="#faq" onClick={() => setResourcesDropdownOpen(false)} className="block px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg mx-1">FAQ</a>
                    <a href="https://github.com/bhavikam28/wolfir" target="_blank" rel="noopener noreferrer" className="block px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg mx-1">GitHub</a>
                  </div>
                )}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <a href="#login" className="px-3.5 py-2 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors rounded-lg hover:bg-slate-50">
                Sign In
              </a>
              <a
                href="#demo"
                onClick={(e) => { e.preventDefault(); setMode('demo'); window.location.hash = '#demo'; window.dispatchEvent(new HashChangeEvent('hashchange')); }}
                className="btn-nova px-5 py-2.5 text-white rounded-lg font-bold text-sm"
                style={{
                  background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
                  boxShadow: '0 2px 12px rgba(37,99,235,0.3)',
                }}
              >
                Try Demo
              </a>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-100 bg-white"
            >
              <div className="px-4 py-5 space-y-1">
                {[
                  { label: 'Product', href: '#product' },
                  { label: 'Features', href: '#features' },
                  { label: 'Use Cases', href: '#use-cases' },
                  { label: 'Blog', href: '#blog' },
                  { label: 'FAQ', href: '#faq' },
                  { label: 'Pricing', href: '#pricing' },
                  { label: 'GitHub', href: 'https://github.com/bhavikam28/wolfir', external: true },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target={(item as any).external ? '_blank' : undefined}
                    rel={(item as any).external ? 'noopener noreferrer' : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium rounded-lg transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
                <a href="#login" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-50">
                  Sign In
                </a>
                <a
                  href="#demo"
                  onClick={() => { setMobileMenuOpen(false); setMode('demo'); window.location.hash = '#demo'; window.dispatchEvent(new HashChangeEvent('hashchange')); }}
                  className="block w-full mt-2 px-6 py-3.5 text-white rounded-xl font-bold text-center"
                  style={{ background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}
                >
                  Try Demo Free
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Dedicated pages (like Seddle): Product, Features, Use Cases, FAQ, Pricing, Blog — no hero */}
      {!['product', 'features', 'use-cases', 'faq', 'pricing', 'blog', 'blog-post'].includes(landingSection) && (
        <>
          <LandingHero />
          {/* MITRE ATLAS — first thing after hero (something that couldn't exist before Nova) */}
          {landingSection === 'home' && <MITREAtlasTeaser />}
        </>
      )}

      {/* Content — home = full landing with key visuals; sub-pages = detailed content */}
      {landingSection === 'home' && (
        <>
          <StatsCards />
          <DashboardShowcase />
          <SOCProblemsSection />
          <IndustryStatsSection />
          {/* Blog teaser — premium, full blog at #blog */}
          <section id="blog" className="py-20 bg-slate-50 border-y border-slate-200/60">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between mb-10">
                <div>
                  <p className="eyebrow mb-2">Engineering Blog</p>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">From the Blog</h2>
                </div>
                <a
                  href="#blog"
                  onClick={(e) => { e.preventDefault(); window.location.hash = '#blog'; window.dispatchEvent(new HashChangeEvent('hashchange')); }}
                  className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  View all posts <ChevronRight className="w-4 h-4" />
                </a>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                {BLOGS.slice(0, 2).map((b, i) => (
                  <a
                    key={b.id}
                    href={`#blog/${b.id}`}
                    onClick={(e) => { e.preventDefault(); window.location.hash = `#blog/${b.id}`; window.dispatchEvent(new HashChangeEvent('hashchange')); }}
                    className="group block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <div className="h-1 w-full" style={{ background: i === 0 ? 'linear-gradient(90deg, #2563EB, #6366F1)' : 'linear-gradient(90deg, #6366F1, #8B5CF6)' }} />
                    <div className="p-6">
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(b.tags || []).slice(0, 3).map((tag) => (
                          <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500">{tag}</span>
                        ))}
                      </div>
                      <h3 className="font-bold text-slate-900 text-base mb-2 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">{b.title}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">{b.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">{b.date} · {b.readTime}</span>
                        <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                          Read more <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              <div className="sm:hidden mt-6 text-center">
                <a
                  href="#blog"
                  onClick={(e) => { e.preventDefault(); window.location.hash = '#blog'; window.dispatchEvent(new HashChangeEvent('hashchange')); }}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600"
                >
                  View all posts <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </section>
        </>
      )}

      {landingSection === 'product' && (
        <div id="product" className="min-h-screen pt-24 pb-20 bg-white">
          <PlatformFeaturesSection />
        </div>
      )}

      {landingSection === 'features' && (
        <div id="features" className="min-h-screen pt-24 pb-20 bg-white">
          <FeaturesSection />
        </div>
      )}

      {landingSection === 'use-cases' && (
        <div id="use-cases" className="min-h-screen pt-24 pb-20 bg-white">
          <UseCasesSection />
        </div>
      )}

      {landingSection === 'blog-post' && blogPostId && (() => {
        const post = BLOGS.find((b) => b.id === blogPostId);
        if (!post) return null;
        return (
          <div id="blog-post">
            <BlogPostPage
              post={post}
              onBack={() => { window.location.hash = '#blog'; window.dispatchEvent(new HashChangeEvent('hashchange')); }}
            />
          </div>
        );
      })()}

      {landingSection === 'blog' && (
        <div id="blog" className="pt-20">
          <BlogSection onPostClick={(id) => { window.location.hash = `#blog/${id}`; window.dispatchEvent(new HashChangeEvent('hashchange')); }} />
        </div>
      )}

      {landingSection === 'faq' && (
        <div id="faq" className="min-h-screen pt-24 pb-20 bg-slate-50/80">
          <FAQSection />
        </div>
      )}

      {landingSection === 'pricing' && (
        <div id="pricing" className="min-h-screen pt-24 pb-20 relative overflow-hidden bg-white">
          <div className="absolute inset-0 bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: 'url(/images/server-room.png)', opacity: 0.07 }} />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/80 via-transparent to-white/90" />
          <div className="relative">
            <PricingSection />
          </div>
        </div>
      )}

      {/* Home-only: CTA */}
      {landingSection === 'home' && (
        <>
        {/* CTA — dark navy, premium */}
        <section
          className="py-28 relative overflow-hidden"
          id="cta"
          style={{ background: 'linear-gradient(135deg, #020817 0%, #0D1B3E 50%, #080D1F 100%)' }}
        >
          {/* Radar background image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
            style={{ backgroundImage: 'url(/images/radar-bg.png)', opacity: 0.12 }}
          />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(2,8,23,0.65) 0%, rgba(13,27,62,0.60) 50%, rgba(8,13,31,0.65) 100%)' }} />
          {/* Glow orb */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute w-[800px] h-[400px] rounded-full top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30"
              style={{ background: 'radial-gradient(ellipse, rgba(37,99,235,0.5), transparent)' }} />
          </div>
          {/* Edge lines */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.3), transparent)' }} />

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
                style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(96,165,250,0.2)' }}>
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-blue-300 text-xs font-semibold">No AWS account required to start</span>
              </div>
              <h2
                className="font-extrabold text-white tracking-tight mb-6"
                style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
              >
                Try the Agentic Pipeline
              </h2>
              <p className="text-lg text-slate-400 mb-12 max-w-xl mx-auto leading-relaxed">
                Run demo scenarios or connect your AWS account. From signal to resolution — credentials always stay local.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <button
                  onClick={() => { setMode('demo'); window.location.hash = '#demo'; window.dispatchEvent(new HashChangeEvent('hashchange')); }}
                  className="inline-flex items-center gap-2.5 px-9 py-4 rounded-xl font-bold text-base text-white transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, #2563EB 0%, #4F46E5 100%)',
                    boxShadow: '0 4px 28px rgba(37,99,235,0.45)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 36px rgba(37,99,235,0.6)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 28px rgba(37,99,235,0.45)'; }}
                >
                  <Play className="h-5 w-5" />
                  Try Demo Free
                </button>
                <button
                  onClick={() => { setMode('console'); window.location.hash = '#console'; window.dispatchEvent(new HashChangeEvent('hashchange')); }}
                  className="inline-flex items-center gap-2.5 px-9 py-4 rounded-xl font-semibold text-base text-white transition-all duration-200"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                >
                  <Shield className="h-5 w-5 text-blue-400" />
                  Launch Console
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); window.location.hash = '#pricing'; window.dispatchEvent(new HashChangeEvent('hashchange')); }}
                  className="px-7 py-4 rounded-xl font-semibold text-sm text-slate-400 hover:text-slate-300 transition-colors"
                >
                  View Pricing →
                </button>
              </div>
            </motion.div>
          </div>
        </section>
        </>
      )}

      <footer style={{ background: '#020817', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Footer top */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <WolfirLogo size={28} animated={false} />
                <WolfirWordmark size="lg" />
              </div>
              <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
                Autonomous cloud security and AI pipeline monitoring. Powered by 5 Amazon Nova models and 6 AWS MCP servers.
              </p>
            </div>

            {/* Product links */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Product</h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'Features', href: '#features' },
                  { label: 'Use Cases', href: '#use-cases' },
                  { label: 'Pricing', href: '#pricing' },
                  { label: 'Demo', href: '#demo' },
                ].map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Resources</h4>
              <ul className="space-y-2.5">
                {[
                  { label: 'Blog', href: '#blog' },
                  { label: 'FAQ', href: '#faq' },
                  { label: 'GitHub', href: 'https://github.com/bhavikam28/wolfir', external: true },
                ].map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={(link as any).external ? '_blank' : undefined}
                      rel={(link as any).external ? 'noopener noreferrer' : undefined}
                      className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px mb-8" style={{ background: 'rgba(255,255,255,0.06)' }} />

          {/* Footer bottom */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold text-blue-400 bg-blue-950/50 border border-blue-900/60">#AmazonNova</span>
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold text-indigo-400 bg-indigo-950/50 border border-indigo-900/60">#MITREАТLAS</span>
              <span className="px-2.5 py-1 rounded-md text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800">#wolfir</span>
            </div>
            <p className="text-xs text-slate-600">
              © 2026 wolfir · Cloud + AI Security Platform
            </p>
          </div>
        </div>
      </footer>

      <ScrollToTop />
    </div>
  );
}

export default App;
