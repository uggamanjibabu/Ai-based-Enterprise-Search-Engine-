import React, { useState } from 'react';
import { Search, ExternalLink, Sparkles, Filter, Clock, Download, ArrowLeft } from 'lucide-react';
import { FormatBadge, AccessBadge } from '../components/Badge';

const SearchResultsPage = ({ onNavigate, searchState }) => {
  const [filterType, setFilterType] = useState('all');

  const results = searchState?.results || [];
  const query = searchState?.query || 'Enterprise Query';
  const executionTime = searchState?.executionTime || 32;

  const filtered = filterType === 'all'
    ? results
    : results.filter((r) => r.file_type === filterType);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Back button & Title */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('search')}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Search Form
        </button>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          <span>Execution: {executionTime} ms</span>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-navy-900 border border-slate-800 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">
              Deep Search Results
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Query: <strong className="text-electric-400 font-mono">"{query}"</strong>
            </p>
          </div>

          {/* Quick Format Filter Tabs */}
          <div className="flex items-center gap-1 bg-navy-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            {['all', 'pdf', 'docx', 'txt', 'csv'].map((ft) => (
              <button
                key={ft}
                onClick={() => setFilterType(ft)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase ${
                  filterType === ft
                    ? 'bg-electric-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {ft}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-navy-900/60 border border-slate-800">
            <p className="text-xs text-slate-400">No search results matching filter '{filterType}'</p>
          </div>
        ) : (
          filtered.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-navy-900/90 border border-slate-800 shadow-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500">#{idx + 1}</span>
                  <FormatBadge type={item.file_type} />
                  <span className="text-xs text-slate-400 font-medium">{item.category_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-electric-400">
                    {Math.round(item.relevance_score * 100)}%
                  </span>
                  <span className="text-[10px] text-slate-500 ml-1">Overall Match</span>
                </div>
              </div>

              <h2
                onClick={() => onNavigate('ask', { initialDocId: item.document_id })}
                className="text-base font-bold text-slate-100 hover:text-electric-400 cursor-pointer transition-colors"
              >
                {item.title}
              </h2>

              <div className="p-3 bg-navy-950 rounded-xl border border-slate-800 text-xs text-slate-300">
                {item.match_highlights?.length > 0 ? (
                  item.match_highlights.map((h, i) => (
                    <p key={i} dangerouslySetInnerHTML={{ __html: h }} />
                  ))
                ) : (
                  <p>{item.snippet}</p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <div className="flex items-center gap-3 text-slate-400 text-[11px] font-mono">
                  <span>Keyword: {Math.round(item.keyword_score * 100)}%</span>
                  <span>•</span>
                  <span>Semantic: {Math.round(item.semantic_score * 100)}%</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigate('ask', { initialDocId: item.document_id })}
                    className="px-3 py-1.5 rounded-xl bg-accent-violet hover:bg-accent-purple text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Ask RAG Assistant
                  </button>
                  <a
                    href={`/api/documents/${item.document_id}/download`}
                    download
                    className="px-3 py-1.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-semibold border border-slate-700"
                  >
                    Download
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SearchResultsPage;

