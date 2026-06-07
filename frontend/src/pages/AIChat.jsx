import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Bot,
  User,
  Plus,
  Trash2,
  MessageSquare,
  Loader2,
  ArrowDown,
} from 'lucide-react';
import api from '../api/client';

// some starter prompts
const SUGGESTED = [
  { icon: '📊', text: 'How much am I spending this month?' },
  { icon: '💰', text: 'How can I save more money?' },
  { icon: '💼', text: "How are my investments doing?" },
  { icon: '🎯', text: 'Am I on track for my goals?' },
  { icon: '🏥', text: 'Give me a financial health check' },
  { icon: '🔄', text: 'Show my subscriptions' },
];

// basic markdown-ish renderer
function renderMarkdown(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  for (const line of lines) {
    i++;
    if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(<h3 key={i} className="text-white font-semibold text-sm mt-3 mb-1.5">{line.replace(/\*\*/g, '')}</h3>);
    }
    else if (line.match(/^[•\-\*]\s/)) {
      const content = line.replace(/^[•\-\*]\s/, '');
      elements.push(
        <div key={i} className="flex gap-2 ml-2 my-0.5">
          <span className="text-[#4f8ff7] mt-0.5 shrink-0">•</span>
          <span className="text-gray-300 text-sm leading-relaxed">{renderInline(content)}</span>
        </div>
      );
    }
    else if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\./)[1];
      const content = line.replace(/^\d+\.\s/, '');
      elements.push(
        <div key={i} className="flex gap-2 ml-2 my-0.5">
          <span className="text-[#4f8ff7] text-xs font-medium bg-[#4f8ff7]/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">{num}</span>
          <span className="text-gray-300 text-sm leading-relaxed">{renderInline(content)}</span>
        </div>
      );
    }
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-1.5" />);
    }
    else {
      elements.push(<p key={i} className="text-gray-300 text-sm leading-relaxed my-0.5">{renderInline(line)}</p>);
    }
  }

  return elements;
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-medium">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

const MessageBubble = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''} animate-in`}>
      <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${
        isUser
          ? 'bg-[#4f8ff7]'
          : 'bg-[#7c6bea]'
      }`}>
        {isUser ? <User size={13} className="text-white" /> : <Bot size={13} className="text-white" />}
      </div>

      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-xl px-3.5 py-2.5 ${
          isUser
            ? 'bg-[#4f8ff7]/10 border border-[#4f8ff7]/20 rounded-tr-sm'
            : 'bg-[#16181e] border border-[#22252d] rounded-tl-sm'
        }`}>
          {isUser ? (
            <p className="text-sm text-gray-200">{message.content}</p>
          ) : (
            <div className="prose-chat">{renderMarkdown(message.content)}</div>
          )}
        </div>
        <span className="text-[10px] text-gray-600 mt-0.5 px-1 block">
          {message.created_at
            ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Just now'}
        </span>
      </div>
    </div>
  );
};

const TypingDots = () => (
  <div className="flex gap-2.5 animate-in">
    <div className="w-7 h-7 rounded-lg bg-[#7c6bea] flex items-center justify-center">
      <Bot size={13} className="text-white" />
    </div>
    <div className="bg-[#16181e] border border-[#22252d] rounded-xl rounded-tl-sm px-4 py-3">
      <div className="flex gap-1 items-center">
        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        <span className="text-xs text-gray-600 ml-2">Thinking...</span>
      </div>
    </div>
  </div>
);

const SessionItem = ({ session, isActive, onClick, onDelete }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-2 rounded-lg transition-colors group flex items-center gap-2 ${
      isActive
        ? 'bg-[#4f8ff7]/10 text-[#4f8ff7]'
        : 'text-gray-500 hover:bg-white/[0.03] hover:text-gray-300'
    }`}
  >
    <MessageSquare size={13} className="shrink-0" />
    <span className="text-xs truncate flex-1">
      {session.preview || 'New chat'}
    </span>
    <button
      onClick={(e) => { e.stopPropagation(); onDelete(session.session_id); }}
      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-red-400 p-0.5"
    >
      <Trash2 size={11} />
    </button>
  </button>
);

