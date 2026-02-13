/**
 * Nova Sentinel - Autonomous Security Intelligence Platform
 * Enterprise sidebar layout with clearly named features
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, AlertCircle, CheckCircle2, Menu, X, 
  Loader2, Eye, Brain, Zap, Shield, FileText
} from 'lucide-react';
import NovaSentinelLogo from './components/Logo';
import LandingHero from './components/Landing/LandingHero';
import FeaturesSection from './components/Landing/FeaturesSection';
import DashboardLayout from './components/Dashboard/DashboardLayout';
import ScenarioPicker from './components/Dashboard/ScenarioPicker';
import RealAWSConnect from './components/Dashboard/RealAWSConnect';
import TimelineView from './components/Analysis/TimelineView';
import InsightCards from './components/Analysis/InsightCards';
import AttackPathDiagram from './components/Visualizations/AttackPathDiagram';
import VisualAnalysisUpload from './components/Analysis/VisualAnalysisUpload';
import RemediationPlan from './components/Analysis/RemediationPlan';
import DocumentationDisplay from './components/Analysis/DocumentationDisplay';
import ComplianceMapping from './components/Analysis/ComplianceMapping';
import CostImpact from './components/Analysis/CostImpact';
import SecurityPostureDashboard from './components/Analysis/SecurityPostureDashboard';
import ReportExport from './components/Analysis/ReportExport';
import { analysisAPI, demoAPI, orchestrationAPI, visualAPI, documentationAPI, authAPI } from './services/api';
import type { AnalysisResponse, DemoScenario, OrchestrationResponse } from './types/incident';
import { formatAnalysisTime, formatLastAnalyzed } from './utils/formatting';
import { demoAnalysisData } from './data/demoAnalysis';
import { DEFAULT_DEMO_SCENARIOS } from './data/demoScenarios';
import { getQuickDemoResult } from './data/quickDemoResult';
import AgentProgress from './components/Analysis/AgentProgress';
import VoiceAssistant from './components/Analysis/VoiceAssistant';

type AppMode = 'landing' | 'demo' | 'console';

function App() {
  const [mode, setMode] = useState<AppMode>('landing');
  const [scenarios, setScenarios] = useState<DemoScenario[]>(DEFAULT_DEMO_SCENARIOS);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [orchestrationResult, setOrchestrationResult] = useState<OrchestrationResponse | null>(null);
  const [visualAnalysisResult, setVisualAnalysisResult] = useState<any>(null);
  const [remediationPlan, setRemediationPlan] = useState<any>(null);
  const [documentationResult, setDocumentationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [awsProfile, setAwsProfile] = useState<string>('default');
  const [awsConnected, setAwsConnected] = useState(false);
  const [authMethod, setAuthMethod] = useState<'profile' | 'sso'>('profile');
  const [ssoStartUrl, setSsoStartUrl] = useState('');
  const [ssoRegion, setSsoRegion] = useState('us-east-1');
  const [activeFeature, setActiveFeature] = useState('overview');
  const [useFullAI, setUseFullAI] = useState(false);
  const [backendOffline, setBackendOffline] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionLoading, setConnectionLoading] = useState(false);

  useEffect(() => {
    loadScenarios();
    const hash = window.location.hash;
    if (hash === '#demo') setMode('demo');
    else if (hash === '#console') setMode('console');

    const handleHashChange = () => {
      const h = window.location.hash;
      if (h === '#demo') setMode('demo');
      else if (h === '#console') setMode('console');
      else if (!h || h === '') setMode('landing');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const loadScenarios = async () => {
    try {
      const data = await demoAPI.listScenarios();
      setScenarios(data.scenarios?.length ? data.scenarios : DEFAULT_DEMO_SCENARIOS);
      setBackendOffline(false);
    } catch {
      setScenarios(DEFAULT_DEMO_SCENARIOS);
      setBackendOffline(true);
    }
  };

  const resetAnalysis = () => {
    setAnalysisResult(null);
    setOrchestrationResult(null);
    setVisualAnalysisResult(null);
    setRemediationPlan(null);
    setDocumentationResult(null);
    setError(null);
    setActiveFeature('overview');
  };

  const goBack = () => {
    setMode('landing');
    resetAnalysis();
    window.location.hash = '';
  };

  const handleSelectScenario = async (scenarioId: string) => {
    setLoading(true);
    setError(null);
    resetAnalysis();

    try {
      let incidentType = 'Unknown';
      if (scenarioId === 'crypto-mining') incidentType = 'Cryptocurrency Mining Attack';
      else if (scenarioId === 'data-exfiltration') incidentType = 'Data Exfiltration';
      else if (scenarioId === 'privilege-escalation') incidentType = 'Privilege Escalation';
      else if (scenarioId === 'unauthorized-access') incidentType = 'Unauthorized Access';

      const result = useFullAI
        ? await (async () => {
            let events: any[] = [];
            if (scenarioId === 'crypto-mining') events = (await demoAPI.getCryptoMiningScenario()).events;
            else if (scenarioId === 'data-exfiltration') events = (await demoAPI.getDataExfiltrationScenario()).events;
            else if (scenarioId === 'privilege-escalation') events = (await demoAPI.getPrivilegeEscalationScenario()).events;
            else if (scenarioId === 'unauthorized-access') events = (await demoAPI.getUnauthorizedAccessScenario()).events;
            return orchestrationAPI.analyzeIncident(events, undefined, incidentType);
          })()
        : getQuickDemoResult(scenarioId);
      setOrchestrationResult(result);

      if (result.results.remediation_plan) {
        setRemediationPlan(result.results.remediation_plan);
      }

      if (result.results.timeline) {
        setAnalysisResult({
          incident_id: result.incident_id,
          timeline: result.results.timeline,
          analysis_time_ms: result.analysis_time_ms,
          model_used: 'Multi-Agent Orchestration (Nova 2 Lite, Nova Pro, Nova Micro)',
        });
      } else {
        setAnalysisResult(demoAnalysisData);
      }
    } catch (err: any) {
      console.error('Orchestration error:', err);
      setAnalysisResult(demoAnalysisData);
      setError(err.message || 'Using demo data due to an error.');
    } finally {
      setLoading(false);
    }
  };

  const handleRealAWSAnalysis = async (daysBack: number, maxEvents: number) => {
    try {
      setLoading(true);
      setError(null);
      resetAnalysis();

      const realAnalysis = await analysisAPI.analyzeRealCloudTrail(daysBack, maxEvents, awsProfile);
      
      if ((realAnalysis as any).status === 'no_events') {
        const msg = (realAnalysis as any).message || `No security events found in the last ${daysBack} days.`;
        setError(msg);
        setLoading(false);
        return;
      }

      const events = realAnalysis.timeline?.events || [];
      const cloudtrailEvents = events.map((e: any) => ({
        eventTime: typeof e.timestamp === 'string' ? e.timestamp : e.timestamp.toISOString(),
        eventName: e.action || 'Unknown',
        userIdentity: { userName: e.actor || 'Unknown', type: 'IAMUser' },
        requestParameters: { resource: e.resource || 'Unknown' },
        sourceIPAddress: e.details?.sourceIP || 'Unknown',
        awsRegion: 'us-east-1'
      }));

      const result = await orchestrationAPI.analyzeIncident(cloudtrailEvents, undefined, 'Real AWS Account Analysis');
      setOrchestrationResult(result);

      if (result.results.remediation_plan) {
        setRemediationPlan(result.results.remediation_plan);
      }

      // Derive a meaningful incident type from the orchestration results
      const derivedIncidentType =
        result.metadata?.incident_type ||
        result.results?.timeline?.attack_pattern ||
        result.results?.timeline?.root_cause ||
        'Real AWS Account Analysis';

      setAnalysisResult({
        incident_id: result.incident_id,
        timeline: result.results.timeline || realAnalysis.timeline,
        analysis_time_ms: result.analysis_time_ms || realAnalysis.analysis_time_ms,
        model_used: 'Multi-Agent Orchestration (Real AWS)',
        incident_type: derivedIncidentType,
      });
    } catch (err: any) {
      console.error('Real AWS analysis error:', err);
      setError('Failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // ========== RENDER FEATURE CONTENT ==========
  const renderFeatureContent = () => {
    // Loading state
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

    // No analysis yet — show scenario picker or AWS connect
    if (!analysisResult) {
      if (mode === 'demo') {
        return (
          <ScenarioPicker
            scenarios={scenarios}
            onSelectScenario={handleSelectScenario}
            loading={loading}
            useFullAI={useFullAI}
            onUseFullAIChange={setUseFullAI}
          />
        );
      }
      if (mode === 'console') {
        return (
          <div className="space-y-6">
            {/* Connection Card */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-900 mb-0.5">Connect Your AWS Account</h2>
                <p className="text-sm text-slate-500">
                  Credentials stay local — <span className="font-semibold text-slate-700">never stored</span> on our servers.
                </p>
              </div>

              {/* Auth Method Tabs */}
              <div className="flex border-b border-slate-100">
                <button
                  onClick={() => setAuthMethod('profile')}
                  className={`flex-1 px-4 py-3 text-xs font-bold text-center transition-colors relative ${
                    authMethod === 'profile'
                      ? 'text-indigo-700 bg-indigo-50/50'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  AWS CLI Profile
                  <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">Recommended</span>
                  {authMethod === 'profile' && (
                    <motion.div layoutId="authTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                  )}
                </button>
                <button
                  onClick={() => setAuthMethod('sso')}
                  className={`flex-1 px-4 py-3 text-xs font-bold text-center transition-colors relative ${
                    authMethod === 'sso'
                      ? 'text-indigo-700 bg-indigo-50/50'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  AWS IAM Identity Center
                  <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">SSO</span>
                  {authMethod === 'sso' && (
                    <motion.div layoutId="authTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
                  )}
                </button>
              </div>

              {/* Auth Forms */}
              <div className="p-5">
                {authMethod === 'profile' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">Profile Name</label>
                      <input
                        type="text"
                        value={awsProfile}
                        onChange={(e) => setAwsProfile(e.target.value)}
                        placeholder="default"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Uses AWS CLI profile (from <code className="bg-slate-100 px-1 rounded text-[10px]">aws login</code> or config).
                        <span className="block mt-0.5">Profile Name = section in <code className="bg-slate-100 px-1 rounded text-[10px]">~/.aws/config</code>. Use &quot;default&quot; for your main AWS account.</span>
                      </p>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-3">
                      <p className="text-[10px] text-slate-400 mb-1 font-mono">Recommended — aws login (CLI 2.32.0+)</p>
                      <code className="text-sm text-green-400 font-mono block">
                        {awsProfile === 'default' ? 'aws login' : `aws login --profile ${awsProfile}`}
                      </code>
                      <p className="text-[10px] text-slate-500 mt-2">Alternative: <code className="text-slate-400">aws configure --profile {awsProfile}</code></p>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                      <Shield className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] text-indigo-600 leading-relaxed">
                        <strong>aws login:</strong> Browser-based OAuth. No keys on disk. Temporary credentials auto-refresh. Zero-trust — nothing transmitted or stored on any server.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      Authenticate via AWS IAM Identity Center (SSO). A browser window will open for secure login — no credentials are entered here.
                    </p>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">SSO Start URL</label>
                      <input
                        type="text"
                        value={ssoStartUrl}
                        onChange={(e) => setSsoStartUrl(e.target.value)}
                        placeholder="https://my-org.awsapps.com/start"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">SSO Region</label>
                      <select
                        value={ssoRegion}
                        onChange={(e) => setSsoRegion(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      >
                        <option value="us-east-1">US East (N. Virginia)</option>
                        <option value="us-west-2">US West (Oregon)</option>
                        <option value="eu-west-1">EU (Ireland)</option>
                        <option value="eu-central-1">EU (Frankfurt)</option>
                        <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                        <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                      </select>
                    </div>
                    <div className="bg-slate-900 rounded-lg p-3">
                      <p className="text-[10px] text-slate-400 mb-1 font-mono">CLI setup</p>
                      <code className="text-xs text-green-400 font-mono block">aws login --profile nova-sentinel</code>
                      <p className="text-[10px] text-slate-500 mt-2">First-time SSO: <code className="text-slate-400">aws configure sso --profile nova-sentinel</code></p>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                      <Shield className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <p className="text-[10px] text-indigo-600 leading-relaxed">
                        <strong>Enterprise-grade:</strong> SSO uses a secure browser-based OAuth flow. No secrets are ever entered in or handled by Nova Sentinel. Authentication happens directly with AWS.
                      </p>
                    </div>
                  </div>
                )}

                {/* Test Connection */}
                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={async () => {
                        setConnectionLoading(true);
                        setConnectionError(null);
                        try {
                          const result = await authAPI.testConnection(awsProfile);
                          setAwsConnected(result.connected);
                          if (result.connected) setConnectionError(null);
                          else setConnectionError('Connection failed. Check credentials and backend.');
                        } catch (err: any) {
                          setAwsConnected(false);
                          const msg = err?.response?.data?.detail || err?.message;
                          setConnectionError(
                            err?.response
                              ? `Connection test failed: ${msg || 'Check backend logs.'}`
                              : 'Backend unreachable. Start backend: cd backend && uvicorn main:app --reload'
                          );
                        } finally {
                          setConnectionLoading(false);
                        }
                      }}
                      disabled={connectionLoading}
                      className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                    >
                    {connectionLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Testing...
                      </>
                    ) : authMethod === 'sso' ? (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        Authorize with SSO
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Test Connection
                      </>
                    )}
                  </button>
                  {awsConnected && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-emerald-700">Connected</span>
                    </div>
                  )}
                  </div>
                  {connectionError && (
                    <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                      {connectionError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Analysis Trigger */}
            <RealAWSConnect
              onAnalyze={handleRealAWSAnalysis}
              loading={loading}
            />
          </div>
        );
      }
      return null;
    }

    // ========== Analysis results — render by active feature ==========
    switch (activeFeature) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Incident Header */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-lg font-bold text-slate-900">
                      Incident {analysisResult.incident_id}
                    </h2>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-700">
                        {(analysisResult.timeline.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500">
                    Analyzed in <span className="font-semibold text-slate-700">{formatAnalysisTime(analysisResult.analysis_time_ms)}</span>
                    <span className="text-slate-400 mx-1">·</span>
                    Last analyzed: <span className="font-medium text-slate-600">{formatLastAnalyzed(analysisResult.timeline)}</span>
                  </p>
                </div>
                <button
                  onClick={resetAnalysis}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                >
                  New Analysis
                </button>
              </div>
              {orchestrationResult && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {orchestrationResult.results.risk_scores && (
                    <span className="text-[10px] px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200 font-bold">
                      {orchestrationResult.results.risk_scores.length} Risk Scores
                    </span>
                  )}
                  {orchestrationResult.results.remediation_plan && (
                    <span className="text-[10px] px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 font-bold">
                      Remediation Ready
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Agent Progress */}
            {orchestrationResult && <AgentProgress agents={orchestrationResult.agents} />}

            {/* Insight Cards */}
            <InsightCards timeline={analysisResult.timeline} />

            {/* Security Posture Dashboard */}
            <SecurityPostureDashboard
              timeline={analysisResult.timeline}
              orchestrationResult={orchestrationResult}
              analysisTime={analysisResult.analysis_time_ms}
              incidentId={analysisResult.incident_id}
              onNavigateToCostImpact={() => setActiveFeature('cost')}
            />
          </div>
        );

      case 'timeline':
        return <TimelineView timeline={analysisResult.timeline} />;

      case 'attack-path':
        return (
          <AttackPathDiagram
            timeline={analysisResult.timeline}
            orchestrationResult={orchestrationResult}
            onNavigateToRemediation={() => setActiveFeature('remediation')}
          />
        );

      case 'compliance':
        return (
          <ComplianceMapping
            timeline={analysisResult.timeline}
            incidentType={orchestrationResult?.metadata?.incident_type}
          />
        );

      case 'cost':
        return (
          <CostImpact
            timeline={analysisResult.timeline}
            incidentType={
              orchestrationResult?.metadata?.incident_type ||
              orchestrationResult?.results?.timeline?.attack_pattern ||
              (analysisResult as any)?.incident_type
            }
          />
        );

      case 'remediation':
        return remediationPlan ? (
          <RemediationPlan
            plan={remediationPlan}
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
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Aria — Voice Security Assistant</h3>
            <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
              Powered by Amazon Nova 2 Lite. Click the chat icon in the bottom-right corner to ask Aria about incidents, compliance, remediation, and more.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-50 border border-violet-200 rounded-lg text-sm text-violet-700 font-medium">
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              Aria is active — look for the chat button below
            </div>
          </div>
        );

      case 'documentation':
        return analysisResult ? (
          <DocumentationDisplay
            documentation={(documentationResult || orchestrationResult?.results?.documentation)?.documentation || (documentationResult || orchestrationResult?.results?.documentation)}
            incidentId={orchestrationResult?.incident_id || analysisResult?.incident_id || 'Unknown'}
            timeline={analysisResult.timeline}
            remediationPlan={remediationPlan || orchestrationResult?.results?.remediation_plan}
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
            <p className="text-sm text-slate-500">Run a demo scenario or AWS analysis first.</p>
            <button
              onClick={() => setActiveFeature('overview')}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Go to Demo Scenarios →
            </button>
          </div>
        );

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

  // ========== DEMO or CONSOLE MODE ==========
  if (mode === 'demo' || mode === 'console') {
    return (
      <>
        <DashboardLayout
          mode={mode}
          activeFeature={activeFeature}
          onFeatureChange={setActiveFeature}
          onBack={goBack}
          headerRight={
            <div className="flex items-center gap-3">
              {analysisResult && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-700">Analysis Complete</span>
                </div>
              )}
              {loading && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />
                  <span className="text-xs font-bold text-indigo-700">Analyzing...</span>
                </div>
              )}
            </div>
          }
        >
          {/* Backend offline (subtle) */}
          {backendOffline && !error && (
            <div className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 mb-4 flex items-center gap-2">
              <span className="text-xs text-slate-600">
                Demo mode — backend offline. Instant demo works. For full AI, start backend: <code className="bg-slate-200 px-1 rounded">cd backend && uvicorn main:app --reload</code>
              </span>
            </div>
          )}
          {/* Error Banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 mb-6"
            >
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-900">Error</h4>
                <p className="text-sm text-red-700">{error}</p>
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

        {/* Voice Assistant */}
        <VoiceAssistant
          incidentContext={orchestrationResult?.results ? {
            timeline: orchestrationResult.results.timeline,
            remediation_plan: orchestrationResult.results.remediation_plan,
          } : undefined}
          incidentId={orchestrationResult?.incident_id || analysisResult?.incident_id}
          isAnalysisComplete={!!analysisResult && !loading}
        />
      </>
    );
  }

  // ========== LANDING PAGE ==========
  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <NovaSentinelLogo size={30} animated={false} />
              <span className="text-base font-bold text-slate-900">Nova Sentinel</span>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <a
                href="https://github.com/bhavikam28/nova-sentinel"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                GitHub
              </a>
              <button
                onClick={() => { setMode('demo'); window.location.hash = '#demo'; }}
                className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors"
              >
                Try Demo
              </button>
              <button
                onClick={() => { setMode('console'); window.location.hash = '#console'; }}
                className="btn-nova px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm"
              >
                Launch Console
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-slate-600 hover:text-slate-900"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-slate-200 bg-white"
            >
              <div className="px-4 py-6 space-y-4">
                <a href="https://github.com/bhavikam28/nova-sentinel" target="_blank" rel="noopener noreferrer" className="block text-slate-700 font-medium">GitHub</a>
                <button
                  onClick={() => { setMode('demo'); window.location.hash = '#demo'; }}
                  className="block text-slate-700 font-medium w-full text-left"
                >
                  Try Demo
                </button>
                <button
                  onClick={() => { setMode('console'); window.location.hash = '#console'; }}
                  className="w-full btn-nova px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold"
                >
                  Launch Console
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero */}
      <LandingHero />

      {/* Features */}
      <FeaturesSection />

      {/* CTA Section */}
      <section className="py-24 bg-slate-50 border-t border-slate-200" id="cta">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-6 tracking-tight">
              Ready to Secure Your Cloud?
            </h2>
            <p className="text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
              Explore with demo scenarios or connect your own AWS account.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => { setMode('demo'); window.location.hash = '#demo'; }}
                className="px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold text-lg hover:border-indigo-300 hover:shadow-md transition-all flex items-center gap-3 justify-center"
              >
                <Play className="h-5 w-5 text-indigo-600" />
                Try Demo
              </button>
              <button
                onClick={() => { setMode('console'); window.location.hash = '#console'; }}
                className="btn-nova inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg"
              >
                <Shield className="h-5 w-5" />
                Launch Console
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2.5 mb-4">
              <NovaSentinelLogo size={28} animated={false} />
              <span className="text-base font-bold text-slate-900">Nova Sentinel</span>
            </div>
            <p className="text-sm text-slate-500 text-center mb-4">
              Built with Amazon Nova for the Amazon Nova AI Hackathon 2026
            </p>
            <div className="flex gap-4 text-xs text-slate-400">
              <span>#AmazonNova</span>
              <span>·</span>
              <span>#NovaSentinel</span>
              <span>·</span>
              <span>© 2026</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
