import React, { useState, useEffect } from 'react';
import { Compass, Sparkles, FileText, ArrowRight, Tag, BookOpen } from 'lucide-react';
import { documentService, aiService } from '../services/api';
import { useToast } from '../components/Toast';
import { FormatBadge } from '../components/Badge';

const RecommendationsPage = ({ onNavigate }) => {
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await documentService.list();
        setDocuments(res.data);
        if (res.data.length > 0) {
          setSelectedDocId(res.data[0].id);
          fetchRecs(res.data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchDocs();
  }, []);

  const fetchRecs = async (docId) => {
    if (!docId) return;
    setLoading(true);
    try {
      const res = await aiService.recommendations(docId);
      setRecommendations(res.data.recommendations);
    } catch (err) {
      toast.error('Failed to load document recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDoc = (e) => {
    const id = e.target.value;
    setSelectedDocId(id);
    fetchRecs(id);
  };

  const selectedDocObj = documents.find((d) => d.id === parseInt(selectedDocId));

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-extrabold text-white">Smart Document Recommendations</h1>
        <p className="text-xs text-slate-400 mt-1">
          Vector similarity discovery: find related enterprise policies, technical SOPs, and cross-department knowledge.
        </p>
      </div>

      {/* Target Document Picker */}
      <div className="p-6 rounded-3xl bg-navy-900 border border-slate-800 shadow-xl space-y-3">
        <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
          Select Source Document for Similarity Analysis
        </label>
        <select
          value={selectedDocId}
          onChange={handleSelectDoc}
          className="w-full bg-navy-950 text-slate-200 px-4 py-3 rounded-2xl border border-slate-700 text-xs focus:outline-none focus:border-electric-500"
        >
          {documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title} ({d.file_type.toUpperCase()}) — {d.category?.name || 'General'}
            </option>
          ))}
        </select>

        {selectedDocObj && (
          <div className="mt-3 p-3 rounded-xl bg-navy-950/80 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <div>
              <span>Analyzing embeddings for: </span>
              <strong className="text-slate-200">{selectedDocObj.title}</strong>
            </div>
            <span className="font-mono text-electric-400 text-[11px]">
              {selectedDocObj.chunk_count} FAISS Chunks
            </span>
          </div>
        )}
      </div>

      {/* Recommendations Cards */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Top Semantically Related Documents
        </h2>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Computing embedding vector similarities...</div>
        ) : recommendations.length === 0 ? (
          <div className="p-12 rounded-3xl bg-navy-900/60 border border-slate-800 text-center">
            <Compass className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">No similar documents found for this selection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec) => (
              <div
                key={rec.document_id}
                className="p-5 rounded-2xl bg-navy-900/90 border border-slate-800 hover:border-slate-700 transition-all shadow-xl flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <FormatBadge type={rec.file_type} />
                    <span className="text-xs font-extrabold text-electric-400">
                      {Math.round(rec.similarity_score * 100)}% Similarity
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 line-clamp-1">{rec.title}</h3>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {rec.summary || 'Related enterprise content identified via vector proximity.'}
                  </p>

                  {/* Common Topics */}
                  {rec.common_topics && rec.common_topics.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {rec.common_topics.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-electric-500/10 text-electric-400 border border-electric-500/20 text-[10px] font-mono"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">{rec.category_name}</span>
                  <button
                    onClick={() => onNavigate('ask', { initialDocId: rec.document_id })}
                    className="text-xs font-bold text-accent-violet hover:underline flex items-center gap-1"
                  >
                    <span>Inspect with RAG</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationsPage;

