import React, { useState, useEffect, useRef } from 'react';
import {
  Bell, Sun, Moon, Search, CheckCheck, FileText, AlertCircle,
  ExternalLink, User as UserIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { notificationService } from '../services/api';

const Navbar = ({ currentPage, onNavigate, onQuickSearch }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [quickQuery, setQuickQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await notificationService.list();
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (quickQuery.trim()) {
      if (onQuickSearch) {
        onQuickSearch(quickQuery.trim());
      } else {
        onNavigate('search', { initialQuery: quickQuery.trim() });
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const pageTitles = {
    dashboard: 'Main Intelligence Dashboard',
    search: 'AI Hybrid Search Engine',
    results: 'Search Results & Passage Scoring',
    ask: 'Ask This Document (RAG System)',
    documents: 'Document Management Library',
    upload: 'Upload & Ingest Enterprise Documents',
    recommendations: 'Smart Document Recommendations',
    history: 'Search History & Query Logs',
    analytics: 'Enterprise Search Analytics',
    'knowledge-gaps': 'Knowledge Gap & Content Deficit Analysis',
    users: 'User & Access Control Management',
    settings: 'System & Engine Configuration',
    profile: 'User Profile & Security',
    about: 'About Project — NEXUS AI',
  };

  return (
    <header className="h-16 bg-navy-900/90 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Page Title & Breadcrumb */}
      <div>
        <h1 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <span>{pageTitles[currentPage] || 'NEXUS AI'}</span>
          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-mono">
            {currentPage}
          </span>
        </h1>
      </div>

      {/* Center Search Input */}
      <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center w-96 relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
        <input
          type="text"
          value={quickQuery}
          onChange={(e) => setQuickQuery(e.target.value)}
          placeholder="Instant search across enterprise documents..."
          className="w-full bg-navy-950/70 text-slate-200 placeholder-slate-500 pl-9 pr-12 py-1.5 rounded-xl border border-slate-700/60 text-xs focus:outline-none focus:border-electric-500 focus:ring-1 focus:ring-electric-500 transition-all shadow-inner"
        />
        <span className="absolute right-2 text-[10px] bg-slate-800 text-slate-400 font-mono px-1.5 py-0.5 rounded border border-slate-700">
          ↵
        </span>
      </form>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Dark/Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-navy-800/60 border border-slate-800 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-navy-800/60 border border-slate-800 transition-colors relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-electric-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-navy-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up">
              <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-navy-950/40">
                <span className="text-xs font-bold text-slate-200">System Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-electric-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/50">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">No new notifications</div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 text-xs transition-colors hover:bg-navy-800/40 ${
                        !notif.is_read ? 'bg-electric-500/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                          notif.type === 'success' ? 'bg-emerald-400' :
                          notif.type === 'error' ? 'bg-rose-400' : 'bg-electric-400'
                        }`} />
                        <div>
                          <p className="font-semibold text-slate-200">{notif.title}</p>
                          <p className="text-slate-400 text-[11px] mt-0.5">{notif.message}</p>
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Pill */}
        <button
          onClick={() => onNavigate('profile')}
          className="flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-navy-800/50 hover:bg-navy-800 border border-slate-800 transition-colors"
        >
          <div className="w-6 h-6 rounded-lg bg-electric-600/20 text-electric-400 flex items-center justify-center font-bold text-xs">
            {user?.full_name ? user.full_name.charAt(0) : 'U'}
          </div>
          <span className="text-xs font-medium text-slate-200 hidden sm:inline">{user?.full_name?.split(' ')[0] || 'User'}</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;

