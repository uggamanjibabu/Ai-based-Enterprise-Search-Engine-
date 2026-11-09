import React, { useState } from 'react';
import { Sparkles, Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { authService } from '../services/api';

const LoginPage = ({ onNavigate }) => {
  const { login } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back to NEXUS AI');
      onNavigate('dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await authService.forgotPassword(forgotEmail, newPassword);
      toast.success('Password updated successfully. You can now log in.');
      setShowForgotModal(false);
      setEmail(forgotEmail);
      setPassword(newPassword);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Password reset failed');
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background radial gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-electric-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-violet/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-electric-500 via-accent-violet to-accent-purple flex items-center justify-center mx-auto mb-3 shadow-xl shadow-electric-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">NEXUS AI</h1>
          <p className="text-xs text-slate-400 mt-1">Turn Scattered Information into Instant Knowledge.</p>
        </div>

        {/* Card */}
        <div className="bg-navy-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-lg font-bold text-slate-100 mb-1">Enterprise Sign In</h2>
          <p className="text-xs text-slate-400 mb-6">Access your organization's verified intelligence platform</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@enterprise.com"
                  className="w-full bg-navy-950 text-slate-200 placeholder-slate-600 pl-10 pr-4 py-2.5 rounded-xl border border-slate-700/80 text-xs focus:outline-none focus:border-electric-500 focus:ring-1 focus:ring-electric-500"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-electric-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-navy-950 text-slate-200 placeholder-slate-600 pl-10 pr-10 py-2.5 rounded-xl border border-slate-700/80 text-xs focus:outline-none focus:border-electric-500 focus:ring-1 focus:ring-electric-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-electric-600 to-accent-violet hover:from-electric-500 hover:to-accent-purple text-white text-xs font-bold shadow-lg shadow-electric-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Workspace'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 text-center mb-2.5">
              Instant Demo Profiles (Click to fill):
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@nexus.ai', 'Admin@12345')}
                className="py-1.5 px-2 rounded-lg bg-navy-800/80 hover:bg-navy-700 border border-purple-500/30 text-purple-300 text-[11px] font-medium truncate"
              >
                👑 Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('manager@nexus.ai', 'Manager@12345')}
                className="py-1.5 px-2 rounded-lg bg-navy-800/80 hover:bg-navy-700 border border-electric-500/30 text-electric-300 text-[11px] font-medium truncate"
              >
                💼 Manager
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('employee@nexus.ai', 'Employee@12345')}
                className="py-1.5 px-2 rounded-lg bg-navy-800/80 hover:bg-navy-700 border border-slate-600/40 text-slate-300 text-[11px] font-medium truncate"
              >
                👤 Employee
              </button>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Don't have an account?{' '}
          <button
            onClick={() => onNavigate('register')}
            className="text-electric-400 font-semibold hover:underline"
          >
            Create an Account
          </button>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-navy-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-100 mb-2">Reset Password</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter your enterprise account email and your new password.
            </p>
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Account Email</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="admin@nexus.ai"
                  required
                  className="w-full bg-navy-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">New Secure Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-navy-950 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:bg-navy-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-electric-600 hover:bg-electric-500 text-white text-xs font-bold shadow-md"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;

