import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  // Password strength calculator
  const getPasswordStrength = () => {
    if (!password) return { label: '', color: 'bg-slate-200', score: 0 };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) return { label: 'Weak', color: 'bg-rose-500', width: '33%' };
    if (score <= 4) return { label: 'Moderate', color: 'bg-amber-500', width: '66%' };
    return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await signup(fullName, email, password);
      navigate('/dashboard');
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        (err.message === 'Network Error'
          ? 'Cannot connect to the backend server. Please verify the backend is running on Render.'
          : err.message || 'Registration failed. Please try again.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isAlreadyRegistered = error.toLowerCase().includes('already exists');

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
          Create student account
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Upload syllabi, lecture notes, and ask cited academic questions.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/90 rounded-2xl">
          {error && (
            <div className={`mb-5 p-3 rounded-xl border flex items-start space-x-2 text-xs ${
              isAlreadyRegistered 
                ? 'bg-amber-50 border-amber-200 text-amber-800' 
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span>{error}</span>
                {isAlreadyRegistered && (
                  <div>
                    <Link to="/login" className="font-bold underline text-brand-700 hover:text-brand-800">
                      Click here to Sign In directly →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Johnson"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                College Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex.johnson@college.edu"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
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

              {password && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all duration-300 rounded-full`}
                      style={{ width: strength.width }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Strength: <span className="font-semibold text-slate-700">{strength.label}</span>
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type password"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-xs transition-colors disabled:opacity-60"
            >
              {loading ? (
                <span>Creating Account...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}