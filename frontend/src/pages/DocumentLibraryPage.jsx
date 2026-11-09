import React, { useState, useEffect } from 'react';
import {
  FolderArchive, Search, Filter, Download, Trash2, Eye,
  Sparkles, FileText, Plus, X, Layers, Shield, Calendar, User
} from 'lucide-react';
import { documentService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { StatusBadge, FormatBadge, AccessBadge } from '../components/Badge';

const DocumentLibraryPage = ({ onNavigate }) => {
  const { user } = useAuth();
  const toast = useToast();
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [selectedAccess, setSelectedAccess] = useState('');

  // Selected document preview modal
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [previewContent, setPreviewContent] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const [docRes, catRes] = await Promise.all([
        documentService.list({
          search_query: searchQuery || undefined,
          category_id: selectedCategory || undefined,
          file_type: selectedFormat || undefined,
          access_level: selectedAccess || undefined,
        }),
        documentService.categories(),
      ]);
      setDocuments(docRes.data);
      setCategories(catRes.data);
    } catch (err) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [selectedCategory, selectedFormat, selectedAccess]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDocs();
  };

  const handleDelete = async (docId, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will purge its vector embeddings from FAISS.`)) {
      return;
    }
    try {
      await documentService.delete(docId);
      toast.success(`"${title}" deleted successfully`);
      setDocuments(documents.filter((d) => d.id !== docId));
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed');
    }
  };

  const handleOpenPreview = async (doc) => {
    setSelectedDoc(doc);
    setPreviewLoading(true);
    try {
      const res = await documentService.preview(doc.id);
      setPreviewContent(res.data.preview_text);
    } catch (err) {
      setPreviewContent('Unable to load document preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white">Enterprise Document Library</h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse, inspect, preview, and manage indexed organizational knowledge assets.
          </p>
        </div>
        <button
          onClick={() => onNavigate('upload')}
          className="px-4 py-2 rounded-xl bg-electric-600 hover:bg-electric-500 text-white text-xs font-bold shadow-lg shadow-electric-600/30 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Upload New Document
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-navy-900/80 border border-slate-800 shadow-xl space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search document titles in library..."
              className="w-full bg-navy-950 text-slate-200 placeholder-slate-500 pl-10 pr-4 py-2 rounded-xl border border-slate-700/80 text-xs focus:outline-none focus:border-electric-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-semibold border border-slate-700"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-navy-950 text-slate-300 text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-electric-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Format Filter */}
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="bg-navy-950 text-slate-300 text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-electric-500"
          >
            <option value="">All Formats (PDF, DOCX, TXT, CSV)</option>
            <option value="pdf">PDF Documents</option>
            <option value="docx">Word (.docx)</option>
            <option value="txt">Text Files (.txt)</option>
            <option value="csv">CSV Spreadsheets</option>
          </select>

          {/* Access Filter */}
          <select
            value={selectedAccess}
            onChange={(e) => setSelectedAccess(e.target.value)}
            className="bg-navy-950 text-slate-300 text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-electric-500"
          >
            <option value="">All Access Levels</option>
            <option value="public">Public</option>
            <option value="internal">Internal</option>
            <option value="restricted">Restricted</option>
            <option value="confidential">Confidential</option>
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="p-12 rounded-2xl bg-navy-900/60 border border-slate-800 text-center">
          <FolderArchive className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-300">No documents found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or upload a new enterprise document.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-5 rounded-2xl bg-navy-900/90 border border-slate-800 hover:border-slate-700/80 transition-all shadow-lg flex flex-col justify-between group"
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <FormatBadge type={doc.file_type} />
                    <AccessBadge level={doc.access_level} />
                  </div>
                  <StatusBadge status={doc.status} />
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-slate-100 group-hover:text-electric-400 transition-colors line-clamp-1">
                  {doc.title}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 font-mono line-clamp-1">
                  {doc.original_filename}
                </p>

                {/* Summary */}
                <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                  {doc.summary || 'Document text extracted and indexed.'}
                </p>

                {/* Metadata row */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span>{doc.chunk_count} chunks</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{doc.uploader_name || 'System'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenPreview(doc)}
                    title="Preview Document Content"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-navy-800 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <a
                    href={`/api/documents/${doc.id}/download`}
                    download
                    title="Download Original File"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-navy-800 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => onNavigate('ask', { initialDocId: doc.id })}
                    title="Ask AI Questions About This Document"
                    className="p-1.5 rounded-lg text-accent-violet hover:bg-accent-violet/10 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>

                {(user?.role === 'admin' || (user?.role === 'manager' && doc.uploader_id === user?.id)) && (
                  <button
                    onClick={() => handleDelete(doc.id, doc.title)}
                    title="Delete Document"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Preview Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <FormatBadge type={selectedDoc.file_type} />
                  <span>{selectedDoc.title}</span>
                </h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{selectedDoc.original_filename}</p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-navy-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 flex-1 overflow-y-auto bg-navy-950 rounded-xl p-4 border border-slate-800/80 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {previewLoading ? (
                <div className="text-center py-8 text-slate-500">Loading extracted content...</div>
              ) : (
                previewContent
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                Indexed in FAISS • {selectedDoc.chunk_count} Chunks
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const id = selectedDoc.id;
                    setSelectedDoc(null);
                    onNavigate('ask', { initialDocId: id });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-accent-violet hover:bg-accent-purple text-white text-xs font-bold shadow-md flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Ask AI About This
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentLibraryPage;

