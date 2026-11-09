import React, { useState, useEffect } from 'react';
import { History, Search, Trash2, Clock, RotateCcw, AlertCircle } from 'lucide-react';
import { searchService } from '../services/api';
import { useToast } from '../components/Toast';

const SearchHistoryPage = ({ onNavigate }) => {
  const toast = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await searchService.history(50);
      setHistory(res.data);
    } catch (err) {
      toast.error('Failed to load search history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear your entire search history?')) return;
    try {
      await searchService.clearHistory();
      setHistory([]);
      toast.success('Search history cleared');
    } catch (err) {
      toast.error('Failed to clear search history');
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await searchService.deleteHistoryItem(id);
      setHistory(history.filter((h) => h.id !== id));
      toast.info('Item removed');
    } catch (err) {
      toast.error('Failed to delete item');
    }
  };

  const handleRepeatSearch = (queryText) => {
    onNavigate('search', { initialQuery: queryText });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white">Search History</h1>
          <p className="text-xs text-slate-400 mt-1">
            Review past search sessions, latency telemetry, and repeat previous queries.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 rounded-xl bg-navy-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear History
          </button>
        )}
      </div>

      {/* History List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading history logs...</div>
      ) : history.length === 0 ? (
        <div className="p-12 rounded-3xl bg-navy-900/60 border border-slate-800 text-center">
          <History className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-300">No search history recorded</h3>
          <p className="text-xs text-slate-500 mt-1">Queries you execute in the search engine will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-navy-900/80 border border-slate-800 hover:border-slate-700/80 transition-colors flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-electric-500/10 text-electric-400 border border-electric-500/20 flex items-center justify-center shrink-0">
                  <Search className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">"{item.query}"</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 font-mono">
                    <span className="capitalize">{item.search_type} Mode</span>
                    <span>•</span>
                    <span>{item.total_results} results</span>
                    <span>•</span>
                    <span>{item.execution_time_ms} ms</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                  {new Date(item.created_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <button
                  onClick={() => handleRepeatSearch(item.query)}
                  title="Repeat Search"
                  className="px-2.5 py-1.5 rounded-lg bg-navy-800 hover:bg-electric-600 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Repeat</span>
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  title="Remove from history"
                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchHistoryPage;

