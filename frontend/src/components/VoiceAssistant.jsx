import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, Loader2, X, Sparkles } from 'lucide-react';
import api from '../api/client';

const VoiceAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onresult = (event) => {
        const result = Array.from(event.results)
          .map(r => r[0].transcript)
          .join('');
        setTranscript(result);

        if (event.results[0].isFinal) {
          setIsListening(false);
          handleQuery(result);
        }
      };

      recognition.onerror = (e) => {
        setIsListening(false);
        if (e.error === 'not-allowed') {
          setError('Microphone access denied. Please enable it in browser settings.');
        } else {
          setError(`Speech error: ${e.error}`);
        }
      };

      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError('');
      setTranscript('');
      setResponse('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleQuery = async (query) => {
    if (!query.trim()) return;
    setIsProcessing(true);
    setResponse('');

    try {
      const res = await api.post('/api/chat/send', { message: query });
      const text = res.data.response;
      setResponse(text);
    } catch (e) {
      setError('Failed to get AI response');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-shadow"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={24} className="text-white" />
            </motion.div>
          ) : (
            <motion.div key="mic" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <Sparkles size={24} className="text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Voice Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-24 right-6 z-50 w-80 glass-card overflow-hidden shadow-2xl"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-primary" />
                <h3 className="text-sm font-bold">Voice Assistant</h3>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Tap the mic and ask about your finances</p>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto">
              {error && (
                <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded-lg">{error}</div>
              )}

              {transcript && (
                <div className="bg-white/5 p-3 rounded-lg">
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">You said</p>
                  <p className="text-sm text-white">{transcript}</p>
                </div>
              )}

              {isProcessing && (
                <div className="flex items-center gap-2 text-primary">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-xs">Analyzing...</span>
                </div>
              )}

              {response && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-primary/5 p-3 rounded-lg border border-primary/10"
                >
                  <p className="text-[9px] text-primary uppercase tracking-wider mb-1 font-bold">AI Response</p>
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
                    {response.substring(0, 400)}{response.length > 400 ? '...' : ''}
                  </p>
                </motion.div>
              )}

              {!transcript && !response && !error && (
                <div className="text-center py-4">
                  <p className="text-xs text-gray-500">Try asking:</p>
                  <div className="space-y-2 mt-3">
                    {['How much did I spend?', 'Show my savings', "How's my portfolio?"].map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setTranscript(q); handleQuery(q); }}
                        className="block w-full text-left text-[11px] text-gray-400 hover:text-primary p-2 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        "{q}"
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mic Button */}
            <div className="p-4 border-t border-white/5 flex justify-center">
              <motion.button
                onClick={toggleListening}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-500 shadow-lg shadow-red-500/30'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
                whileTap={{ scale: 0.9 }}
                animate={isListening ? { boxShadow: ['0 0 0 0 rgba(239,68,68,0.4)', '0 0 0 20px rgba(239,68,68,0)', '0 0 0 0 rgba(239,68,68,0.4)'] } : {}}
                transition={isListening ? { duration: 1.5, repeat: Infinity } : {}}
              >
                {isListening ? <MicOff size={24} className="text-white" /> : <Mic size={24} className="text-gray-300" />}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceAssistant;
