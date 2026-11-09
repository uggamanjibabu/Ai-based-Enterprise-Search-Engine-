import React from 'react';
import {
  LayoutDashboard, Search, Sparkles, FolderArchive, UploadCloud,
  Compass, History, BarChart3, AlertCircle, Users, Settings, User,
  Info, ShieldCheck, ChevronRight, LogOut, FileSearch
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from './Badge';

const Sidebar = ({ currentPage, onNavigate }) => {
  const { user, logout } = useAuth();

  const navGroups = [
    {
      title: 'CORE INTELLIGENCE',
      items: [
        { id: 'dashboard', label: 'Main Dashboard', icon: LayoutDashboard },
        { id: 'search', label: 'AI Hybrid Search', icon: Search },
        { id: 'ask', label: 'Ask This Document', icon: Sparkles, badge: 'RAG' },
        { id: 'documents', label: 'Document Library', icon: FolderArchive },
        { id: 'upload', label: 'Upload Documents', icon: UploadCloud },
        { id: 'recommendations', label: 'Smart Recommendations', icon: Compass },
        { id: 'history', label: 'Search History', icon: History },
      ]
    },
    {
      title: 'ANALYTICS & AUDIT',
      items: [
        { id: 'analytics', label: 'Search Analytics', icon: BarChart3 },
        { id: 'knowledge-gaps', label: 'Knowledge Gap Analysis', icon: AlertCircle },
      ]
    },
    {
      title: 'SYSTEM & SETTINGS',
      items: [
        ...(user?.role === 'admin' || user?.role === 'manager'
          ? [{ id: 'users', label: 'User Management', icon: Users }]
          : []),
        { id: 'settings', label: 'System Settings', icon: Settings },
        { id: 'profile', label: 'User Profile', icon: User },
        { id: 'about', label: 'About NEXUS AI', icon: Info },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-navy-900 border-r border-slate-800/80 flex flex-col h-screen select-none shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-electric-600 via-accent-violet to-accent-purple flex items-center justify-center shadow-lg shadow-electric-500/20">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold tracking-tight text-lg text-white">NEXUS</span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-electric-500/20 text-electric-400 border border-electric-500/30">AI</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">Enterprise Intelligence</p>
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400/80 uppercase">
              {group.title}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-electric-600/15 text-electric-400 border border-electric-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-electric-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent-violet/20 text-accent-violet border border-accent-violet/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-navy-950/60">
        <div className="flex items-center justify-between p-2 rounded-xl bg-navy-800/40 border border-slate-800/60">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-electric-400 shrink-0">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.full_name || 'User'}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <RoleBadge role={user?.role} />
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

