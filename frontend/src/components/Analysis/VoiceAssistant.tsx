/**
 * Aria — Voice Assistant
 * Real-time voice interaction for security incident analysis
 * Uses Web Speech API for browser-native STT/TTS + Nova 2 Lite backend
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Volume2, VolumeX, Send, X, 
  MessageSquare, ChevronDown, ChevronUp,
  Shield, Search, FileText, DollarSign
} from 'lucide-react';
import { incidentHistoryAPI, voiceAPI } from '../../services/api';

/** Build 30-60 second podcast-style narrative — simple, fun, easy to listen to */
function buildBriefMeNarrative(ctx: any): string {
  if (!ctx?.timeline?.events?.length) {
    return "No incident timeline available. Run an analysis first and I'll give you the full story.";
  }
  const timeline = ctx.timeline;
  const events = [...timeline.events].sort(
    (a: any, b: any) => (a.timestamp || '').localeCompare(b.timestamp || '')
  );
  const steps = ctx.remediation_plan?.steps || [];

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const date = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      return `${time} on ${date}`;
    } catch {
      return ts || 'unknown time';
    }
  };

  const timeDiff = (ts1: string, ts2: string): string => {
    try {
      const d1 = new Date(ts1).getTime();
      const d2 = new Date(ts2).getTime();
      const days = Math.round((d2 - d1) / (24 * 60 * 60 * 1000));
      if (days >= 1) return `${days} day${days > 1 ? 's' : ''} later`;
      const hours = Math.round((d2 - d1) / (60 * 60 * 1000));
      if (hours >= 1) return `${hours} hour${hours > 1 ? 's' : ''} later`;
      const mins = Math.round((d2 - d1) / (60 * 1000));
      if (mins >= 1) return `${mins} minute${mins > 1 ? 's' : ''} later`;
      return 'Next';
    } catch {
      return 'Then';
    }
  };

  /** Extract friendly name from resource string (e.g. "contractor-temp" from "IAM Role: contractor-temp") */
  const friendlyName = (r: string): string => {
    const match = r.match(/:?\s*([a-zA-Z0-9_-]+)$/);
    return match ? match[1] : r;
  };

  const friendlyActor = (a: string): string => {
    if (a.includes('@')) return a.split('@')[0];
    if (a.includes('contractor')) return 'a contractor';
    if (a.includes('attacker') || a.includes('session')) return 'someone';
    if (a.includes('admin-session') || a.includes('admin_session')) return 'an admin';
    if (a.includes('amazonaws')) return 'GuardDuty';
    return a;
  };

  const storyBits: string[] = [];
  let prevTs = '';

  const actionStories: Record<string, (_actor: string, res: string) => string> = {
    CreateRole: (_actor, r) => `created a role called ${friendlyName(r)} — which may have been overly permissive`,
    AttachRolePolicy: (_actor, _res) => `attached full admin access to that role`,
    AuthorizeSecurityGroupIngress: (_actor, _res) => `opened SSH to the internet — which could be a misconfig or risk`,
    DescribeInstances: (_actor, _res) => `listed your EC2 instances`,
    RunInstances: (_actor, _res) => `launched GPU instances — possibly for crypto mining or legitimate workloads`,
    GuardDutyFinding: (_actor, _res) => `detected activity that looks like crypto mining`,
    GetObject: (_actor, _res) => `accessed sensitive data from your bucket`,
    ListBucket: (_actor, _res) => `listed bucket contents`,
    AssumeRole: (_actor, _res) => `assumed the admin role`,
    CreateUser: (_actor, _res) => `created a new user — possibly for persistence`,
    AttachUserPolicy: (_actor, _res) => `gave that user full admin access`,
    ConsoleLogin: (_actor, _res) => `logged into the console`,
  };

  const disclaimer = "Quick note: This is based on CloudTrail data — it could be an incident or a misconfiguration. Always verify before acting. ";
  const skipActions = new Set(['DescribeInstances', 'ListBucket']);
  const filteredEvents = events.length > 5
    ? events.filter((e: any) => !skipActions.has(e.action || ''))
    : events;
  const eventsToUse = filteredEvents.length > 5 ? filteredEvents.slice(0, 5) : filteredEvents;

  for (let i = 0; i < eventsToUse.length; i++) {
    const e = eventsToUse[i];
    const actor = friendlyActor(e.actor || 'someone');
    const resource = e.resource || '';
    const resName = friendlyName(resource);
    const storyteller = actionStories[e.action || ''];
    const story = storyteller
      ? storyteller(actor, resource)
      : `${actor} did something with ${resName || 'your resources'}`;

    const connector = i === 0 ? `So here's what the timeline shows. At ${formatTime(e.timestamp)}` : timeDiff(prevTs, e.timestamp);
    prevTs = e.timestamp || prevTs;
    storyBits.push(`${connector}, ${actor} ${story}.`);
  }

  let rootCause = timeline.root_cause || "something may have gone wrong.";
  rootCause = rootCause
    .replace(/by an? attacker/g, 'by someone — possibly external')
    .replace(/the attacker/g, 'someone')
    .replace(/IAM role with excessive privileges \(AdministratorAccess\) was created for a contractor and later assumed by[^.]+/gi, 'an overly permissive role was created for a contractor and later used by someone — possibly external');
  let topRemediation = steps.length > 0 ? steps[0]?.action : 'check the remediation plan';
  topRemediation = topRemediation
    .replace(/^Revoke IAM role session/i, 'revoke that role session')
    .replace(/^Terminate suspicious EC2 instances/i, 'terminate those instances')
    .replace(/^Disable .+ access keys/i, 'disable those access keys');
  topRemediation = topRemediation.charAt(0).toLowerCase() + topRemediation.slice(1);

  const closing = `Bottom line? The analysis suggests ${rootCause} You may want to ${topRemediation}. Head to the Remediation tab for the full playbook.`;

  return [disclaimer, ...storyBits, closing].join(' ').replace(/\s+/g, ' ').trim();
}

