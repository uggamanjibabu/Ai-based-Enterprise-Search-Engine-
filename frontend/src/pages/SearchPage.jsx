import React, { useState, useEffect } from 'react';
import {
  Search, Sliders, Sparkles, Filter, Clock, FileText,
  ExternalLink, Layers, ArrowRight, CornerDownRight, Zap
} from 'lucide-react';
import { searchService, documentService } from '../services/api';
import { useToast } from '../components/Toast';
import { FormatBadge, AccessBadge } from '../components/Badge';

const SearchPage = ({ onNavigate, initialQuery }) => {
  const toast = useToast();
  const [query, setQuery] = useState(initialQuery || '');
  const [searchType, setSearchType] = useState('hybrid'); // 'hybrid', 'semantic', 'keyword'
  const [keywordWeight, setKeywordWeight] = useState(0.4);
  const [semanticWeight, setSemanticWeight] = useState(0.6);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('');
  const [selectedAccess, setSelectedAccess] = useState('');

  // Results
  const [results, setResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [isKnowledgeGap, setIsKnowledgeGap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await documentService.categories();
        setCategories(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCats();

    if (initialQuery) {
      executeSearch(initialQuery);
    }
  }, [initialQuery]);

  const executeSearch = async (searchQueryText = query) => {
    const textToSearch = searchQueryText.trim();
    if (!textToSearch) {
      toast.warning('Please enter a query to search');
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const res = await searchService.search({
        query: textToSearch,
        search_type: searchType,
        keyword_weight: parseFloat(keywordWeight),
        semantic_weight: parseFloat(semanticWeight),
        filters: {
          file_type: selectedFileType || undefined,
          category_id: selectedCategory ? parseInt(selectedCategory) : undefined,
          access_level: selectedAccess || undefined,
        },
        limit: 15,
        offset: 0,
      });

      setResults(res.data.results);
      setTotalResults(res.data.total_results);
      setExecutionTime(res.data.execution_time_ms);
      setIsKnowledgeGap(res.data.is_knowledge_gap);
    } catch (err) {
      toast.error('Search request failed. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeSearch();
  };

  const sampleQueries = [
    'How many days of paid vacation leave do we get?',
    'What are the mandatory password and MFA rules?',
    'Work from home ergonomic stipend amount',
    'Definition of Done for agile sprint features',
    'GDPR data retention windows and encryption standards',
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-500/10 border border-electric-500/20 text-electric-400 text-xs font-semibold">
          <Zap className="w-3.5 h-3.5" />
          <span>Vector Embeddings (FAISS) + BM25 Lexical Keyword Ranking</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          AI Enterprise Hybrid Search
        </h1>
        <p className="text-xs text-slate-400">
          Query meaning, concepts, and exact terms simultaneously across all verified enterprise documents.
        </p>
      </div>

      {/* Main Search Bar Box */}
      <div className="bg-navy-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2 relative">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question or enter keywords (e.g. 'What is the leave policy for illness?')"
              className="w-full bg-navy-950 text-slate-100 placeholder-slate-500 pl-12 pr-4 py-3 rounded-2xl border border-slate-700/80 text-sm focus:outline-none focus:border-electric-500 focus:ring-1 focus:ring-electric-500 shadow-inner"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-electric-600 to-accent-violet hover:from-electric-500 hover:to-accent-purple text-white text-xs font-bold shadow-lg shadow-electric-600/25 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search Engine'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Engine Modes & Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Search Strategy:</span>
            <div className="inline-flex rounded-xl bg-navy-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setSearchType('hybrid')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  searchType === 'hybrid'
                    ? 'bg-electric-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ⚡ Hybrid (Recommended)
              </button>
              <button
                type="button"
                onClick={() => setSearchType('semantic')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  searchType === 'semantic'
                    ? 'bg-accent-violet text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🧠 Semantic Vector
              </button>
              <button
                type="button"
                onClick={() => setSearchType('keyword')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  searchType === 'keyword'
                    ? 'bg-slate-700 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🔤 Exact Keyword
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
              showFilters
                ? 'bg-navy-800 border-electric-500/50 text-electric-400'
                : 'bg-navy-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Advanced Weights & Filters</span>
          </button>
        </div>

        {/* Advanced Filters & Sliders */}
        {showFilters && (
          <div className="pt-4 border-t border-slate-800/80 space-y-4 animate-slide-up">
            {searchType === 'hybrid' && (
              <div className="p-4 rounded-2xl bg-navy-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    Hybrid Weighted Fusion Formula
                  </span>
                  <span className="text-[11px] font-mono text-electric-400">
                    Score = ({keywordWeight} × Keyword) + ({semanticWeight} × Semantic)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>BM25 Keyword Weight: <strong>{keywordWeight}</strong></span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={keywordWeight}
                      onChange={(e) => {
                        const kw = parseFloat(e.target.value);
                        setKeywordWeight(kw);
                        setSemanticWeight(parseFloat((1 - kw).toFixed(2)));
                      }}
                      className="w-full accent-electric-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>FAISS Semantic Weight: <strong>{semanticWeight}</strong></span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={semanticWeight}
                      onChange={(e) => {
                        const sw = parseFloat(e.target.value);
                        setSemanticWeight(sw);
                        setKeywordWeight(parseFloat((1 - sw).toFixed(2)));
                      }}
                      className="w-full accent-accent-violet cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-navy-950 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-800 text-xs"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Format</label>
                <select
                  value={selectedFileType}
                  onChange={(e) => setSelectedFileType(e.target.value)}
                  className="w-full bg-navy-950 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-800 text-xs"
                >
                  <option value="">All Formats</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX</option>
                  <option value="txt">TXT</option>
                  <option value="csv">CSV</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Confidentiality Level</label>
                <select
                  value={selectedAccess}
                  onChange={(e) => setSelectedAccess(e.target.value)}
                  className="w-full bg-navy-950 text-slate-200 px-3 py-1.5 rounded-xl border border-slate-800 text-xs"
                >
                  <option value="">All Levels</option>
                  <option value="public">Public</option>
                  <option value="internal">Internal</option>
                  <option value="restricted">Restricted</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Queries */}
      {!hasSearched && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent-violet" />
            Try these sample natural-language queries:
          </p>
          <div className="flex flex-wrap gap-2">
            {sampleQueries.map((sq, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(sq);
                  executeSearch(sq);
                }}
                className="px-3 py-1.5 rounded-xl bg-navy-900 hover:bg-navy-800 border border-slate-800 text-slate-300 hover:text-white text-xs text-left transition-colors"
              >
                "{sq}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results Header */}
      {hasSearched && (
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Found <strong>{totalResults}</strong> document{totalResults === 1 ? '' : 's'} matching{' '}
            <span className="text-slate-200 font-semibold">"{query}"</span>
          </span>
          <span className="flex items-center gap-1 text-[11px] font-mono text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            {executionTime} ms
          </span>
        </div>
      )}

      {/* Knowledge Gap Alert if results are zero or low score */}
      {hasSearched && isKnowledgeGap && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between">
          <div className="text-xs text-amber-200">
            <strong className="block text-amber-300 font-semibold">Knowledge Gap Detected</strong>
            This query yielded low relevance scores across indexed documents and has been logged for knowledge-base authoring.
          </div>
          <button
            onClick={() => onNavigate('knowledge-gaps')}
            className="text-xs font-bold text-amber-400 hover:underline shrink-0 ml-4"
          >
            View Gap Report →
          </button>
        </div>
      )}

      {/* Results List */}
      {hasSearched && (
        <div className="space-y-4">
          {results.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-navy-900/60 border border-slate-800">
              <p className="text-sm font-bold text-slate-300">No matching enterprise documents</p>
              <p className="text-xs text-slate-500 mt-1">Try broadening your search terms or adjusting search mode weights.</p>
            </div>
          ) : (
            results.map((item, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-navy-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-xl space-y-3 group"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FormatBadge type={item.file_type} />
                    <span className="text-xs font-semibold text-slate-400">
                      {item.category_name}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-500 font-mono">{item.filename}</span>
                  </div>

                  {/* Relevance Score Pill */}
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-electric-400">
                        {Math.round(item.relevance_score * 100)}% Match
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        KW: {Math.round(item.keyword_score * 100)}% | VEC: {Math.round(item.semantic_score * 100)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h3
                  onClick={() => onNavigate('ask', { initialDocId: item.document_id })}
                  className="text-base font-bold text-slate-100 group-hover:text-electric-400 transition-colors cursor-pointer"
                >
                  {item.title}
                </h3>

                {/* Snippet / Highlighted Text */}
                <div className="p-3.5 rounded-xl bg-navy-950 border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-sans">
                  {item.match_highlights && item.match_highlights.length > 0 ? (
                    item.match_highlights.map((hl, hIdx) => (
                      <div
                        key={hIdx}
                        className="mb-1 last:mb-0"
                        dangerouslySetInnerHTML={{ __html: hl }}
                      />
                    ))
                  ) : (
                    <p>{item.snippet}</p>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-2 text-xs">
                  <span className="text-[11px] text-slate-500">
                    Chunk #{item.chunk_index + 1}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onNavigate('ask', { initialDocId: item.document_id })}
                      className="text-xs font-semibold text-accent-violet hover:text-accent-purple flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Ask AI about this document
                    </button>
                    <a
                      href={`/api/documents/${item.document_id}/download`}
                      download
                      className="text-xs font-semibold text-electric-400 hover:text-electric-300"
                    >
                      Download Document
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPage;

