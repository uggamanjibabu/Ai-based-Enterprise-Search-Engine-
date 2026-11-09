import React from 'react';
import {
  Sparkles, Code, Cpu, Database, ShieldCheck, CheckCircle2,
  Layers, Search, Zap, ExternalLink
} from 'lucide-react';

const AboutProjectPage = () => {
  const stack = [
    { title: 'Frontend UI/UX', tech: 'React.js, Vite, Tailwind CSS, Lucide Icons, Recharts', role: 'Enterprise SaaS Dashboard with Dark/Light themes' },
    { title: 'Backend API', tech: 'Python, FastAPI, RESTful Endpoints, Pydantic v2', role: 'High-throughput asynchronous API layer' },
    { title: 'Relational Database', tech: 'SQLite, SQLAlchemy 2.0 ORM, Migrations', role: 'Normalized schema with RBAC and query history' },
    { title: 'Semantic Vector Store', tech: 'FAISS (Facebook AI Similarity Search)', role: 'Inner-product cosine similarity on 384-dim vectors' },
    { title: 'Embedding Model', tech: 'Sentence Transformers (all-MiniLM-L6-v2)', role: 'Local neural representation for context understanding' },
    { title: 'Keyword Search Engine', tech: 'BM25Okapi & TF-IDF Vectorization', role: 'Exact token matching and frequency scoring' },
    { title: 'Document Parsers', tech: 'PyPDF, python-docx, Pandas (CSV), Text decoding', role: 'Automatic text extraction, cleaning & chunking' },
    { title: 'RAG Architecture', tech: 'Extractive Reasoning Fallback + LLM Adapter', role: 'Hallucination-free answers with exact citations' },
  ];

  const credentials = [
    { role: 'Administrator', email: 'admin@nexus.ai', pass: 'Admin@12345', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30', access: 'Full platform administration, user management, analytics, document deletion' },
    { role: 'Manager', email: 'manager@nexus.ai', pass: 'Manager@12345', badge: 'bg-electric-500/20 text-electric-300 border-electric-500/30', access: 'Upload documents, view team analytics, access public/internal/restricted files' },
    { role: 'Employee', email: 'employee@nexus.ai', pass: 'Employee@12345', badge: 'bg-slate-700 text-slate-300 border-slate-600', access: 'Hybrid AI search, Ask This Document RAG, personal search history' },
  ];

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* Hero Header */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-navy-900 via-navy-850 to-navy-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-500/10 border border-electric-500/20 text-electric-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>University Special Project — 2026</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            NEXUS AI — Enterprise Intelligence Search
          </h1>
          <p className="text-sm text-electric-400 font-semibold italic">
            "Turn Scattered Information into Instant Knowledge."
          </p>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            A production-ready enterprise search and Retrieval-Augmented Generation (RAG) platform. Combines dense semantic vector embeddings in FAISS with sparse BM25 lexical keyword matching, automated multi-format document ingestion, and role-based access control.
          </p>
        </div>
      </div>

      {/* Demo Credentials Section */}
      <div className="p-6 rounded-3xl bg-navy-900 border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Demo Authentication Credentials
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {credentials.map((c, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-navy-950 border border-slate-800/80 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.badge}`}>
                  {c.role}
                </span>
              </div>
              <div className="font-mono text-[11px] text-slate-300">
                <p>Email: <strong className="text-electric-400">{c.email}</strong></p>
                <p>Password: <strong className="text-slate-200">{c.pass}</strong></p>
              </div>
              <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 leading-normal">
                {c.access}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Architecture Matrix */}
      <div className="p-6 rounded-3xl bg-navy-900 border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-electric-400" />
          Technical Stack & Component Architecture
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {stack.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-navy-950 border border-slate-800/80 space-y-1 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100">{item.title}</span>
                <span className="w-2 h-2 rounded-full bg-electric-400" />
              </div>
              <p className="text-electric-400 font-mono text-[11px] font-semibold">{item.tech}</p>
              <p className="text-slate-400 text-[11px]">{item.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Algorithmic Methodology */}
      <div className="p-6 rounded-3xl bg-navy-900 border border-slate-800 shadow-xl space-y-3">
        <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent-violet" />
          Hybrid Search & RAG Scoring Methodology
        </h2>
        <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
          <p>
            <strong>1. Hybrid Score Fusion:</strong> Combines lexical and semantic relevance via normalized convex combination:
          </p>
          <div className="p-3 rounded-xl bg-navy-950 font-mono text-electric-400 text-[11px] border border-slate-800">
            Hybrid Score = (0.4 × BM25 Keyword Score) + (0.6 × FAISS Semantic Score)
          </div>
          <p>
            <strong>2. Duplicate Detection:</strong> Utilizes dual verification: SHA-256 cryptographic hashing for identical files and embedding cosine similarity thresholds (&gt;0.88) for near-duplicate documents.
          </p>
          <p>
            <strong>3. Knowledge Gap Analysis:</strong> Queries with max relevance &lt; 0.20 or zero matches are aggregated and ranked by frequency to alert content administrators to missing enterprise documentation.
          </p>
          <p>
            <strong>4. Offline Extractive RAG Fallback:</strong> If no external LLM key is configured, the local offline engine extracts candidate sentences from top FAISS passages and synthesizes an accurate answer with exact document and chunk citations.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutProjectPage;

