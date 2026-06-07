import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Play, Volume2, X } from 'lucide-react';
import api from '../api/client';

const VoiceAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(new Audio());

  useEffect(() => {
    const player = audioPlayerRef.current;
    const handleEnded = () => setIsPlaying(false);
    player.addEventListener('ended', handleEnded);
    return () => {
      player.removeEventListener('ended', handleEnded);
      player.pause();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = processAudio;

      mediaRecorder.start();
      setIsRecording(true);
      setTranscript('');
      setResponse(null);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const processAudio = async () => {
    setIsProcessing(true);
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    try {
      const res = await api.post('/api/voice/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setTranscript(res.data.transcript);
      setResponse(res.data.response);

      if (res.data.audio_url) {
        const audioUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${res.data.audio_url}`;
        audioPlayerRef.current.src = audioUrl;
      }
    } catch (err) {
      console.error('Error processing voice command:', err);
      setTranscript('Error processing audio.');
    } finally {
      setIsProcessing(false);
    }
  };

  const playResponse = () => {
    if (audioPlayerRef.current.src) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
        setIsPlaying(false);
      } else {
        audioPlayerRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleAssistant = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      stopRecording();
      if (isPlaying) {
        audioPlayerRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={toggleAssistant}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-[#4f8ff7] text-white flex items-center justify-center shadow-lg hover:bg-[#3a7ce6] transition-transform hover:scale-105 z-40"
      >
        <Mic size={20} />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 bg-[#16181e] border border-[#22252d] rounded-xl shadow-xl z-50 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-[#22252d] flex justify-between items-center bg-[#111318]">
            <div className="flex items-center gap-2">
              <Mic size={14} className="text-[#4f8ff7]" />
              <h3 className="text-sm font-semibold text-white">Voice Assistant</h3>
            </div>
            <button onClick={toggleAssistant} className="text-gray-500 hover:text-white p-1">
              <X size={14} />
            </button>
          </div>

          <div className="p-5 flex flex-col items-center min-h-[160px] justify-center">
            {isProcessing ? (
              <div className="flex flex-col items-center text-gray-400">
                <Loader2 size={24} className="animate-spin mb-3 text-[#4f8ff7]" />
                <p className="text-sm">Processing...</p>
              </div>
            ) : response ? (
              <div className="w-full space-y-3">
                <div className="bg-[#111318] p-3 rounded-lg border border-[#22252d]">
                  <p className="text-[11px] text-gray-500 mb-1">You said:</p>
                  <p className="text-sm text-white italic">"{transcript}"</p>
                </div>
                <div className="bg-[#4f8ff7]/10 p-3 rounded-lg border border-[#4f8ff7]/20">
                  <p className="text-[11px] text-[#4f8ff7] mb-1">Response:</p>
                  <p className="text-sm text-gray-200">{response}</p>
                </div>
                {audioPlayerRef.current.src && (
                  <button 
                    onClick={playResponse}
                    className="flex items-center gap-2 text-xs text-[#4f8ff7] hover:underline mt-1"
                  >
                    {isPlaying ? <Square size={12} /> : <Volume2 size={12} />}
                    {isPlaying ? 'Stop Audio' : 'Play Audio'}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <p className="text-sm text-gray-400 mb-4">
                  {isRecording ? 'Listening...' : 'Tap to start recording'}
                </p>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isRecording 
                      ? 'bg-red-500/20 text-red-500 border-2 border-red-500 animate-pulse' 
                      : 'bg-[#22252d] text-white hover:bg-[#2a2d37]'
                  }`}
                >
                  {isRecording ? <Square size={20} /> : <Mic size={24} />}
                </button>
              </div>
            )}
          </div>

          {response && !isProcessing && (
            <div className="p-3 border-t border-[#22252d] bg-[#111318] flex justify-center">
              <button 
                onClick={() => { setResponse(null); setTranscript(''); }}
                className="text-xs text-gray-500 hover:text-white"
              >
                Clear & Start Over
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default VoiceAssistant;
