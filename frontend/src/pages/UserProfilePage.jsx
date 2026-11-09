import React, { useState } from 'react';
import {
  User, Mail, Shield, Key, CheckCircle2, Lock, Building,
  Calendar, Layers, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { authService } from '../services/api';
import { RoleBadge } from '../components/Badge';

const UserProfilePage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(user.email, newPassword);
      toast.success('Your password has been successfully updated');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const permissionsList = [
    { label: 'Search & RAG QA Access', granted: true, desc: 'Query knowledge base and view citations' },
    { label: 'Upload New Documents', granted: user?.permissions?.can_upload ?? true, desc: 'Ingest PDF, DOCX, TXT, CSV into FAISS' },
    { label: 'Delete Documents', granted: user?.permissions?.can_delete ?? false, desc: 'Purge document blobs and vector embeddings' },
    { label: 'View Enterprise Analytics', granted: user?.permissions?.can_view_all_analytics ?? false, desc: 'Access search telemetry and audit charts' },
    { label: 'User & RBAC Administration', granted: user?.permissions?.can_manage_users ?? false, desc: 'Configure accounts, roles, and access scopes' },
    { label: 'System Engine Settings', granted: user?.permissions?.can_manage_settings ?? false, desc: 'Adjust FAISS & BM25 weighting parameters' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-extrabold text-white">User Profile & Credentials</h1>
        <p className="text-xs text-slate-400 mt-1">
          Review your enterprise identity, role-based capabilities, and security settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card */}
        <div className="p-6 rounded-3xl bg-navy-900 border border-slate-800 shadow-xl space-y-4 md:col-span-1 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-electric-600 to-accent-violet flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-electric-600/20">
            {user?.full_name?.charAt(0) || 'U'}
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-100">{user?.full_name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
            <div className="mt-2">
              <RoleBadge role={user?.role} />
            </div>
          </div>

          <div className="w-full pt-4 border-t border-slate-800 space-y-2 text-xs text-slate-400 text-left">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5" /> Department</span>
              <strong className="text-slate-200">{user?.department || 'General'}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Joined</span>
              <span className="font-mono">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Status</span>
              <span className="text-emerald-400 font-semibold">Active</span>
            </div>
          </div>
        </div>

        {/* Permissions & Password Column */}
        <div className="space-y-6 md:col-span-2">
          {/* Permissions Matrix */}
          <div className="p-6 rounded-3xl bg-navy-900 border border-slate-800 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-electric-400" />
              Role-Based Permissions Matrix
            </h3>

            <div className="space-y-2">
              {permissionsList.map((perm, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-navy-950/80 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-200">{perm.label}</p>
                    <p className="text-[11px] text-slate-500">{perm.desc}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    perm.granted
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-500'
                  }`}>
                    {perm.granted ? 'Granted' : 'Restricted'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Change Password */}
          <div className="p-6 rounded-3xl bg-navy-900 border border-slate-800 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-accent-violet" />
              Update Account Password
            </h3>

            <form onSubmit={handlePasswordChange} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-navy-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 text-xs focus:outline-none focus:border-electric-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-navy-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 text-xs focus:outline-none focus:border-electric-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-electric-600 hover:bg-electric-500 text-white text-xs font-bold shadow-md disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;

