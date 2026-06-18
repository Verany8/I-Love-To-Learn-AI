import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Trash2, Sparkles, Bot, User, AlertCircle, 
  BrainCircuit, Scale, History, Orbit, MessageSquare, ArrowRight,
  Shield, CheckCircle2
} from 'lucide-react';
import { Message } from './types';
import { STARTER_PROMPTS } from './data/starters';
import MarkdownText from './components/MarkdownText';

export default function App() {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('ai_chatbot_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      }
    } catch (e) {
      console.error("Failed to parse chat memory:", e);
    }
    return [];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorInput, setErrorInput] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'All' | 'Concepts' | 'History' | 'Ethics' | 'Future'>('All');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync to database/local memory
  useEffect(() => {
    localStorage.setItem('ai_chatbot_history', JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  // Handle scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Run scroll to bottom on load
  useEffect(() => {
    setTimeout(scrollToBottom, 100);
  }, []);

  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    setErrorInput(null);
    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const currentConversation = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: currentConversation })
      });

      if (!response.ok) {
        let errorMsg = 'Server error occurred';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMsg = errorData.error || errorMsg;
          } else {
            const textResponse = await response.text();
            if (textResponse && textResponse.length < 300 && !textResponse.includes('<html')) {
              errorMsg = textResponse;
            } else {
              errorMsg = `Server error (Status ${response.status}): ${response.statusText || 'Unable to load valid JSON response'}`;
            }
          }
        } catch {
          errorMsg = `Server error (Status ${response.status}): ${response.statusText || 'Unknown error'}`;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        role: 'model',
        content: data.reply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err: any) {
      console.error("Error communicating with backend:", err);
      setErrorInput(err.message || "Unable to reach the chatbot service. Please ensure your backend is running.");
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(input);
    }
  };

  const startNewConversation = () => {
    if (messages.length === 0) return;
    if (window.confirm("Start a new conversation and clear current thread?")) {
      setMessages([]);
      setErrorInput(null);
    }
  };

  // Filter dynamic starter prompts based on category tab
  const filteredStarters = STARTER_PROMPTS.filter(p => 
    activeCategory === 'All' || p.category === activeCategory
  );

  // Extract recent questions from session to show in recent list
  const userQueries = messages
    .filter(m => m.role === 'user')
    .slice(-4)
    .reverse();

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 font-sans text-slate-800 antialiased overflow-hidden">
      
      {/* 1. Header Navigation Bar matches "Professional Polish" layout */}
      <nav className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shrink-0 shadow-sm z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <div className="w-4 h-4 bg-white rounded-sm flex items-center justify-center">
              <span className="text-[9px] font-extrabold text-indigo-600">I</span>
            </div>
          </div>
          <span className="font-bold text-lg md:text-xl tracking-tight text-slate-800">I love TO LEARN AI</span>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase tracking-wider">
            v2.4.0
          </span>
        </div>

        <div className="flex items-center space-x-4 md:space-x-6 text-sm font-medium text-slate-600">
          <span className="text-indigo-600 border-b-2 border-indigo-600 py-5 font-semibold">
            Chat
          </span>
          <span className="text-slate-400 select-none cursor-default py-5">
            Library
          </span>
          <span className="text-slate-400 select-none cursor-default py-5">
            Settings
          </span>
          <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700">
            AI
          </div>
        </div>
      </nav>

      {/* 2. Main Two-column Frame */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar matches template specification */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 hidden md:flex">
          {/* Action button */}
          <div className="p-4 border-b border-slate-100">
            <button 
              onClick={startNewConversation}
              disabled={messages.length === 0}
              className={`w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg text-sm font-bold border transition ${
                messages.length > 0 
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100/80 cursor-pointer' 
                  : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
            >
              <span className="text-base leading-none">+</span>
              <span>New Conversation</span>
            </button>
          </div>

          {/* Recent list */}
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
            <div>
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-3 py-1">
                Recent Queries
              </div>
              
              <div className="mt-2 space-y-1.5">
                {userQueries.length === 0 ? (
                  <div className="px-3 py-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
                    <p className="text-xs text-slate-400 leading-normal font-medium">
                      No active questions yet. Ask a question to build context.
                    </p>
                  </div>
                ) : (
                  userQueries.map((q, idx) => (
                    <div 
                      key={q.id}
                      className={`p-3 rounded-lg border flex flex-col transition duration-150 ${
                        idx === 0 
                          ? 'bg-indigo-50/40 border-indigo-100' 
                          : 'bg-white border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-semibold text-slate-800 line-clamp-2">
                        {q.content}
                      </span>
                      <span className="text-[9px] text-slate-400 mt-1 font-mono uppercase">
                        {q.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* AI Topics Guide Box */}
            <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
              <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-500" />
                <span>Specialties</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                This chatbot specializes exclusively in Machine Learning, modern neural nets, histories of AI, and future ethical topics.
              </p>
            </div>
          </div>

          {/* Progress Usage Indicator in the exact matching style */}
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 tracking-wide uppercase">
              <span>Dynamic Memory</span>
              <span>{Math.min(100, Math.round((messages.length / 50) * 100))}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2">
              <div 
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(4, Math.min(100, Math.round((messages.length / 50) * 100)))}%` }}
              />
            </div>
          </div>
        </aside>

        {/* Central Chat Panel */}
        <main className="flex-1 flex flex-col bg-white relative overflow-hidden">
          
          {/* Scrollable chat log viewport */}
          <div className="flex-1 overflow-y-auto px-4 py-6 md:p-8 space-y-6">
            <AnimatePresence mode="popLayout">
              {messages.length === 0 ? (
                /* Premium branded welcome hub matching Aura style */
                <motion.div
                  key="welcome-pane"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center justify-center min-h-[50y] max-w-2xl mx-auto text-center py-6"
                >
                  <div className="relative mb-5">
                    <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-xl opacity-30 animate-pulse" />
                    <div className="relative bg-white border border-slate-100 shadow-lg p-4 rounded-2xl text-indigo-600">
                      <Bot className="w-10 h-10" />
                    </div>
                  </div>

                  <h2 className="text-xl md:text-2xl font-bold font-display text-slate-900 tracking-tight">
                    Welcome to I love TO LEARN AI
                  </h2>
                  <p className="mt-2 text-sm text-slate-500 max-w-md leading-relaxed">
                    I am specialized in the domains of Artificial Intelligence. Choose a quick topic below or enter a customized query to start!
                  </p>

                  {/* Category Switcher Tab bar */}
                  <div className="flex flex-wrap justify-center items-center gap-1.5 mt-6 mb-4">
                    {(['All', 'Concepts', 'History', 'Ethics', 'Future'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-150 ${
                          activeCategory === cat
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Starter grid structured as requested */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                    {filteredStarters.map((starter) => {
                      const CategoryIcon = 
                        starter.category === 'History' ? History :
                        starter.category === 'Ethics' ? Scale :
                        starter.category === 'Future' ? Orbit : BrainCircuit;

                      return (
                        <button
                          key={starter.id}
                          onClick={() => handleSendMessage(starter.promptText)}
                          className="group flex gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50/10 hover:border-indigo-300 transition-all text-left w-full shadow-sm"
                        >
                          <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-indigo-100 text-slate-400 group-hover:text-indigo-600 shrink-0 self-start transition-colors">
                            <CategoryIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 pointer-events-none min-w-0">
                            <span className="inline-block text-[9px] font-extrabold text-slate-400 group-hover:text-indigo-600 tracking-wider uppercase mb-0.5">
                              {starter.category}
                            </span>
                            <h4 className="text-xs font-bold text-slate-800 truncate">
                              {starter.label}
                            </h4>
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                              {starter.promptText}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                /* Thread log matching professional layout */
                <div className="space-y-6 max-w-4xl mx-auto">
                  {messages.map((message) => {
                    const isBot = message.role === 'model';
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex gap-4 items-start ${isBot ? '' : 'justify-end'}`}
                      >
                        {/* Bot Avatar Left */}
                        {isBot && (
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-200">
                            <Bot className="w-5 h-5" />
                          </div>
                        )}

                        {/* Text bubble area */}
                        <div className={`flex flex-col space-y-1 ${isBot ? 'max-w-[75%]' : 'max-w-[75%] items-end'}`}>
                          <div className={`p-4 rounded-2xl ${
                            isBot 
                              ? 'bg-slate-50 text-slate-700 border border-slate-100 shadow-sm rounded-tl-none' 
                              : 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                          }`}>
                            {isBot ? (
                              <MarkdownText text={message.content} />
                            ) : (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                            )}
                          </div>
                          
                          {/* Footprint Metadata */}
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider px-1">
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {isBot ? 'Assistant' : 'You'}
                          </span>
                        </div>

                        {/* User Avatar Right */}
                        {!isBot && (
                          <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0 border border-slate-300 flex items-center justify-center text-slate-600 font-bold text-sm">
                            U
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </AnimatePresence>

            {/* Waiting prompt with bouncing dots styling */}
            {isLoading && (
              <div className="flex gap-4 items-start max-w-4xl mx-auto">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 border border-indigo-200">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="flex flex-col space-y-1 max-w-[75%]">
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none shadow-sm">
                    <div className="flex items-center gap-1.5 py-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-bounce" />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider px-1">
                    Thinking...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Operational Errors Banner */}
          {errorInput && (
            <div className="px-6 py-4 border-t border-rose-100 bg-rose-50 text-rose-800 flex items-start gap-4">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1 text-xs">
                <h5 className="font-bold text-rose-900 mb-1">AI Proxy Server Alert</h5>
                <p className="leading-relaxed font-semibold">{errorInput}</p>
                {/* Specific troubleshooting guide for permission denied or key errors */}
                {(errorInput.includes("PERMISSION_DENIED") || errorInput.toLowerCase().includes("permission_denied") || errorInput.toLowerCase().includes("denied access") || errorInput.includes("403")) && (
                  <div className="mt-2.5 p-3.5 bg-white border border-rose-200 rounded-lg text-[11px] text-rose-900 space-y-1.5 shadow-sm">
                    <p className="font-bold">❌ Google Gemini API access was denied.</p>
                    <p>To resolve this restriction and make queries successful:</p>
                    <ul className="list-disc list-inside space-y-1 text-rose-800 ml-1">
                      <li>On **Vercel**: Go to your Project Settings → **Environment Variables**, ensure the name is <code className="px-1 py-0.5 bg-rose-50 border border-rose-100 rounded font-bold font-mono">GEMINI_API_KEY</code>, and re-trigger a deployment.</li>
                      <li>On **AI Studio**: Make sure you have entered active keys in the **Secrets/Environment Variable** side panel.</li>
                      <li>Verify that your API key is correct, active, has Gemini API access, and is not expired or blocked by GCP.</li>
                    </ul>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setErrorInput(null)} 
                className="text-xs text-rose-600 hover:text-rose-900 font-extrabold underline shrink-0 cursor-pointer self-start"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* 3. Input Dashboard area matches styling */}
          <div className="p-4 md:p-8 bg-white border-t border-slate-100">
            <div className="relative flex items-center max-w-4xl mx-auto">
              {/* Main input wrapper */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your query about AI..."
                disabled={isLoading}
                rows={1}
                className="w-full pl-6 pr-32 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 shadow-inner text-sm resize-none h-[54px] max-h-[54px] overflow-hidden"
              />

              {/* Absolute nested operations overlay */}
              <div className="absolute right-2.5 flex items-center space-x-1">
                {messages.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm("Clear current conversation?")) {
                        setMessages([]);
                        setErrorInput(null);
                      }
                    }}
                    className="p-2 hover:bg-slate-200/70 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                    title="Clear Chat history"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  id="send-btn"
                  onClick={() => handleSendMessage(input)}
                  disabled={isLoading || !input.trim()}
                  className={`bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-indigo-700 active:scale-95 transition-all text-xs flex items-center gap-1.5 ${
                    !input.trim() || isLoading ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <span>Send</span>
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Custom bottom footer markers */}
            <div className="mt-3 flex justify-center items-center space-x-4 text-[10px] text-slate-400 uppercase font-bold tracking-widest select-none">
              <div className="flex items-center space-x-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>System Ready</span>
              </div>
              <div className="w-1 h-1 bg-slate-300 rounded-full" />
              <div className="flex items-center space-x-1.5">
                <Shield className="w-3 h-3 text-emerald-500" />
                <span>Privacy Mode Active</span>
              </div>
            </div>
          </div>

        </main>
      </div>

    </div>
  );
}
