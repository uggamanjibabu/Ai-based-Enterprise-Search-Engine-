import React from 'react';

export const StatusBadge = ({ status }) => {
  const styles = {
    indexed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    processing: 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse',
    uploaded: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    failed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  const labels = {
    indexed: 'Indexed',
    processing: 'Processing...',
    uploaded: 'Uploaded',
    failed: 'Failed',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles.uploaded}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        status === 'indexed' ? 'bg-emerald-400' :
        status === 'processing' ? 'bg-amber-400' :
        status === 'failed' ? 'bg-rose-400' : 'bg-blue-400'
      }`} />
      {labels[status] || status}
    </span>
  );
};

export const FormatBadge = ({ type }) => {
  const ext = (type || '').toLowerCase();
  const styles = {
    pdf: 'bg-red-500/10 text-red-400 border-red-500/30',
    docx: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    txt: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    csv: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${styles[ext] || 'bg-slate-700/20 text-slate-400 border-slate-700'}`}>
      {ext}
    </span>
  );
};

export const AccessBadge = ({ level }) => {
  const styles = {
    public: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    internal: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    restricted: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    confidential: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${styles[level] || styles.internal}`}>
      {level || 'internal'}
    </span>
  );
};

export const RoleBadge = ({ role }) => {
  const styles = {
    admin: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    manager: 'bg-electric-500/15 text-electric-300 border-electric-500/30',
    employee: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${styles[role] || styles.employee}`}>
      {role || 'employee'}
    </span>
  );
};

