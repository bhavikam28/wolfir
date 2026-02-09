/**
 * Nova Sentinel - Autonomous Security Intelligence
 * Wiz-inspired clean, minimal design
 */
import React, { useState, useEffect } from 'react';
import { Play, AlertCircle, CheckCircle2, Menu, X } from 'lucide-react';
import NovaSentinelLogo from './components/Logo';
import LandingHero from './components/Landing/LandingHero';
import FeaturesSection from './components/Landing/FeaturesSection';
import TimelineView from './components/Analysis/TimelineView';
import InsightCards from './components/Analysis/InsightCards';
import DemoScenarios from './components/Dashboard/DemoScenarios';
import RealAWSConnect from './components/Dashboard/RealAWSConnect';
import AWSAuthTab from './components/Dashboard/AWSAuthTab';
import AnalysisTabs from './components/Dashboard/AnalysisTabs';
import AttackPathDiagram from './components/Visualizations/AttackPathDiagram';
import VisualAnalysisUpload from './components/Analysis/VisualAnalysisUpload';
import RemediationPlan from './components/Analysis/RemediationPlan';
import DocumentationDisplay from './components/Analysis/DocumentationDisplay';
import { analysisAPI, demoAPI, orchestrationAPI, visualAPI, documentationAPI, authAPI } from './services/api';
import type { AnalysisResponse, DemoScenario, OrchestrationResponse } from './types/incident';
import { formatAnalysisTime } from './utils/formatting';
import { demoAnalysisData } from './data/demoAnalysis';
import AgentProgress from './components/Analysis/AgentProgress';