const AIChat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [aiStatus, setAiStatus] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchAIStatus();
    fetchSessions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
  };

  const fetchAIStatus = async () => {
    try {
      const res = await api.get('/api/chat/status');
      setAiStatus(res.data);
    } catch (err) {
      console.error('Failed to fetch AI status', err);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await api.get('/api/chat/sessions');
      setSessions(res.data);
    } catch (err) {
      console.error('Failed to fetch sessions', err);
    }
  };

  const loadSession = async (sid) => {
    setSessionId(sid);
    try {
      const res = await api.get(`/api/chat/history?session_id=${sid}`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to load session', err);
    }
  };

  const deleteSession = async (sid) => {
    try {
      await api.delete(`/api/chat/sessions/${sid}`);
      setSessions(prev => prev.filter(s => s.session_id !== sid));
      if (sessionId === sid) {
        setSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  const startNewSession = () => {
    setSessionId(null);
    setMessages([]);
    setStreamingMessage('');
    inputRef.current?.focus();
  };

  const sendMessage = useCallback(async (text) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    setInput('');
    const userMsg = { role: 'user', content: messageText, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setStreamingMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/chat/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: messageText,
            session_id: sessionId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = '';
      let newSessionId = sessionId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'session') {
              newSessionId = data.session_id;
              if (!sessionId) setSessionId(data.session_id);
            } else if (data.type === 'chunk') {
              accumulatedResponse += data.content;
              setStreamingMessage(accumulatedResponse);
            } else if (data.type === 'done') {
              const aiMsg = {
                role: 'assistant',
                content: accumulatedResponse,
                created_at: new Date().toISOString(),
              };
              setMessages(prev => [...prev, aiMsg]);
              setStreamingMessage('');
              fetchSessions();
            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          } catch (parseErr) {
            // skip
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      try {
        const res = await api.post('/api/chat/send', {
          message: messageText,
          session_id: sessionId,
        });
        const aiMsg = {
          role: 'assistant',
          content: res.data.response,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, aiMsg]);
        if (!sessionId) setSessionId(res.data.session_id);
        fetchSessions();
      } catch (fallbackErr) {
        const errorMsg = {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false);
      setStreamingMessage('');
    }
  }, [input, isLoading, sessionId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isEmptyState = messages.length === 0 && !streamingMessage;

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 -m-6">
      {/* Sessions sidebar */}
      <div className="w-56 shrink-0 border-r border-[#22252d] bg-[#0c0d11] flex flex-col">
        <div className="p-3">
          <button
            onClick={startNewSession}
            className="w-full flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#4f8ff7]/10 text-[#4f8ff7] text-sm font-medium hover:bg-[#4f8ff7]/15 transition-colors"
          >
            <Plus size={14} />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {sessions.map(session => (
            <SessionItem
              key={session.session_id}
              session={session}
              isActive={sessionId === session.session_id}
              onClick={() => loadSession(session.session_id)}
              onDelete={deleteSession}
            />
          ))}
          {sessions.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-6 px-3">
              No chats yet
            </p>
          )}
        </div>

        {/* status */}
        {aiStatus && (
          <div className="p-3 border-t border-[#22252d]">
            <div className="flex items-center gap-1.5 text-xs">
              <div className={`w-1.5 h-1.5 rounded-full ${
                aiStatus.provider === 'openai' ? 'bg-emerald-400' :
                aiStatus.provider === 'gemini' ? 'bg-blue-400' :
                'bg-amber-400'
              }`} />
              <span className="text-gray-600">
                {aiStatus.provider === 'openai' ? 'GPT-4' :
                 aiStatus.provider === 'gemini' ? 'Gemini' :
                 'AI'} · Connected
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* header */}
        <div className="px-5 py-3 border-b border-[#22252d] flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#7c6bea] flex items-center justify-center">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">AI Chat</h2>
            <p className="text-[11px] text-gray-600">Ask anything about your finances</p>
          </div>
        </div>

        {/* messages */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-5 py-5 space-y-5 relative"
        >
          {isEmptyState ? (
            <div className="flex flex-col items-center justify-center h-full animate-in">
              <div className="w-14 h-14 rounded-2xl bg-[#7c6bea]/15 border border-[#7c6bea]/20 flex items-center justify-center mb-5">
                <Bot size={28} className="text-[#7c6bea]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Ask me anything</h3>
              <p className="text-gray-500 text-sm mb-6 text-center max-w-sm">
                I can help with your spending, savings, investments, and financial goals.
              </p>

              <div className="grid grid-cols-2 gap-2.5 max-w-md w-full">
                {SUGGESTED.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt.text)}
                    className="text-left p-3 rounded-lg bg-[#16181e] border border-[#22252d] hover:border-[#3a3d47] transition-colors"
                  >
                    <span className="text-base mb-1 block">{prompt.icon}</span>
                    <p className="text-xs text-gray-400">{prompt.text}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}

              {streamingMessage && (
                <div className="flex gap-2.5 animate-in">
                  <div className="w-7 h-7 rounded-lg bg-[#7c6bea] flex items-center justify-center">
                    <Bot size={13} className="text-white" />
                  </div>
                  <div className="max-w-[75%]">
                    <div className="bg-[#16181e] border border-[#22252d] rounded-xl rounded-tl-sm px-3.5 py-2.5">
                      <div className="prose-chat">{renderMarkdown(streamingMessage)}</div>
                      <span className="inline-block w-1.5 h-3.5 bg-gray-500 animate-pulse ml-0.5" />
                    </div>
                  </div>
                </div>
              )}

              {isLoading && !streamingMessage && <TypingDots />}

              <div ref={messagesEndRef} />
            </>
          )}

          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className="fixed bottom-28 right-10 w-8 h-8 rounded-full bg-[#22252d] border border-[#3a3d47] flex items-center justify-center hover:bg-[#2a2d37] transition-colors z-10"
            >
              <ArrowDown size={14} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Input */}
        <div className="px-5 py-3 border-t border-[#22252d]">
          <div className="flex gap-2.5 items-end">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your finances..."
                rows={1}
                className="w-full bg-[#16181e] border border-[#22252d] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:border-[#4f8ff7]/40 outline-none transition-colors resize-none min-h-[42px] max-h-[100px]"
                style={{ height: 'auto', overflow: 'hidden' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                }}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 rounded-lg bg-[#4f8ff7] flex items-center justify-center text-white hover:bg-[#3a7ce6] transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
          <p className="text-[10px] text-gray-700 mt-1.5 text-center">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
