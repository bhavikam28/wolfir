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
import { incidentHistoryAPI } from '../../services/api';

interface VoiceAssistantProps {
  incidentContext?: any;
  incidentId?: string;
  isAnalysisComplete?: boolean;
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

const VoiceAssistant = ({ incidentContext, incidentId, isAnalysisComplete }: VoiceAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [incidentMemoryCount, setIncidentMemoryCount] = useState<number | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
          ? `Hi, I'm Aria — Nova Sentinel's security intelligence assistant. I'm here to help you understand incident ${incidentId || 'analysis'}. Ask me about the root cause, attack patterns, compliance impacts, cost estimates, or remediation steps.`
          : "Hi, I'm Aria — Nova Sentinel's AI-powered security assistant. Start an analysis, and I can walk you through findings, explain threats, or recommend next steps. You can also ask me about AWS security best practices.",
        timestamp: new Date(),
        suggestions: isAnalysisComplete 
          ? ['What is the root cause?', 'Explain the attack path', 'Show compliance impact', 'Have you seen this attack pattern before?']
          : ['How does Nova Sentinel work?', 'What scenarios can you analyze?', 'Explain multi-agent architecture']
      }]);
    }
  }, [isOpen]);

  // Start speech recognition
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      
      setInputText(transcript);
      
      // If final result, submit
      if (event.results[event.results.length - 1].isFinal) {
        handleSubmit(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [incidentContext]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

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
    utterance.volume = 0.85;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [speechEnabled, getFemaleVoice]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Submit query to backend
  const handleSubmit = async (text?: string) => {
    const query = text || inputText;
    if (!query.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);

    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch('http://localhost:8000/api/voice/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: query.trim(),
            incident_context: incidentContext || null
          })
        });

        const data = await response.json();
        
        // Check if response indicates an error/empty response — retry if so
        const responseText = data.response_text || '';
        if (attempt < maxRetries && (
          responseText.includes('encountered an error') || 
          responseText.includes('encountered an issue') ||
          responseText.length < 10 ||
          data.error
        )) {
          continue; // Retry
        }
        
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: responseText || data.detail || 'Let me try to help with that. Could you rephrase your question?',
          action: data.action,
          severity: data.severity_assessment,
          suggestions: data.follow_up_suggestions,
          timestamp: new Date(),
          processingTime: data.processing_time_ms
        };

        setMessages(prev => [...prev, assistantMessage]);
        
        // Speak the response
        if (speechEnabled && responseText) {
          speak(responseText);
        }
        setIsProcessing(false);
        return; // Success — exit
      } catch (err) {
        if (attempt < maxRetries) continue; // Retry on network error
      }
    }

    // All retries exhausted
    const errorMessage: ChatMessage = {
      id: `error-${Date.now()}`,
      role: 'assistant',
      text: 'I had trouble processing that. Could you try rephrasing your question? For example, ask about "the attack pattern" or "remediation steps".',
      timestamp: new Date(),
      suggestions: ['What is the root cause?', 'Explain the attack pattern', 'Show remediation steps']
    };
    setMessages(prev => [...prev, errorMessage]);
    setIsProcessing(false);
  };

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
      {/* Floating Toggle Button */}
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

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-24 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col ${
              expanded ? 'w-[500px] h-[600px]' : 'w-[380px] h-[480px]'
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
                  <p className="text-[10px] text-white/70">Security Intelligence by Nova 2 Lite</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                      <p className="text-[9px] text-slate-400 mt-1.5">
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
              
              <p className="text-[9px] text-slate-400 text-center mt-2">
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
