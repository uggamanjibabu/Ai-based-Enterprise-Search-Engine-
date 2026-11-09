import React, { useState, useEffect } from 'react';
import { AlertCircle, Plus, Search, FileQuestion, ArrowRight, CheckCircle2 } from 'lucide-react';
import { analyticsService } from '../services/api';
import { useToast } from '../components/Toast';

const KnowledgeGapPage = ({ onNavigate }) => {
  const toast = useToast();
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGaps = async () => {
      try {
        const res = await analyticsService.knowledgeGaps();
        setGaps(res.data);
      } catch (err) {
        toast.error('Failed to load knowledge gaps');
      } finally {
        setLoading(false);
      }
    };
    fetchGaps();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-extrabold text-white">Knowledge Gap & Deficit Analysis</h1>
        <p className="text-xs text-slate-400 mt-1">
          Automated intelligence audit: identifies user search queries that yielded zero or low relevance scores to guide internal documentation authoring.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Auditing knowledge base gaps...</div>
      ) : gaps.length === 0 ? (
        <div className="p-12 rounded-3xl bg-navy-900/60 border border-slate-800 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-200">Zero Critical Knowledge Gaps Detected</h3>
          <p className="text-xs text-slate-500 mt-1">All employee and system search queries are resolving with high relevance scores.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <strong>{gaps.length} Unanswered Query Topics Identified:</strong> Below are frequent search queries where employees could not find authoritative documentation.
            </div>
          </div>

          <div className="space-y-3">
            {gaps.map((gap, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-navy-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">#{idx + 1}</span>
                    <span className="text-sm font-bold text-slate-100">"{gap.query}"</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                      {gap.frequency} Failed Searches
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <span className="font-semibold text-electric-400">Suggested Action:</span>
                    <span>{gap.suggested_action}</span>
                  </p>

                  <p className="text-[10px] text-slate-500 font-mono">
                    Last searched: {new Date(gap.last_searched).toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={() => onNavigate('upload')}
                  className="px-4 py-2 rounded-xl bg-electric-600 hover:bg-electric-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload Knowledge</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGapPage;

