import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Import All 16 Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DocumentLibraryPage from './pages/DocumentLibraryPage';
import UploadDocumentPage from './pages/UploadDocumentPage';
import SearchPage from './pages/SearchPage';
import SearchResultsPage from './pages/SearchResultsPage';
import AskDocumentPage from './pages/AskDocumentPage';
import SearchHistoryPage from './pages/SearchHistoryPage';
import RecommendationsPage from './pages/RecommendationsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import KnowledgeGapPage from './pages/KnowledgeGapPage';
import UserManagementPage from './pages/UserManagementPage';
import UserProfilePage from './pages/UserProfilePage';
import SettingsPage from './pages/SettingsPage';
import AboutProjectPage from './pages/AboutProjectPage';

function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [authPage, setAuthPage] = useState('login'); // 'login' or 'register'
  const [navParams, setNavParams] = useState({});

  const handleNavigate = (pageId, params = {}) => {
    setCurrentPage(pageId);
    setNavParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickSearch = (queryText) => {
    handleNavigate('search', { initialQuery: queryText });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-electric-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Initializing NEXUS AI Workspace...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated Flow
  if (!user) {
    if (authPage === 'register') {
      return <RegisterPage onNavigate={(p) => setAuthPage(p)} />;
    }
    return <LoginPage onNavigate={(p) => (p === 'register' ? setAuthPage('register') : setCurrentPage('dashboard'))} />;
  }

  // Authenticated Enterprise Dashboard Shell
  return (
    <div className="flex h-screen bg-navy-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          onQuickSearch={handleQuickSearch}
        />

        <main className="flex-1 overflow-y-auto">
          {currentPage === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
          {currentPage === 'documents' && <DocumentLibraryPage onNavigate={handleNavigate} />}
          {currentPage === 'upload' && <UploadDocumentPage onNavigate={handleNavigate} />}
          {currentPage === 'search' && (
            <SearchPage
              onNavigate={handleNavigate}
              initialQuery={navParams.initialQuery}
            />
          )}
          {currentPage === 'results' && (
            <SearchResultsPage
              onNavigate={handleNavigate}
              searchState={navParams.searchState}
            />
          )}
          {currentPage === 'ask' && (
            <AskDocumentPage
              initialDocId={navParams.initialDocId}
            />
          )}
          {currentPage === 'recommendations' && <RecommendationsPage onNavigate={handleNavigate} />}
          {currentPage === 'history' && <SearchHistoryPage onNavigate={handleNavigate} />}
          {currentPage === 'analytics' && <AnalyticsPage />}
          {currentPage === 'knowledge-gaps' && <KnowledgeGapPage onNavigate={handleNavigate} />}
          {currentPage === 'users' && <UserManagementPage />}
          {currentPage === 'profile' && <UserProfilePage />}
          {currentPage === 'settings' && <SettingsPage />}
          {currentPage === 'about' && <AboutProjectPage />}
        </main>
      </div>
    </div>
  );
}

export default App;

