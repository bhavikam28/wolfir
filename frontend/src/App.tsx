/**
 * Nova Sentinel - Autonomous Security Intelligence Platform
 * Enterprise sidebar layout with clearly named features
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, AlertCircle, CheckCircle2, Menu, X, 
  Clock, ChevronRight,
  Loader2, Sparkles, Eye, Brain, Zap, Shield, FileText
} from 'lucide-react';
import NovaSentinelLogo from './components/Logo';
import LandingHero from './components/Landing/LandingHero';
import FeaturesSection from './components/Landing/FeaturesSection';
import DashboardLayout from './components/Dashboard/DashboardLayout';
import ScenarioPicker from './components/Dashboard/ScenarioPicker';
import AWSAuthTab from './components/Dashboard/AWSAuthTab';
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
import { formatAnalysisTime } from './utils/formatting';
import { demoAnalysisData } from './data/demoAnalysis';
import AgentProgress from './components/Analysis/AgentProgress';
import VoiceAssistant from './components/Analysis/VoiceAssistant';

type AppMode = 'landing' | 'demo' | 'console';

function App() {
  const [mode, setMode] = useState<AppMode>('landing');
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [orchestrationResult, setOrchestrationResult] = useState<OrchestrationResponse | null>(null);
  const [visualAnalysisResult, setVisualAnalysisResult] = useState<any>(null);
  const [remediationPlan, setRemediationPlan] = useState<any>(null);
  const [documentationResult, setDocumentationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [awsProfile, setAwsProfile] = useState<string>('secops-lens');
  const [awsConnected, setAwsConnected] = useState(false);
  const [activeFeature, setActiveFeature] = useState('overview');

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
      setScenarios(data.scenarios);
    } catch (err) {
      console.error('Failed to load scenarios:', err);
      setError('Unable to connect to backend. Ensure the backend is running on port 8000.');
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
      let events: any[] = [];
      let incidentType = 'Unknown';
      
      if (scenarioId === 'crypto-mining') {
        const scenario = await demoAPI.getCryptoMiningScenario();
        events = scenario.events;
        incidentType = 'Cryptocurrency Mining Attack';
      } else if (scenarioId === 'data-exfiltration') {
        const scenario = await demoAPI.getDataExfiltrationScenario();
        events = scenario.events;
        incidentType = 'Data Exfiltration';
      } else if (scenarioId === 'privilege-escalation') {
        const scenario = await demoAPI.getPrivilegeEscalationScenario();
        events = scenario.events;
        incidentType = 'Privilege Escalation';
      } else if (scenarioId === 'unauthorized-access') {
        const scenario = await demoAPI.getUnauthorizedAccessScenario();
        events = scenario.events;
        incidentType = 'Unauthorized Access';
      }

      const result = await orchestrationAPI.analyzeIncident(events, undefined, incidentType);
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
        setError(`No security events found in the last ${daysBack} days.`);
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
      setAnalysisResult({
        incident_id: result.incident_id,
        timeline: result.results.timeline || realAnalysis.timeline,
        analysis_time_ms: result.analysis_time_ms || realAnalysis.analysis_time_ms,
        model_used: 'Multi-Agent Orchestration (Real AWS)',
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
      return (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-200 overflow-hidden"
          >
            <div className="h-1 bg-slate-100 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{ width: '50%' }}
              />
            </div>
            <div className="p-8">
              <div className="text-center mb-8">
                <motion.div
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg mx-auto mb-4"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles className="w-7 h-7 text-white" />
                </motion.div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Multi-Agent Analysis</h3>
                <p className="text-sm text-slate-500">5 Nova AI models working together</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { name: 'Detect', model: 'Nova Pro', Icon: Eye, color: 'from-blue-500 to-cyan-500', delay: 0 },
                  { name: 'Investigate', model: 'Nova 2 Lite', Icon: Brain, color: 'from-purple-500 to-violet-500', delay: 3 },
                  { name: 'Classify', model: 'Nova Micro', Icon: Zap, color: 'from-amber-500 to-orange-500', delay: 6 },
                  { name: 'Remediate', model: 'Orchestrator', Icon: Shield, color: 'from-emerald-500 to-teal-500', delay: 9 },
                  { name: 'Document', model: 'Nova 2 Lite', Icon: FileText, color: 'from-violet-500 to-purple-500', delay: 12 },
                ].map((agent, i) => (
                  <motion.div
                    key={agent.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="relative"
                  >
                    <div className="bg-white rounded-xl p-3 border border-slate-200 text-center">
                      <motion.div
                        className={`w-9 h-9 rounded-lg bg-gradient-to-br ${agent.color} mx-auto mb-1.5 flex items-center justify-center shadow-sm`}
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: agent.delay * 0.1 }}
                      >
                        <agent.Icon className="w-4 h-4 text-white" />
                      </motion.div>
                      <p className="text-[10px] font-bold text-slate-900">{agent.name}</p>
                      <p className="text-[8px] text-slate-400">{agent.model}</p>
                      <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full bg-gradient-to-r ${agent.color} rounded-full`}
                          animate={{ width: ['0%', '100%'] }}
                          transition={{ duration: 8, delay: agent.delay * 0.3, ease: 'easeInOut' }}
                        />
                      </div>
                    </div>
                    {i < 4 && (
                      <motion.div
                        className="absolute top-1/2 -right-2 z-10 text-slate-300"
                        animate={{ x: [0, 3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <ChevronRight className="w-3 h-3" />
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-center gap-3 text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                <span>~30 seconds</span>
              </div>
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
          />
        );
      }
      if (mode === 'console') {
        return (
          <div className="space-y-6">
            <AWSAuthTab
              onAuthMethodSelected={(method) => {
                if (method === 'profile') setAwsProfile('secops-lens');
              }}
              currentMethod={awsProfile ? 'profile' : undefined}
              onTestConnection={async () => {
                try {
                  const result = await authAPI.testConnection(awsProfile);
                  setAwsConnected(result.connected);
                  return result.connected;
                } catch {
                  setAwsConnected(false);
                  return false;
                }
              }}
              loading={loading}
            />
            {awsConnected && (
              <RealAWSConnect
                onAnalyze={handleRealAWSAnalysis}
                loading={loading}
              />
            )}
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
            />
          </div>
        );

      case 'timeline':
        return <TimelineView timeline={analysisResult.timeline} />;

      case 'attack-path':
        return <AttackPathDiagram />;

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
            incidentType={orchestrationResult?.metadata?.incident_type}
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
                if (orchestrationResult?.incident_id && orchestrationResult.results.timeline && remediationPlan) {
                  const docResult = await documentationAPI.generateDocumentation(
                    orchestrationResult.incident_id,
                    orchestrationResult.results.timeline,
                    remediationPlan
                  );
                  setDocumentationResult(docResult);
                  setOrchestrationResult(prev => prev ? {
                    ...prev,
                    agents: { ...prev.agents, documentation: { status: 'COMPLETED' } },
                    results: { ...prev.results, documentation: docResult }
                  } : null);
                  setActiveFeature('documentation');
                }
              } catch (err: any) {
                setError('Documentation error: ' + (err.response?.data?.detail || err.message));
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
              Powered by Amazon Nova Sonic. Click the chat icon in the bottom-right corner to ask Aria about incidents, compliance, remediation, and more.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-50 border border-violet-200 rounded-lg text-sm text-violet-700 font-medium">
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              Aria is active — look for the chat button below
            </div>
          </div>
        );

      case 'documentation':
        return (documentationResult || orchestrationResult?.results?.documentation) ? (
          <DocumentationDisplay
            documentation={(documentationResult || orchestrationResult?.results?.documentation)?.documentation || (documentationResult || orchestrationResult?.results?.documentation)}
            incidentId={orchestrationResult?.incident_id || analysisResult?.incident_id || 'Unknown'}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Approve remediation plan first to generate documentation.</p>
            <button
              onClick={() => setActiveFeature('remediation')}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Go to Remediation Engine →
            </button>
          </div>
        );

      case 'export':
        return (
          <ReportExport
            timeline={analysisResult.timeline}
            orchestrationResult={orchestrationResult}
            incidentId={analysisResult.incident_id}
            analysisTime={analysisResult.analysis_time_ms}
            remediationPlan={remediationPlan}
          />
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
          hasAnalysis={!!analysisResult && !loading}
          isLoading={loading}
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

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors">Features</a>
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
                <a href="#features" className="block text-slate-700 font-medium">Features</a>
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