function App() {
  const [showDemo, setShowDemo] = useState(false);
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

  useEffect(() => {
    loadScenarios();
    
    // Check for hash route (#demo)
    if (window.location.hash === '#demo') {
      setShowDemo(true);
    }
    
    // Listen for hash changes
    const handleHashChange = () => {
      if (window.location.hash === '#demo') {
        setShowDemo(true);
      } else if (window.location.hash === '' || !window.location.hash) {
        setShowDemo(false);
      }
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
      setError('Unable to connect to backend. Please ensure the backend server is running on port 8000.');
    }
  };

  const handleSelectScenario = async (scenarioId: string) => {
    setLoading(true);
    setError(null);
    setAnalysisResult(null);
    setOrchestrationResult(null);
    setShowDemo(true);

    try {
      // Get scenario events
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

      // Use orchestrator API for full multi-agent analysis
      const result = await orchestrationAPI.analyzeIncident(
        events,
        undefined, // No diagram for now
        incidentType
      );

      setOrchestrationResult(result);

      // Set remediation plan if available
      if (result.results.remediation_plan) {
        // The remediation plan might be nested in a 'plan' field
        const planData = result.results.remediation_plan;
        console.log('Remediation plan data:', planData);
        setRemediationPlan(planData);
      }

      // Convert orchestration result to AnalysisResponse format for compatibility
      if (result.results.timeline) {
        setAnalysisResult({
          incident_id: result.incident_id,
          timeline: result.results.timeline,
          analysis_time_ms: result.analysis_time_ms,
          model_used: 'Multi-Agent Orchestration (Nova 2 Lite, Nova Pro, Nova Micro)',
        });
      } else {
        // Fallback to demo data if orchestration didn't return timeline
        console.warn('Orchestration result missing timeline, using demo data');
        setAnalysisResult(demoAnalysisData);
      }
      
    } catch (err: any) {
      console.error('Orchestration error:', err);
      // Fallback to demo data on error
      console.log('Falling back to demo data due to error');
      setAnalysisResult(demoAnalysisData);
      setError(err.message || 'Failed to run orchestrated analysis. Using demo data.');
    } finally {
      setLoading(false);
    }
  };

  // Demo section
  if (showDemo) {
    return (
      <div className="min-h-screen bg-white">
        {/* Clean professional header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <NovaSentinelLogo size={36} />
                        <div>
                          <h1 className="text-lg font-bold text-slate-900">Nova Sentinel</h1>
                          <p className="text-xs text-slate-500">Powered by Amazon Nova</p>
                        </div>
                      </div>
              <button
                onClick={() => { 
                  setShowDemo(false); 
                  setAnalysisResult(null);
                  setOrchestrationResult(null);
                  setVisualAnalysisResult(null);
                  setRemediationPlan(null);
                  setDocumentationResult(null);
                  window.location.hash = '';
                }}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                ← Back to Home
              </button>
            </div>
          </div>
        </header>

        {/* Demo content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="space-y-8">
            {/* Tabbed Interface */}
            {scenarios.length > 0 ? (
              <AnalysisTabs>
                {{
                  realAWS: (
                  <div className="space-y-6">
                    {/* AWS Authentication */}
                    <AWSAuthTab
                      onAuthMethodSelected={(method) => {
                        if (method === 'profile') {
                          setAwsProfile('secops-lens');
                        }
                      }}
                      currentMethod={awsProfile ? 'profile' : undefined}
                      onTestConnection={async () => {
                        try {
                          const result = await authAPI.testConnection(awsProfile);
                          setAwsConnected(result.connected);
                          return result.connected;
                        } catch (err) {
                          setAwsConnected(false);
                          return false;
                        }
                      }}
                      loading={loading}
                    />

                    {/* Real AWS Analysis */}
                    {awsConnected && (
                      <RealAWSConnect
                        onAnalyze={async (daysBack, maxEvents) => {
                try {
                  setLoading(true);
                  setError(null);
                  setAnalysisResult(null);
                  setOrchestrationResult(null);
                  setVisualAnalysisResult(null);
                  setRemediationPlan(null);
                  setDocumentationResult(null);
                  setShowDemo(true);

                  // Analyze real CloudTrail events from AWS account
                  const realAnalysis = await analysisAPI.analyzeRealCloudTrail(daysBack, maxEvents, awsProfile);
                  
                  if (realAnalysis.status === 'no_events') {
                    setError(`No security-relevant events found in the last ${daysBack} days. Try increasing the time range or check your CloudTrail configuration.`);
                    setLoading(false);
                    return;
                  }

                  // Convert timeline events to CloudTrail format for orchestration
                  const events = realAnalysis.timeline?.events || [];
                  const cloudtrailEvents = events.map(e => ({
                    eventTime: typeof e.timestamp === 'string' ? e.timestamp : e.timestamp.toISOString(),
                    eventName: e.action || 'Unknown',
                    userIdentity: { 
                      userName: e.actor || 'Unknown',
                      type: 'IAMUser'
                    },
                    requestParameters: { 
                      resource: e.resource || 'Unknown'
                    },
                    sourceIPAddress: e.details?.sourceIP || 'Unknown',
                    awsRegion: 'us-east-1'
                  }));

                  // Use orchestration API for full multi-agent analysis
                  const result = await orchestrationAPI.analyzeIncident(
                    cloudtrailEvents,
                    undefined, // No diagram initially
                    'Real AWS Account Analysis'
                  );

                  setOrchestrationResult(result);
                  setAnalysisResult({
                    incident_id: result.incident_id,
                    timeline: result.results.timeline || realAnalysis.timeline,
                    analysis_time_ms: result.analysis_time_ms || realAnalysis.analysis_time_ms,
                    model_used: 'Multi-Agent Orchestration (Real AWS Account)',
                  });

                  // Poll for updates
                  const pollInterval = setInterval(async () => {
                    try {
                      const updatedState = await orchestrationAPI.getIncidentState(result.incident_id);
                      setOrchestrationResult(updatedState.analysis_result);
                      setAnalysisResult(prev => prev ? {
                        ...prev,
                        timeline: updatedState.analysis_result.results.timeline
                      } : null);
                      setVisualAnalysisResult(updatedState.analysis_result.results.visual);
                      setRemediationPlan(updatedState.analysis_result.results.remediation_plan);
                      setDocumentationResult(updatedState.analysis_result.results.documentation);

                      if (updatedState.analysis_result.status === 'COMPLETED' || updatedState.analysis_result.status === 'FAILED') {
                        clearInterval(pollInterval);
                        setLoading(false);
                      }
                    } catch (pollError) {
                      console.error('Polling error:', pollError);
                      clearInterval(pollInterval);
                      setLoading(false);
                    }
                  }, 2000);

                } catch (err: any) {
                  console.error('Real AWS analysis error:', err);
                  setError('Failed to analyze real AWS account: ' + (err.response?.data?.detail || err.message));
                  setLoading(false);
                }
                        }}
                        loading={loading}
                      />
                    )}

                    {!awsConnected && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                        <p className="text-amber-700 font-medium">
                          Please configure and test your AWS connection above to analyze real CloudTrail events.
                        </p>
                      </div>
                    )}
                  </div>
                ),
                demo: (
                  <div>
                    <div className="mb-6 text-center">
                      <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        Explore Demo Scenarios
                      </h2>
                      <p className="text-slate-600">
                        See how Nova Sentinel handles common security incidents with pre-built scenarios
                      </p>
                    </div>
                    <DemoScenarios
                      scenarios={scenarios}
                      onSelectScenario={handleSelectScenario}
                      loading={loading}
                    />
                  </div>
                  )
                }}
              </AnalysisTabs>
            ) : (
              <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-16 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 rounded-full mb-6">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  Loading Demo...
                </h3>
                <p className="text-slate-600 max-w-md mx-auto">
                  Connecting to backend server. Please ensure the backend is running on port 8000.
                </p>
                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}
              </div>
            )}

            {error && scenarios.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-red-900 mb-1">Connection Error</h3>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {loading && scenarios.length > 0 && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-lg">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 rounded-full mb-6">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">
                    Orchestrating Multi-Agent Analysis
                  </h3>
                  <p className="text-slate-600 mb-6">
                    Multiple Nova AI agents are working together to analyze this incident...
                  </p>
                </div>
                
                {/* Show agent progress if we have partial results */}
                {orchestrationResult && (
                  <AgentProgress agents={orchestrationResult.agents} />
                )}
              </div>
            )}

            {analysisResult && !loading && (
              <div className="space-y-6">
                {/* Agent Progress Summary */}
                {orchestrationResult && (
                  <AgentProgress agents={orchestrationResult.agents} />
                )}

                {/* Header - Wiz.io Style */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                          Incident {analysisResult.incident_id}
                        </h2>
                        <p className="text-sm text-slate-600 mt-1">
                          Analyzed in {formatAnalysisTime(analysisResult.analysis_time_ms)} using {analysisResult.model_used}
                        </p>
                        {orchestrationResult && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {orchestrationResult.results.risk_scores && (
                              <span className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded border border-yellow-200">
                                Risk Scores: {orchestrationResult.results.risk_scores.length} events
                              </span>
                            )}
                            {orchestrationResult.results.remediation_plan && (
                              <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded border border-green-200">
                                Remediation Plan Generated
                              </span>
                            )}
                            {orchestrationResult.results.visual && (
                              <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200">
                                Visual Analysis Complete
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="inline-flex items-center px-3 py-1.5 rounded-md bg-green-50 border border-green-200">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-sm font-semibold text-green-700">
                          {(analysisResult.timeline.confidence * 100).toFixed(0)}% Confidence
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Insight Cards (Root Cause, Attack Pattern, Blast Radius) */}
                <InsightCards timeline={analysisResult.timeline} />

                {/* Visual Analysis Upload */}
                <VisualAnalysisUpload
                  onUpload={async (file) => {
                    try {
                      setLoading(true);
                      setError(null);
                      // Use orchestration API to analyze with diagram
                      if (orchestrationResult?.incident_id) {
                        const result = await orchestrationAPI.analyzeIncident(
                          orchestrationResult.results.timeline?.events || [],
                          file,
                          orchestrationResult.metadata?.incident_type
                        );
                        setOrchestrationResult(result);
                        setVisualAnalysisResult(result.results.visual);
                      } else {
                        // Fallback to direct visual API
                        const result = await visualAPI.analyzeDiagram(file);
                        setVisualAnalysisResult(result);
                      }
                    } catch (err: any) {
                      console.error('Visual analysis error:', err);
                      setError('Failed to analyze diagram: ' + (err.response?.data?.detail || err.message));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  analysisResult={visualAnalysisResult}
                  loading={loading}
                />

                {/* Attack Path Diagram (Wiz.io style network graph) */}
                <AttackPathDiagram />

                {/* Remediation Plan */}
                {remediationPlan && (
                  <RemediationPlan
                    plan={remediationPlan}
                    onApprove={async (plan) => {
                      try {
                        setLoading(true);
                        setError(null);
                        // Generate documentation when plan is approved
                        if (orchestrationResult?.incident_id && orchestrationResult.results.timeline && remediationPlan) {
                          const docResult = await documentationAPI.generateDocumentation(
                            orchestrationResult.incident_id,
                            orchestrationResult.results.timeline,
                            remediationPlan
                          );
                          console.log("Documentation generated:", docResult);
                          setDocumentationResult(docResult);
                          // Update orchestration result with documentation status
                          setOrchestrationResult(prev => prev ? {
                            ...prev,
                            agents: { ...prev.agents, documentation: { status: 'COMPLETED' } },
                            results: { ...prev.results, documentation: docResult }
                          } : null);
                        }
                      } catch (err: any) {
                        console.error('Documentation generation error:', err);
                        setError('Failed to generate documentation: ' + (err.response?.data?.detail || err.message));
                      } finally {
                        setLoading(false);
                      }
                    }}
                  />
                )}

                {/* Documentation Display */}
                {(documentationResult || orchestrationResult?.results?.documentation) && (
                  <DocumentationDisplay
                    documentation={(documentationResult || orchestrationResult?.results?.documentation)?.documentation || (documentationResult || orchestrationResult?.results?.documentation)}
                    incidentId={orchestrationResult?.incident_id || analysisResult?.incident_id || 'Unknown'}
                  />
                )}

                {/* Timeline View */}
                <TimelineView timeline={analysisResult.timeline} />
              </div>
            )}

            {!analysisResult && !loading && !error && (
              <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-16 text-center">
                <Play className="h-16 w-16 text-slate-400 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  Select a Demo Scenario
                </h3>
                        <p className="text-slate-600 max-w-md mx-auto">
                          Choose a scenario above to experience Nova Sentinel in action.
                        </p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Main landing page - Wiz-inspired professional design
  return (
    <div className="min-h-screen bg-white">
      {/* Professional Navigation - Fixed (like Wiz) */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <NovaSentinelLogo size={32} />
              <span className="text-lg font-bold text-slate-900">Nova Sentinel</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-sm text-gray-700 hover:text-primary-600 font-medium transition-colors">
                Features
              </a>
              <a href="#demo" className="text-sm text-gray-700 hover:text-primary-600 font-medium transition-colors">
                Demo
              </a>
                    <button
                      onClick={() => {
                        setShowDemo(true);
                        window.location.hash = '#demo';
                      }}
                      className="btn-professional px-6 py-2 bg-primary-600 text-white rounded-lg font-semibold text-sm hover:bg-primary-700"
                    >
                      Try Live Demo
                    </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-700 hover:text-gray-900"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-6 space-y-4">
              <a href="#features" className="block text-gray-700 hover:text-primary-600 font-medium">Features</a>
              <a href="#demo" className="block text-gray-700 hover:text-primary-600 font-medium">Demo</a>
                      <button
                        onClick={() => {
                          setShowDemo(true);
                          window.location.hash = '#demo';
                        }}
                        className="w-full btn-professional px-6 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700"
                      >
                        Try Live Demo
                      </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <LandingHero />

      {/* Features Section */}
      <FeaturesSection />

      {/* CTA Section - Clean (like Wiz) */}
      <section className="py-24 bg-white border-t border-gray-200" id="demo">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            Ready to Secure Your Cloud?
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Experience how Nova Sentinel resolves critical security incidents 
            in under 60 seconds using autonomous AI agents.
          </p>
                  <button
                    onClick={() => {
                      setShowDemo(true);
                      window.location.hash = '#demo';
                    }}
                    className="btn-professional inline-flex items-center px-8 py-4 bg-primary-600 text-white rounded-lg font-semibold text-lg shadow-professional-md hover:bg-primary-700"
                  >
                    <Play className="mr-3 h-6 w-6" />
                    Launch Interactive Demo
                  </button>
        </div>
      </section>

      {/* Footer - Clean, minimal */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-2 mb-4">
              <NovaSentinelLogo size={32} />
              <span className="text-lg font-bold text-slate-900">Nova Sentinel</span>
            </div>
            <p className="text-gray-600 text-center mb-6">
              Built with Amazon Nova for the Amazon Nova AI Hackathon
            </p>
            <p className="text-sm text-gray-500">
              #AmazonNova | #SecOpsLensPro | © 2026
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
