import React, { useState, useEffect } from 'react';
import { Settings, Sliders, Shield, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { settingsService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const SettingsPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [settingsData, setSettingsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [keywordWeight, setKeywordWeight] = useState('0.4');
  const [semanticWeight, setSemanticWeight] = useState('0.6');
  const [maxUploadSize, setMaxUploadSize] = useState('50');
  const [nearDuplicateWarning, setNearDuplicateWarning] = useState('true');
  const [defaultAccessLevel, setDefaultAccessLevel] = useState('internal');
  const [ragMaxCitations, setRagMaxCitations] = useState('3');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await settingsService.get();
        const data = res.data;
        setSettingsData(data);
        if (data.keyword_weight) setKeywordWeight(data.keyword_weight.value);
        if (data.semantic_weight) setSemanticWeight(data.semantic_weight.value);
        if (data.max_upload_size_mb) setMaxUploadSize(data.max_upload_size_mb.value);
        if (data.enable_near_duplicate_warning) setNearDuplicateWarning(data.enable_near_duplicate_warning.value);
        if (data.default_access_level) setDefaultAccessLevel(data.default_access_level.value);
        if (data.rag_max_citations) setRagMaxCitations(data.rag_max_citations.value);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (user?.role !== 'admin') {
      toast.error('Only administrators can modify system engine settings.');
      return;
    }

    setSaving(true);
    try {
      await settingsService.update({
        keyword_weight: keywordWeight,
        semantic_weight: semanticWeight,
        max_upload_size_mb: maxUploadSize,
        enable_near_duplicate_warning: nearDuplicateWarning,
        default_access_level: defaultAccessLevel,
        rag_max_citations: ragMaxCitations,
      });
      toast.success('System configuration saved successfully.');
    } catch (err) {
      toast.error('Failed to update system settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-extrabold text-white">System & Engine Configuration</h1>
        <p className="text-xs text-slate-400 mt-1">
          Tune algorithmic search weights, FAISS indexing parameters, and enterprise security policies.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Search Engine Weights */}
        <div className="p-6 rounded-3xl bg-navy-900 border border-slate-800 shadow-xl space-y-4">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-electric-400" />
            Hybrid Search Default Weights
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Default Keyword Weight (BM25): {keywordWeight}
              </label>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={keywordWeight}
                onChange={(e) => {
                  const kw = e.target.value;
                  setKeywordWeight(kw);
                  setSemanticWeight((1 - parseFloat(kw)).toFixed(2));
                }}
                disabled={user?.role !== 'admin'}
                className="w-full accent-electric-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Controls exact keyword token matching influence
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Default Semantic Weight (FAISS): {semanticWeight}
              </label>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={semanticWeight}
                onChange={(e) => {
                  const sw = e.target.value;
                  setSemanticWeight(sw);
                  setKeywordWeight((1 - parseFloat(sw)).toFixed(2));
                }}
                disabled={user?.role !== 'admin'}
                className="w-full accent-accent-violet cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Controls sentence transformer embedding cosine similarity influence
              </p>
            </div>
          </div>
        </div>

        {/* Ingestion & RAG Parameters */}
        <div className="p-6 rounded-3xl bg-navy-900 border border-slate-800 shadow-xl space-y-4">
          <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent-violet" />
            Ingestion & RAG Guardrails
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Maximum Upload Size (MB)
              </label>
              <input
                type="number"
                min="5"
                max="200"
                value={maxUploadSize}
                onChange={(e) => setMaxUploadSize(e.target.value)}
                disabled={user?.role !== 'admin'}
                className="w-full bg-navy-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Default Document Access Level
              </label>
              <select
                value={defaultAccessLevel}
                onChange={(e) => setDefaultAccessLevel(e.target.value)}
                disabled={user?.role !== 'admin'}
                className="w-full bg-navy-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 text-xs"
              >
                <option value="public">Public</option>
                <option value="internal">Internal (Standard)</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Max Passages per RAG Query
              </label>
              <input
                type="number"
                min="1"
                max="8"
                value={ragMaxCitations}
                onChange={(e) => setRagMaxCitations(e.target.value)}
                disabled={user?.role !== 'admin'}
                className="w-full bg-navy-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Duplicate Embedding Detection
              </label>
              <select
                value={nearDuplicateWarning}
                onChange={(e) => setNearDuplicateWarning(e.target.value)}
                disabled={user?.role !== 'admin'}
                className="w-full bg-navy-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 text-xs"
              >
                <option value="true">Enabled (Alert if similarity &gt; 0.88)</option>
                <option value="false">Disabled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        {user?.role === 'admin' ? (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-electric-600 hover:bg-electric-500 text-white text-xs font-bold shadow-lg shadow-electric-600/25 flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Apply System Changes'}
            </button>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-800/60 text-xs text-slate-400 text-center">
            Settings are read-only for non-administrative accounts. Contact an administrator to modify engine parameters.
          </div>
        )}
      </form>
    </div>
  );
};

export default SettingsPage;

