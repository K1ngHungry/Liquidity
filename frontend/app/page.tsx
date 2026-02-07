'use client';

import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import { apiClient, AgentResponse } from '@/lib/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  solverResult?: Record<string, unknown> | null;
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState<Record<string, unknown>[]>([]);
  const [apiStatus, setApiStatus] = useState<string>('Checking...');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    apiClient.healthCheck().then(
      (r) => setApiStatus(`Connected: ${r.message}`),
      () => setApiStatus('API not responding'),
    );
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res: AgentResponse = await apiClient.agentSolve({
        message: text,
        conversation_history: conversation,
      });

      if (controller.signal.aborted) return;
      setConversation(res.conversation);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.content,
          solverResult: res.solver_result,
        },
      ]);
    } catch (err) {
      if (controller.signal.aborted) return;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Is the backend running?' },
      ]);
      console.error(err);
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setInput('');
    setMessages([]);
    setConversation([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Liquidity
          </h1>
          <p className="text-sm text-gray-400">Budget Constraint Solver</p>
        </div>
        <div className="flex items-center gap-4">
          <span
            className={`text-xs px-3 py-1 rounded-full ${
              apiStatus.startsWith('Connected')
                ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                : 'bg-red-500/20 text-red-300 border border-red-500/50'
            }`}
          >
            {apiStatus}
          </span>
          <button
            onClick={resetChat}
            className="text-xs text-gray-400 hover:text-white transition-colors px-3 py-1 border border-white/20 rounded-lg hover:border-white/40"
          >
            New chat
          </button>
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <h2 className="text-3xl font-bold text-white mb-3">
                Describe your budget
              </h2>
              <p className="text-gray-400 max-w-md mx-auto mb-8">
                Tell me your income, spending categories, and constraints.
                I&apos;ll find an optimal allocation for you.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                {[
                  'I make $5000/month. Rent is $1500. I want to save at least $1000 and keep dining under $400.',
                  'Monthly income $8000. Mortgage $2200, car payment $450. Maximize savings but try to keep entertainment under $500.',
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => setInput(example)}
                    className="text-left text-sm text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 rounded-xl p-4 transition-all"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-100 border border-white/10'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.content}
                </div>

                {/* Solver result details */}
                {msg.solverResult && (
                  <SolverDetails result={msg.solverResult} />
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/10 border border-white/10 rounded-2xl px-5 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-white/10 px-4 py-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <textarea
            aria-label="Budget constraints input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your budget constraints..."
            rows={1}
            className="flex-1 bg-white/10 text-white placeholder-gray-500 border border-white/20 focus:border-purple-500 rounded-xl px-4 py-3 resize-none outline-none text-sm transition-colors"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium px-6 rounded-xl transition-all text-sm"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function SolverDetails({ result }: { result: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const solution = result.solution as Record<string, number> | undefined;
  const satisfied = result.satisfied_constraints as string[] | undefined;
  const dropped = result.dropped_constraints as string[] | undefined;

  if (!solution || Object.keys(solution).length === 0) return null;

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-purple-300 hover:text-purple-200 transition-colors"
      >
        {open ? 'Hide' : 'Show'} solver details
      </button>
      {open && (
        <div className="mt-2 space-y-2 text-xs">
          <div>
            <span className="text-gray-400">Status:</span>{' '}
            <span className="text-green-300">{result.status as string}</span>
          </div>
          <div>
            <span className="text-gray-400">Allocation:</span>
            <ul className="mt-1 space-y-1">
              {Object.entries(solution)
                .sort(([, a], [, b]) => b - a)
                .map(([name, value]) => (
                  <li key={name} className="flex justify-between">
                    <span className="text-gray-300">{name}</span>
                    <span className="text-white font-medium">${value.toLocaleString()}</span>
                  </li>
                ))}
            </ul>
          </div>
          {satisfied && satisfied.length > 0 && (
            <div>
              <span className="text-gray-400">Satisfied:</span>
              <ul className="mt-1 space-y-0.5">
                {satisfied.map((c, i) => (
                  <li key={i} className="text-green-300/80">+ {c}</li>
                ))}
              </ul>
            </div>
          )}
          {dropped && dropped.length > 0 && (
            <div>
              <span className="text-gray-400">Relaxed:</span>
              <ul className="mt-1 space-y-0.5">
                {dropped.map((c, i) => (
                  <li key={i} className="text-yellow-300/80">~ {c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
