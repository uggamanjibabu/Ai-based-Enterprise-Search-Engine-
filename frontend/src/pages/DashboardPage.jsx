import React, { useState, useEffect } from 'react';
import {
  FileText, Search, Clock, Users, ArrowUpRight, TrendingUp,
  FolderArchive, Sparkles, CheckCircle2, AlertTriangle, ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import { analyticsService, documentService } from '../services/api';
import { StatusBadge, FormatBadge } from '../components/Badge';

const DashboardPage = ({ onNavigate }) => {
  const [stats, setStats] = useState(null);
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [dashRes, docRes] = await Promise.all([
          analyticsService.dashboard(),
          documentService.list()
        ]);
        setStats(dashRes.data);
        setRecentDocs(docRes.data.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard statistics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-electric-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading intelligence dashboard metrics...</p>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total Indexed Documents',
      value: stats?.indexed_documents_count ?? 0,
      sub: `${stats?.total_documents ?? 0} total ingested`,
      icon: FileText,
      color: 'from-blue-600 to-electric-500',
    },
    {
      label: 'Searches Executed',
      value: stats?.total_searches ?? 0,
      sub: 'FAISS + BM25 Hybrid',
      icon: Search,
      color: 'from-purple-600 to-accent-violet',
    },
    {
      label: 'Avg Response Latency',
      value: `${stats?.average_response_time_ms ?? 34} ms`,
      sub: 'High performance vector lookup',
      icon: Clock,
      color: 'from-emerald-600 to-teal-500',
    },
    {
      label: 'Active Enterprise Users',
      value: stats?.total_users ?? 0,
      sub: 'RBAC Access Controlled',
      icon: Users,
      color: 'from-amber-600 to-orange-500',
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-navy-900 via-navy-850 to-navy-900 border border-slate-800 p-8 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-electric-500/10 border border-electric-500/20 text-electric-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>NEXUS AI Enterprise Engine Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Turn Scattered Information into Instant Knowledge.
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
            All enterprise policies, legal contracts, engineering standards, and financial records indexed in FAISS with real-time hybrid scoring.
          </p>
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={() => onNavigate('search')}
              className="px-4 py-2 rounded-xl bg-electric-600 hover:bg-electric-500 text-white text-xs font-bold shadow-lg shadow-electric-600/30 flex items-center gap-2 transition-all"
            >
              <Search className="w-4 h-4" />
              Launch Hybrid Search
            </button>
            <button
              onClick={() => onNavigate('ask')}
              className="px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4 text-accent-violet" />
              Ask This Document (RAG)
            </button>
          </div>
        </div>
        <div className="absolute -right-12 -bottom-12 w-80 h-80 bg-electric-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-navy-900/80 border border-slate-800 hover:border-slate-700 transition-all shadow-lg relative overflow-hidden group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">{kpi.label}</span>
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${kpi.color} flex items-center justify-center text-white shadow-md`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-white tracking-tight">{kpi.value}</div>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                {kpi.sub}
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Activity Trends (Area Chart) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-navy-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-100">Search Activity & Query Volume</h2>
              <p className="text-xs text-slate-400">Daily search request frequency across the enterprise</p>
            </div>
            <button
              onClick={() => onNavigate('analytics')}
              className="text-xs text-electric-400 hover:underline flex items-center gap-1"
            >
              Full Analytics <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.search_activity_weekly || []}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a1128',
                    borderColor: '#1e293b',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#e2e8f0',
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="p-6 rounded-2xl bg-navy-900/80 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-100 mb-1">Knowledge Distribution</h2>
            <p className="text-xs text-slate-400 mb-4">Documents indexed by enterprise category</p>
            
            <div className="space-y-3">
              {stats?.categories?.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-slate-300 font-medium">{cat.name}</span>
                  </div>
                  <span className="font-bold text-slate-100 px-2 py-0.5 rounded bg-slate-800/80">
                    {cat.count} docs
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Total Categories: {stats?.categories?.length || 0}</span>
            <button
              onClick={() => onNavigate('documents')}
              className="text-xs font-semibold text-electric-400 hover:underline"
            >
              Browse Library →
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Documents & Popular Queries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <div className="p-6 rounded-2xl bg-navy-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-100">Recently Indexed Documents</h2>
            <button
              onClick={() => onNavigate('documents')}
              className="text-xs text-electric-400 hover:underline"
            >
              View All ({stats?.total_documents})
            </button>
          </div>
          <div className="space-y-3">
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => onNavigate('documents')}
                className="p-3 rounded-xl bg-navy-850/60 hover:bg-navy-800 border border-slate-800/80 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FormatBadge type={doc.file_type} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{doc.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {doc.category?.name || 'General'} • {doc.chunk_count} chunks • {(doc.file_size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <StatusBadge status={doc.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Most Searched Topics & Knowledge Gaps */}
        <div className="p-6 rounded-2xl bg-navy-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-100">Frequent Queries & Topics</h2>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-electric-400 hover:underline"
            >
              History Log
            </button>
          </div>
          <div className="space-y-2.5">
            {stats?.top_searched_topics?.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-navy-850/60 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="font-mono text-[11px] text-slate-500 font-bold">#{idx + 1}</span>
                  <span className="font-medium text-slate-200">{item.topic}</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-electric-500/10 text-electric-400 border border-electric-500/20 font-bold">
                  {item.count} searches
                </span>
              </div>
            ))}
          </div>

          {stats?.knowledge_gap_count > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-300 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span><strong>{stats.knowledge_gap_count}</strong> Knowledge Gaps Identified</span>
              </div>
              <button
                onClick={() => onNavigate('knowledge-gaps')}
                className="text-xs font-bold text-amber-400 hover:underline"
              >
                Inspect Gaps →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

