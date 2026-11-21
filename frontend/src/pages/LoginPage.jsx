import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, AlertCircle, ArrowLeft, KeyRound, Eye, EyeOff, Zap, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [instantLoadingRole, setInstantLoadingRole] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        (err.message === 'Network Error'
          ? 'Cannot connect to the backend server. Please verify the backend is running on Render.'
          : err.message || 'Invalid email or password.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const instantLogin = async (targetEmail, targetPassword, roleLabel) => {
    setError('');
    setEmail(targetEmail);
    setPassword(targetPassword);
    setInstantLoadingRole(roleLabel);
    try {
      await login(targetEmail, targetPassword);
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        (err.message === 'Network Error'
          ? 'Cannot connect to the backend server. Please verify the backend is running on Render.'
          : err.message || 'Login failed. Please try again.');
      setError(msg);
    } finally {
      setInstantLoadingRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Link
          to="/"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Home
        </Link>

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-indigo-700 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            🎓
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="font-extrabold text-slate-900 text-lg tracking-tight">OmniScholar</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">AI 2.0</span>
          </div>
        </div>

        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Sign in to your account
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Access your documents, notes, and academic Q&A history.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/90 rounded-2xl">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* 1-Click Fast Pass Section */}
          <div className="mb-6 pb-5 border-b border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Instant 1-Click Access
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => instantLogin('student@college.edu', 'student123', 'student')}
                disabled={loading || !!instantLoadingRole}
                className="py-2.5 px-3 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-xl transition-all shadow-2xs flex flex-col items-center justify-center space-y-0.5 disabled:opacity-60"
              >
                <div className="flex items-center space-x-1">
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Student Pass</span>
                </div>
                <span className="text-[10px] font-normal text-emerald-600">
                  {instantLoadingRole === 'student' ? 'Connecting...' : 'Alex Johnson'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => instantLogin('admin@college.edu', 'admin123', 'admin')}
                disabled={loading || !!instantLoadingRole}
                className="py-2.5 px-3 text-xs font-semibold text-brand-800 bg-brand-50 hover:bg-brand-100 border border-brand-200/80 rounded-xl transition-all shadow-2xs flex flex-col items-center justify-center space-y-0.5 disabled:opacity-60"
              >
                <div className="flex items-center space-x-1">
                  <Zap className="w-3.5 h-3.5 text-brand-600" />
                  <span>Admin Pass</span>
                </div>
                <span className="text-[10px] font-normal text-brand-600">
                  {instantLoadingRole === 'admin' ? 'Connecting...' : 'Administrator'}
                </span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                College Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@college.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <span className="text-[11px] text-slate-400">
                  Dev pass: <code className="text-emerald-700 font-mono">student123</code> / <code className="text-brand-700 font-mono">admin123</code>
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!instantLoadingRole}
              className="w-full mt-2 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-xs transition-colors disabled:opacity-60"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Credentials Cheatsheet */}
          <div className="mt-5 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1 text-slate-600">
            <p className="font-semibold text-slate-700">Valid Credentials Cheatsheet:</p>
            <div className="flex justify-between items-center text-[11px]">
              <span>Student: <code className="text-emerald-700 font-mono">student@college.edu</code></span>
              <span>Pass: <code className="text-emerald-700 font-mono">student123</code></span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span>Sahil: <code className="text-emerald-700 font-mono">sahil.rege@college.edu</code></span>
              <span>Pass: <code className="text-emerald-700 font-mono">student123</code></span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span>Admin: <code className="text-brand-700 font-mono">admin@college.edu</code></span>
              <span>Pass: <code className="text-brand-700 font-mono">admin123</code></span>
            </div>
          </div>

          <div className="mt-4 text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-brand-600 hover:text-brand-700">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}