/** Demo fallback responses — dynamic from incidentContext. Keys are fuzzy-matched against user query. */
function getDemoResponse(query: string, ctx: any): string | null {
  if (!ctx) return null;
  const q = query.toLowerCase().trim();
  const timeline = ctx.timeline;
  const steps = ctx.remediation_plan?.steps || [];
  const correlation = ctx.correlation;
  const confidence = Math.round((timeline?.confidence ?? 0.5) * 100);
  const severity = timeline?.events?.some((e: any) => (e.severity || '').toUpperCase() === 'CRITICAL') ? 'critical' : 'high';

  const match = (keys: string[]) => keys.some(k => q.includes(k));

  if (match(['root cause', 'rootcause'])) {
    const rc = timeline?.root_cause || 'The root cause is still under investigation.';
    const ap = timeline?.attack_pattern || '';
    return ap ? `${rc} The attacker exploited ${ap}.` : rc;
  }
  if (match(['attack pattern', 'attackpattern', 'how did they', 'how did the attacker'])) {
    const ap = timeline?.attack_pattern || 'This appears to be a targeted attack.';
    return `${ap} This is classified as ${severity} severity with a confidence of ${confidence}%.`;
  }
  if (match(['remediation', 'remediate', 'fix', 'steps', 'what should i do'])) {
    const top3 = steps.slice(0, 3).map((s: any) => s.action).filter(Boolean);
    if (top3.length === 0) return 'Review the Remediation tab for the full plan. No steps are available in the current context.';
    return `Based on the analysis, the top remediation steps are: ${top3.join('. ')}. See the Remediation tab for full details.`;
  }
  if (match(['blast radius', 'blastradius', 'impact', 'affected'])) {
    const br = timeline?.blast_radius || 'Impact assessment is in progress.';
    return `The blast radius includes: ${br}`;
  }
  if (match(['seen this before', 'seen before', 'correlation', 'similar', 'memory'])) {
    const corr = correlation?.correlation_summary;
    if (corr) return `Based on cross-incident memory, ${corr}`;
    return "This appears to be a new attack pattern not seen in previous incidents. No strong correlation with past incidents.";
  }
  if (match(['compliance', 'cis', 'nist', 'soc2'])) {
    return 'This incident affects the following compliance frameworks: CIS Benchmarks (IAM controls), NIST 800-53 (AC-2, AC-6), and SOC 2 (CC6.1). See the Compliance Mapping tab for details.';
  }
  if (match(['cost', 'financial', 'estimate', 'dollar'])) {
    const est = ctx.remediation_plan?.estimated_time_minutes;
    const costNote = est ? `Estimated response time: ${est} minutes.` : '';
    return `The estimated financial impact includes compromised compute resources, incident response labor, and potential compliance penalties. ${costNote} See the Cost Estimation section for details.`;
  }
  return null;
}

