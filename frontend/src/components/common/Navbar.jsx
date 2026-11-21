import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon, Shield, Menu } from 'lucide-react';
import { getInitials } from '../../utils/formatters';

export default function Navbar({ onMenuToggle }) {
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center space-x-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 md:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-indigo-700 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            🎓
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="font-extrabold text-slate-900 tracking-tight text-base sm:text-lg">
              OmniScholar
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
              AI 2.0
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {user && (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 pl-2">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-medium text-xs flex items-center justify-center border border-brand-200">
                {getInitials(user.full_name)}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-tight">
                  {user.full_name}
                </p>
                <div className="flex items-center space-x-1 mt-0.5">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.2 text-[10px] font-medium rounded-full ${
                      isAdmin
                        ? 'bg-purple-100 text-purple-700 border border-purple-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {isAdmin ? (
                      <>
                        <Shield className="w-2.5 h-2.5 mr-0.5" /> Admin
                      </>
                    ) : (
                      'Student'
                    )}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
