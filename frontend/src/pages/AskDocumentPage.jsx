import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, Send, FileText, CheckCircle2, ChevronRight,
  BookOpen, Quote, RefreshCw, AlertCircle, Bot, User, ArrowRight
} from 'lucide-react';
import { aiService, documentService } from '../services/api';
import { useToast } from '../components/Toast';
import { FormatBadge } from '../components/Badge';

const AskDocumentPage = ({ initialDocId }) => {
  const toast = useToast();
  const chatBottomRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(initialDocId || '');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Welcome to NEXUS RAG Intelligence! Select an enterprise document or search across the entire verified knowledge base to ask questions with exact citation evidence.',
      citations: [],
      provider: 'NEXUS Knowledge Engine',
      followups: [
        'How many annual paid leave days are granted to employees?',
        'What are the mandatory password and multi-factor authentication rules?',
        'What is the stipend provided for remote work home offices?',
      ]
    }
  ]);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await documentService.list();
        setDocuments(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDocs();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleAsk = async (questionText = question) => {
    const q = questionText.trim();
    if (!q) return;

    const userMessage = { role: 'user', content: q };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);

    try {
      const res = await aiService.ask({
        question: q,
        document_id: selectedDocId ? parseInt(selectedDocId) : null,
      });

      const assistantMessage = {
        role: 'assistant',
        content: res.data.answer,
        citations: res.data.citations,
        provider: res.data.provider_used,
        confidence: res.data.confidence_score,
        followups: res.data.suggested_followups,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      toast.error('Failed to get answer from AI Engine.');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error retrieving or processing document passages. Please verify the backend is running.',
          citations: [],
          provider: 'System Error',
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowupClick = (fu) => {
    handleAsk(fu);
  };

  const selectedDocObj = documents.find((d) => d.id === parseInt(selectedDocId));

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto h-[calc(100vh-5rem)] flex flex-col">
      {/* Header & Document Scoping Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-navy-900 border border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-violet/20 border border-accent-violet/30 flex items-center justify-center text-accent-violet">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Ask This Document</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-violet/20 text-accent-violet border border-accent-violet/30">
                RAG QA
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Retrieval-Augmented Generation with strict citation verification
            </p>
          </div>
        </div>

        {/* Document Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label className="text-xs text-slate-400 font-medium">Context Scope:</label>
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="bg-navy-950 text-slate-200 text-xs px-3 py-1.5 rounded-xl border border-slate-700/80 focus:outline-none focus:border-electric-500 max-w-xs truncate"
          >
            <option value="">🌐 Entire Enterprise Knowledge Base</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                📄 {d.title} ({d.file_type.toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl bg-navy-950/60 border border-slate-800/80">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 max-w-3xl ${
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
              msg.role === 'user'
                ? 'bg-electric-600 text-white'
                : 'bg-accent-violet/20 text-accent-violet border border-accent-violet/30'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble Content */}
            <div className={`space-y-3 ${msg.role === 'user' ? 'items-end' : ''}`}>
              <div className={`p-4 rounded-2xl text-xs leading-relaxed shadow-lg ${
                msg.role === 'user'
                  ? 'bg-electric-600 text-white rounded-tr-none'
                  : 'bg-navy-900 border border-slate-800 text-slate-200 rounded-tl-none'
              }`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Provider Label */}
                {msg.provider && msg.role === 'assistant' && (
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Engine: <strong>{msg.provider}</strong></span>
                    {msg.confidence && (
                      <span className="font-mono text-emerald-400">
                        Confidence: {Math.round(msg.confidence * 100)}%
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Source Passages / Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Quote className="w-3 h-3 text-electric-400" />
                    Verified Source Passages ({msg.citations.length}):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {msg.citations.map((cite, cIdx) => (
                      <div
                        key={cIdx}
                        className="p-3 rounded-xl bg-navy-900/80 border border-slate-800 hover:border-slate-700 text-xs space-y-1.5 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-electric-400 truncate text-[11px]">
                            {cite.document_title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            Chunk #{cite.chunk_index + 1}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 line-clamp-3 italic">
                          "{cite.passage}"
                        </p>
                        <div className="text-[10px] text-slate-500 font-mono text-right">
                          Relevance: {Math.round(cite.relevance_score * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Follow-up Questions */}
              {msg.followups && msg.followups.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                    Suggested Follow-up Questions:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.followups.map((fu, fIdx) => (
                      <button
                        key={fIdx}
                        onClick={() => handleFollowupClick(fu)}
                        className="px-2.5 py-1 rounded-lg bg-navy-900 hover:bg-navy-800 border border-slate-800 hover:border-accent-violet/40 text-slate-300 hover:text-white text-[11px] text-left transition-colors flex items-center gap-1"
                      >
                        <span>{fu}</span>
                        <ArrowRight className="w-3 h-3 text-accent-violet" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-xl">
            <div className="w-8 h-8 rounded-xl bg-accent-violet/20 border border-accent-violet/30 flex items-center justify-center text-accent-violet shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-navy-900 border border-slate-800 rounded-tl-none flex items-center gap-2 text-xs text-slate-400">
              <div className="w-3 h-3 border-2 border-accent-violet border-t-transparent rounded-full animate-spin" />
              <span>Embedding query & retrieving FAISS passages...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="flex gap-2 p-2 rounded-2xl bg-navy-900 border border-slate-800 shrink-0 shadow-xl"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={
            selectedDocObj
              ? `Ask a question about "${selectedDocObj.title}"...`
              : 'Ask a question across all accessible enterprise documents...'
          }
          className="flex-1 bg-navy-950 text-slate-200 placeholder-slate-500 px-4 py-2.5 rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-accent-violet"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-accent-violet to-electric-600 hover:from-accent-purple hover:to-electric-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-40"
        >
          <span>Ask RAG</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};

export default AskDocumentPage;