interface VoiceAssistantProps {
  incidentContext?: any;
  incidentId?: string;
  isAnalysisComplete?: boolean;
  /** When true, render inline in tab (no floating button) — tab IS the voice interface */
  embedded?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  action?: string;
  severity?: string;
  suggestions?: string[];
  timestamp: Date;
  processingTime?: number;
}

const VoiceAssistant = ({ incidentContext, incidentId, isAnalysisComplete, embedded = false }: VoiceAssistantProps) => {
  const [isOpen, setIsOpen] = useState(embedded);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [incidentMemoryCount, setIncidentMemoryCount] = useState<number | null>(null);
  const [volume, setVolume] = useState(0.6);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [useNovaSonic, setUseNovaSonic] = useState(false);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch incident memory count when Aria opens with analysis context
  useEffect(() => {
    if (!isOpen || !isAnalysisComplete) return;
    incidentHistoryAPI.list('demo-account').then((r) => setIncidentMemoryCount(r.count ?? 0)).catch(() => setIncidentMemoryCount(null));
  }, [isOpen, isAnalysisComplete]);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        text: isAnalysisComplete
          ? `Hi, I'm Aria — wolfir's security intelligence assistant. I'm here to help you understand incident ${incidentId || 'analysis'}. Ask me about the root cause, attack patterns, compliance impacts, cost estimates, or remediation steps.`
          : "Hi, I'm Aria — wolfir's AI-powered security assistant. Start an analysis, and I can walk you through findings, explain threats, or recommend next steps. You can also ask me about AWS security best practices.",
        timestamp: new Date(),
        suggestions: isAnalysisComplete 
          ? ['What is the root cause?', 'Explain the attack path', 'Show compliance impact', 'Have you seen this attack pattern before?']
          : ['How does wolfir work?', 'What scenarios can you analyze?', 'Explain multi-agent architecture']
      }]);
    }
  }, [isOpen]);

  // Get a female voice from available voices
  const getFemaleVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    // Prefer these female voices (ordered by quality/naturalness)
    const preferredFemale = [
      'Microsoft Aria Online (Natural)',
      'Microsoft Jenny Online (Natural)',
      'Google UK English Female',
      'Google US English',
      'Samantha',
      'Karen',
      'Moira',
      'Tessa',
      'Victoria',
      'Microsoft Zira',
      'Microsoft Aria',
      'Microsoft Jenny',
    ];
    
    for (const name of preferredFemale) {
      const voice = voices.find(v => v.name.includes(name));
      if (voice) return voice;
    }
    
    // Fallback: find any female-sounding voice
    const femaleVoice = voices.find(v => 
      v.name.toLowerCase().includes('female') ||
      v.name.includes('Zira') ||
      v.name.includes('Hazel') ||
      v.name.includes('Susan') ||
      v.name.includes('Aria')
    );
    if (femaleVoice) return femaleVoice;
    
    // Final fallback: second voice (often female on most systems)
    return voices.length > 1 ? voices[1] : voices[0] || null;
  }, []);

  // Preload voices (Chrome loads them async)
  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }, []);

  // Text-to-speech with female voice
  const speak = useCallback((text: string) => {
    if (!speechEnabled) return;
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Select a female voice
    const femaleVoice = getFemaleVoice();
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    utterance.volume = volume;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [speechEnabled, getFemaleVoice, volume]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Submit query to backend (defined early — referenced by startListening)
  const handleSubmit = useCallback(async (text?: string) => {
    const query = text ?? inputText;
    if (!query.trim()) return;
    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: 'user', text: query.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const data = await voiceAPI.query(query.trim(), incidentContext || null);
        const responseText = data.response_text || '';
        if (attempt < maxRetries && (responseText.includes('encountered an error') || responseText.includes('encountered an issue') || responseText.length < 10 || data.error)) continue;
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`, role: 'assistant',
          text: responseText || data.detail || 'Let me try to help with that. Could you rephrase your question?',
          action: data.action, severity: data.severity_assessment, suggestions: data.follow_up_suggestions,
          timestamp: new Date(), processingTime: data.processing_time_ms,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        if (speechEnabled && responseText) speak(responseText);
        setIsProcessing(false);
        return;
      } catch {
        if (attempt < maxRetries) continue;
      }
    }
    const demoResponse = getDemoResponse(query.trim(), incidentContext);
    if (demoResponse) {
      setMessages((prev) => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', text: demoResponse, timestamp: new Date() }]);
      if (speechEnabled) speak(demoResponse);
    } else {
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`, role: 'assistant',
        text: 'I had trouble processing that. Could you rephrase your question?',
        timestamp: new Date(), suggestions: ['What is the root cause?', 'Explain the attack pattern', 'Show remediation steps'],
      }]);
    }
    setIsProcessing(false);
  }, [inputText, incidentContext, speechEnabled, speak]);

  // Nova Sonic: record audio and send to backend (speech-to-speech)
  const startNovaSonicRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const b64 = (reader.result as string).split(',')[1];
          if (!b64) return;
          setIsProcessing(true);
          try {
            const data = await voiceAPI.audioQuery(b64, 'webm', incidentContext || null);
            const responseText = data.response_text || '';
            const msg: ChatMessage = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              text: responseText,
              timestamp: new Date(),
              processingTime: data.processing_time_ms,
            };
            setMessages((prev) => [...prev, msg]);
            if (data.audio_response_b64 && speechEnabled) {
              const audio = new Audio(`data:audio/mpeg;base64,${data.audio_response_b64}`);
              audio.onplay = () => setIsSpeaking(true);
              audio.onended = () => setIsSpeaking(false);
              audio.play().catch(() => speak(responseText));
            } else if (speechEnabled && responseText) {
              speak(responseText);
            }
          } catch {
            setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: 'assistant', text: 'Nova Sonic unavailable. Try text mode.', timestamp: new Date() }]);
          } finally {
            setIsProcessing(false);
          }
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
    } catch (e) {
      console.error('Nova Sonic recording failed:', e);
      setIsListening(false);
    }
  }, [incidentContext, speechEnabled, speak]);

  const stopNovaSonicRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Start speech recognition (browser STT) or Nova Sonic recording
  const startListening = useCallback(() => {
    if (useNovaSonic) {
      startNovaSonicRecording();
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((result: any) => result[0].transcript).join('');
      setInputText(transcript);
      if (event.results[event.results.length - 1].isFinal) handleSubmit(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }, [incidentContext, useNovaSonic, startNovaSonicRecording, handleSubmit]);

  const stopListening = useCallback(() => {
    if (useNovaSonic) {
      stopNovaSonicRecording();
      return;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [useNovaSonic, stopNovaSonicRecording]);

  // Brief Me — generate and speak narrative from timeline (no backend)
  const handleBriefMe = useCallback(() => {
    const narrative = buildBriefMeNarrative(incidentContext);
    const msg: ChatMessage = {
      id: `brief-${Date.now()}`,
      role: 'assistant',
      text: narrative,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, msg]);
    if (speechEnabled) speak(narrative);
  }, [incidentContext, speechEnabled, speak]);

  // Handle suggestion click
  const handleSuggestion = (suggestion: string) => {
    setInputText(suggestion);
    handleSubmit(suggestion);
  };

  const getActionIcon = (action?: string) => {
    switch (action) {
      case 'analyze': return <Search className="w-3 h-3" />;
      case 'remediate': return <Shield className="w-3 h-3" />;
      case 'compliance': return <FileText className="w-3 h-3" />;
      case 'cost': return <DollarSign className="w-3 h-3" />;
      default: return null;
    }
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <>
      {/* Floating Toggle Button — hidden when embedded (tab IS the interface) */}
      {!embedded && (
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all ${
            isOpen 
              ? 'bg-slate-700 hover:bg-slate-800' 
              : 'bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isOpen ? (
            <X className="w-5 h-5 text-white" />
          ) : (
            <div className="relative">
              <MessageSquare className="w-5 h-5 text-white" />
              {isAnalysisComplete && (
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </div>
          )}
        </motion.button>
      )}

      {/* Chat Panel — inline when embedded, floating otherwise */}
      <AnimatePresence>
        {(isOpen || embedded) && (
          <motion.div
            initial={{ opacity: 0, y: embedded ? 0 : 20, scale: embedded ? 1 : 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: embedded ? 0 : 20, scale: embedded ? 1 : 0.95 }}
            transition={{ duration: 0.2 }}
            className={`bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col ${
              embedded
                ? `w-full ${expanded ? 'min-h-[680px]' : 'min-h-[520px]'}`
                : `fixed bottom-24 right-6 z-50 ${expanded ? 'w-[500px] h-[600px]' : 'w-[380px] h-[480px]'}`
            }`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Aria</h3>
                  <p className="text-[10px] text-white/70">
                    {useNovaSonic ? 'Nova Sonic (speech-to-speech)' : 'Nova 2 Lite + browser TTS'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5" title="Volume">
                  <Volume2 className="w-3.5 h-3.5 text-white/80 flex-shrink-0" />
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-12 h-1.5 accent-white/90 bg-white/20 rounded-full cursor-pointer"
                  />
                </div>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  {expanded ? (
                    <ChevronDown className="w-4 h-4 text-white/80" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-white/80" />
                  )}
                </button>
                <button
                  onClick={() => setUseNovaSonic(!useNovaSonic)}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${useNovaSonic ? 'bg-white/30 text-white' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}
                  title={useNovaSonic ? 'Nova Sonic: speech-to-speech (click to switch to text mode)' : 'Click for Nova Sonic speech-to-speech'}
                >
                  Sonic
                </button>
                <button
                  onClick={() => setSpeechEnabled(!speechEnabled)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  title={speechEnabled ? 'Mute voice' : 'Enable voice'}
                >
                  {speechEnabled ? (
                    <Volume2 className="w-4 h-4 text-white/80" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-white/80" />
                  )}
                </button>
              </div>
            </div>

            {/* Memory Badge */}
            {isAnalysisComplete && incidentMemoryCount !== null && incidentMemoryCount > 0 && (
              <div className="px-4 py-1.5 bg-slate-50/80 border-b border-slate-100 flex-shrink-0">
                <span className="text-[10px] text-slate-600 font-medium">🧠 Memory: {incidentMemoryCount} past incident{incidentMemoryCount !== 1 ? 's' : ''} loaded</span>
              </div>
            )}

            {/* Brief Me — prominent card above chat */}
            {isAnalysisComplete && incidentContext?.timeline?.events?.length > 0 && (
              <div className="px-4 pt-4 pb-4 flex-shrink-0 border-b border-slate-100">
                <button
                  onClick={handleBriefMe}
                  disabled={isProcessing || isSpeaking}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Mic className="w-4 h-4" />
                  Brief Me on This Incident
                </button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-2.5'
                      : 'bg-slate-50 text-slate-800 rounded-2xl rounded-bl-md px-4 py-2.5 border border-slate-200'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    
                    {/* Action & severity badges */}
                    {msg.role === 'assistant' && (msg.action || msg.severity) && msg.action !== 'none' && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {msg.action && msg.action !== 'none' && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 font-medium">
                            {getActionIcon(msg.action)}
                            {msg.action}
                          </span>
                        )}
                        {msg.severity && msg.severity !== 'info' && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getSeverityColor(msg.severity)}`}>
                            {msg.severity}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Suggestions */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {msg.suggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => handleSuggestion(s)}
                            className="text-[10px] px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-full text-slate-600 hover:text-indigo-700 transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Processing time */}
                    {msg.processingTime && (
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        Aria via Nova 2 Lite | {msg.processingTime}ms
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
              
              {/* Processing indicator */}
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1.5">
                      <motion.div className="w-2 h-2 bg-indigo-400 rounded-full" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                      <motion.div className="w-2 h-2 bg-indigo-400 rounded-full" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                      <motion.div className="w-2 h-2 bg-indigo-400 rounded-full" animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-slate-200 px-4 py-3 bg-white flex-shrink-0">
              {/* Listening indicator */}
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg"
                >
                  <motion.div
                    className="w-2.5 h-2.5 bg-red-500 rounded-full"
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  />
                  <span className="text-xs text-red-700 font-medium">Listening...</span>
                  <button onClick={stopListening} className="ml-auto text-xs text-red-600 hover:text-red-800">
                    Stop
                  </button>
                </motion.div>
              )}
              
              {/* Speaking indicator */}
              {isSpeaking && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-2 flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg"
                >
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-0.5 bg-indigo-500 rounded-full"
                        animate={{ height: [4, 12, 4] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-indigo-700 font-medium">Speaking...</span>
                  <button onClick={stopSpeaking} className="ml-auto text-xs text-indigo-600 hover:text-indigo-800">
                    Stop
                  </button>
                </motion.div>
              )}
              
              <div className="flex items-center gap-2">
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`p-2.5 rounded-xl transition-all ${
                    isListening
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                  disabled={isProcessing}
                  title={isListening ? 'Stop listening' : 'Start voice input'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
                  placeholder="Ask about the incident..."
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 bg-slate-50"
                  disabled={isProcessing}
                />
                
                <button
                  onClick={() => handleSubmit()}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50"
                  disabled={!inputText.trim() || isProcessing}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-[10px] text-slate-400 text-center mt-2">
                Aria | Powered by Amazon Nova 2 Lite
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceAssistant;
