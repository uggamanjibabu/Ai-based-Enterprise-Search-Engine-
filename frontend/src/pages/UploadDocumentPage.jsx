import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud, FileText, CheckCircle2, AlertCircle, X,
  ArrowRight, ShieldCheck, Tag, Folder
} from 'lucide-react';
import { documentService } from '../services/api';
import { useToast } from '../components/Toast';
import { FormatBadge } from '../components/Badge';

const UploadDocumentPage = ({ onNavigate }) => {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [accessLevel, setAccessLevel] = useState('internal');
  const [tagsInput, setTagsInput] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await documentService.categories();
        setCategories(res.data);
        if (res.data.length > 0) setSelectedCategory(res.data[0].id);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCats();
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles) => {
    const validExtensions = ['pdf', 'docx', 'txt', 'csv'];
    const filtered = newFiles.filter((f) => {
      const ext = f.name.split('.').pop().toLowerCase();
      if (!validExtensions.includes(ext)) {
        toast.error(`"${f.name}" has an unsupported format. Allowed: PDF, DOCX, TXT, CSV`);
        return false;
      }
      if (f.size > 50 * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds the 50MB file size limit.`);
        return false;
      }
      return true;
    });

    setFiles((prev) => [...prev, ...filtered]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadAll = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one document to upload');
      return;
    }

    setUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress((prev) => ({ ...prev, [file.name]: 'Processing & Indexing into FAISS...' }));

      const formData = new FormData();
      formData.append('file', file);
      if (customTitle && files.length === 1) {
        formData.append('title', customTitle);
      }
      if (selectedCategory) {
        formData.append('category_id', selectedCategory);
      }
      formData.append('access_level', accessLevel);
      if (tagsInput.trim()) {
        formData.append('tags', tagsInput);
      }

      try {
        await documentService.upload(formData);
        setUploadProgress((prev) => ({ ...prev, [file.name]: 'Indexed Successfully' }));
        successCount++;
      } catch (err) {
        const errorDetail = err.response?.data?.detail || 'Indexing failed';
        setUploadProgress((prev) => ({ ...prev, [file.name]: `Failed: ${errorDetail}` }));
        toast.error(`Error uploading ${file.name}: ${errorDetail}`);
      }
    }

    setUploading(false);
    if (successCount > 0) {
      toast.success(`${successCount} document(s) successfully processed and indexed!`);
      setTimeout(() => onNavigate('documents'), 1500);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-extrabold text-white">Upload & Ingest Enterprise Documents</h1>
        <p className="text-xs text-slate-400 mt-1">
          Files are automatically parsed, cleaned, divided into context-aware chunks, and embedded in FAISS vector store.
        </p>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-10 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
          isDragging
            ? 'border-electric-400 bg-electric-500/10'
            : 'border-slate-700/80 bg-navy-900/60 hover:border-electric-500/50 hover:bg-navy-900'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept=".pdf,.docx,.txt,.csv"
          className="hidden"
        />
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-electric-600/20 to-accent-violet/20 border border-electric-500/30 flex items-center justify-center text-electric-400 mb-4 shadow-inner">
          <UploadCloud className="w-7 h-7" />
        </div>
        <p className="text-sm font-bold text-slate-200">
          Click to browse or drag and drop enterprise documents
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Supports <strong>PDF, DOCX, TXT, CSV</strong> (up to 50 MB per file)
        </p>
      </div>

      {/* Metadata Configuration */}
      <div className="p-6 rounded-3xl bg-navy-900/80 border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
          Ingestion Metadata & Permissions
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-electric-400" />
              Document Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-navy-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 text-xs focus:outline-none focus:border-electric-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-accent-violet" />
              Access Level (RBAC)
            </label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value)}
              className="w-full bg-navy-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 text-xs focus:outline-none focus:border-electric-500"
            >
              <option value="public">Public (Visible to all employees)</option>
              <option value="internal">Internal (Default enterprise access)</option>
              <option value="restricted">Restricted (Managers and Admins only)</option>
              <option value="confidential">Confidential (Executive Admins only)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Custom Title (Optional)
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Q3 SOC-2 Security Audit Report"
              disabled={files.length > 1}
              className="w-full bg-navy-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 text-xs focus:outline-none focus:border-electric-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-400" />
              Tags (Comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="policy, security, 2026, engineering"
              className="w-full bg-navy-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 text-xs focus:outline-none focus:border-electric-500"
            />
          </div>
        </div>
      </div>

      {/* Selected Files List */}
      {files.length > 0 && (
        <div className="p-6 rounded-3xl bg-navy-900/80 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Selected Files ({files.length})
            </h2>
            <button
              onClick={() => setFiles([])}
              className="text-[11px] text-slate-400 hover:text-rose-400"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-2">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-navy-950 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <FormatBadge type={file.name.split('.').pop()} />
                  <div>
                    <p className="font-semibold text-slate-200">{file.name}</p>
                    <p className="text-[10px] text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {uploadProgress[file.name] && (
                    <span className={`text-[11px] font-medium ${
                      uploadProgress[file.name].includes('Successfully')
                        ? 'text-emerald-400'
                        : uploadProgress[file.name].includes('Failed')
                        ? 'text-rose-400'
                        : 'text-amber-400 animate-pulse'
                    }`}>
                      {uploadProgress[file.name]}
                    </span>
                  )}
                  {!uploading && (
                    <button
                      onClick={() => removeFile(idx)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 flex justify-end">
            <button
              onClick={handleUploadAll}
              disabled={uploading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-electric-600 to-accent-violet hover:from-electric-500 hover:to-accent-purple text-white text-xs font-bold shadow-lg shadow-electric-600/25 flex items-center gap-2 disabled:opacity-50"
            >
              {uploading ? 'Processing & Indexing into Vector Store...' : `Ingest & Index ${files.length} Document(s)`}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadDocumentPage;

