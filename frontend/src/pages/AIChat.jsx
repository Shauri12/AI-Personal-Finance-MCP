import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Plus,
  Trash2,
  MessageSquare,
  Zap,
  Brain,
  ChevronRight,
  Loader2,
  Clock,
  ArrowDown,
} from 'lucide-react';
import api from '../api/client';

// ── Suggested prompts for empty state ────────────────────────────
const SUGGESTED_PROMPTS = [
  { icon: '📊', text: 'How much am I spending this month?', color: 'from-blue-500/20 to-blue-600/20' },
  { icon: '💰', text: 'How can I save more money?', color: 'from-emerald-500/20 to-emerald-600/20' },
  { icon: '💼', text: "How's my investment portfolio?", color: 'from-violet-500/20 to-violet-600/20' },
  { icon: '🎯', text: 'Am I on track for my goals?', color: 'from-amber-500/20 to-amber-600/20' },
  { icon: '🏥', text: 'Give me a financial health check', color: 'from-rose-500/20 to-rose-600/20' },
  { icon: '🔄', text: 'Show my active subscriptions', color: 'from-cyan-500/20 to-cyan-600/20' },
];

// ── Markdown-lite renderer ───────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  for (const line of lines) {
    i++;
    // Bold headers
    if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(<h3 key={i} className="text-white font-bold text-base mt-4 mb-2">{line.replace(/\*\*/g, '')}</h3>);
    }
    // Bullet points
    else if (line.match(/^[•\-\*]\s/)) {
      const content = line.replace(/^[•\-\*]\s/, '');
      elements.push(
        <div key={i} className="flex gap-2 ml-2 my-1">
          <span className="text-primary mt-0.5 shrink-0">•</span>
          <span className="text-gray-300 text-sm leading-relaxed">{renderInline(content)}</span>
        </div>
      );
    }
    // Numbered list
    else if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\./)[1];
      const content = line.replace(/^\d+\.\s/, '');
      elements.push(
        <div key={i} className="flex gap-2 ml-2 my-1">
          <span className="text-primary font-bold text-xs bg-primary/10 w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">{num}</span>
          <span className="text-gray-300 text-sm leading-relaxed">{renderInline(content)}</span>
        </div>
      );
    }
    // Empty line
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    }
    // Regular text
    else {
      elements.push(<p key={i} className="text-gray-300 text-sm leading-relaxed my-1">{renderInline(line)}</p>);
    }
  }

  return elements;
}

function renderInline(text) {
  // Bold text
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ── Message Bubble Component ─────────────────────────────────────
const MessageBubble = ({ message, isLast }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-in group`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-lg ${
        isUser
          ? 'bg-gradient-to-br from-primary to-blue-600 shadow-primary/20'
          : 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/20'
      }`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
      </div>

      {/* Message content */}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary/15 border border-primary/20 rounded-tr-md'
            : 'bg-white/[0.03] border border-white/[0.06] rounded-tl-md'
        }`}>
          {isUser ? (
            <p className="text-sm text-gray-200 leading-relaxed">{message.content}</p>
          ) : (
            <div className="prose-chat">{renderMarkdown(message.content)}</div>
          )}
        </div>
        <span className="text-[10px] text-gray-600 mt-1 px-2 block">
          {message.created_at
            ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Just now'}
        </span>
      </div>
    </div>
  );
};

// ── Typing Indicator ─────────────────────────────────────────────
const TypingIndicator = () => (
  <div className="flex gap-3 animate-in">
    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
      <Bot size={14} className="text-white" />
    </div>
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl rounded-tl-md px-5 py-4">
      <div className="flex gap-1.5 items-center">
        <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        <span className="text-xs text-gray-500 ml-2">Analyzing your finances...</span>
      </div>
    </div>
  </div>
);

// ── Session Sidebar Item ─────────────────────────────────────────
const SessionItem = ({ session, isActive, onClick, onDelete }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all group flex items-center gap-2 ${
      isActive
        ? 'bg-primary/10 border border-primary/20 text-primary'
        : 'text-gray-400 hover:bg-white/5 hover:text-white'
    }`}
  >
    <MessageSquare size={14} className="shrink-0" />
    <span className="text-xs truncate flex-1">
      {session.preview || 'New conversation'}
    </span>
    <button
      onClick={(e) => { e.stopPropagation(); onDelete(session.session_id); }}
      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400 p-1"
    >
      <Trash2 size={12} />
    </button>
  </button>
);

// ── Main Chat Component ──────────────────────────────────────────
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

  // ── Load AI status & sessions on mount ──
  useEffect(() => {
    fetchAIStatus();
    fetchSessions();
  }, []);

  // ── Auto-scroll to bottom on new messages ──
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

  // ── Send message (with SSE streaming) ──
  const sendMessage = useCallback(async (text) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    setInput('');
    const userMsg = { role: 'user', content: messageText, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setStreamingMessage('');

    try {
      // Use streaming endpoint via fetch for SSE support
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
              // Finalize the message
              const aiMsg = {
                role: 'assistant',
                content: accumulatedResponse,
                created_at: new Date().toISOString(),
              };
              setMessages(prev => [...prev, aiMsg]);
              setStreamingMessage('');
              fetchSessions(); // Refresh session list
            } else if (data.type === 'error') {
              throw new Error(data.message);
            }
          } catch (parseErr) {
            // Skip unparseable lines
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      // Fallback to non-streaming
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
          content: '⚠️ Sorry, I encountered an error. Please try again.',
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
    <div className="flex h-[calc(100vh-4rem)] gap-4 -m-8">
      {/* ── Sessions Sidebar ── */}
      <div className="w-64 shrink-0 border-r border-white/[0.06] bg-white/[0.01] flex flex-col">
        <div className="p-4">
          <button
            onClick={startNewSession}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-semibold text-sm hover:bg-primary/20 transition-all"
          >
            <Plus size={16} />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1">
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
            <p className="text-xs text-gray-600 text-center py-8 px-4">
              No conversations yet. Start chatting!
            </p>
          )}
        </div>

        {/* AI Status */}
        {aiStatus && (
          <div className="p-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${
                aiStatus.provider === 'openai' ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' :
                aiStatus.provider === 'gemini' ? 'bg-blue-400 shadow-lg shadow-blue-400/50' :
                'bg-amber-400 shadow-lg shadow-amber-400/50'
              }`} />
              <span className="text-gray-500">
                {aiStatus.provider === 'openai' ? 'GPT-4' :
                 aiStatus.provider === 'gemini' ? 'Gemini' :
                 'AI Engine'}
              </span>
              <span className="text-gray-700 ml-auto">Active</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              FinanceOS AI
              <span className="text-[9px] font-black uppercase tracking-widest text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                MCP
              </span>
            </h2>
            <p className="text-[11px] text-gray-500">Context-aware financial assistant • RAG-powered</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5">
              <Zap size={12} className="text-amber-400" />
              <span className="text-[10px] text-gray-400 font-medium">
                {aiStatus?.provider === 'fallback' ? 'Smart Engine' : 'LLM Connected'}
              </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-6 relative"
        >
          {isEmptyState ? (
            /* ── Empty State ── */
            <div className="flex flex-col items-center justify-center h-full animate-in">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/20 flex items-center justify-center mb-6">
                <Sparkles size={36} className="text-violet-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">How can I help you?</h3>
              <p className="text-gray-500 text-sm mb-8 text-center max-w-md">
                I have access to your complete financial data. Ask me anything about your spending, savings, investments, or goals.
              </p>

              <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt.text)}
                    className={`text-left p-4 rounded-xl bg-gradient-to-br ${prompt.color} border border-white/[0.06] hover:border-white/[0.12] transition-all group`}
                  >
                    <span className="text-xl mb-2 block group-hover:scale-110 transition-transform inline-block">{prompt.icon}</span>
                    <p className="text-xs text-gray-300 leading-relaxed">{prompt.text}</p>
                    <ChevronRight size={14} className="text-gray-600 mt-2 group-hover:translate-x-1 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Message List ── */
            <>
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} isLast={i === messages.length - 1} />
              ))}

              {/* Streaming message */}
              {streamingMessage && (
                <div className="flex gap-3 animate-in">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                    <Bot size={14} className="text-white" />
                  </div>
                  <div className="max-w-[75%]">
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl rounded-tl-md px-4 py-3">
                      <div className="prose-chat">{renderMarkdown(streamingMessage)}</div>
                      <span className="inline-block w-2 h-4 bg-violet-400 animate-pulse ml-1" />
                    </div>
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {isLoading && !streamingMessage && <TypingIndicator />}

              <div ref={messagesEndRef} />
            </>
          )}

          {/* Scroll to bottom button */}
          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className="fixed bottom-32 right-12 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all shadow-lg backdrop-blur-sm z-10"
            >
              <ArrowDown size={16} className="text-white" />
            </button>
          )}
        </div>

        {/* ── Input Area ── */}
        <div className="px-6 py-4 border-t border-white/[0.06]">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your finances..."
                rows={1}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-gray-600 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 outline-none transition-all resize-none min-h-[48px] max-h-[120px]"
                style={{ height: 'auto', overflow: 'hidden' }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              className="w-12 h-12 rounded-xl bg-gradient-to-r from-primary to-violet-500 flex items-center justify-center text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none hover:scale-105 active:scale-95 shrink-0"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
          <p className="text-[10px] text-gray-700 mt-2 text-center">
            FinanceOS AI analyzes your real financial data • Press Enter to send
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
