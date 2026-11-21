import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  MessageSquare,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle,
  Database,
  Cpu,
  Layers,
  Zap,
  Lock,
} from 'lucide-react';
import { MAX_FILE_SIZE_MB } from '../utils/constants';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      {/* Navigation */}
      <header className="max-w-6xl mx-auto w-full px-6 py-5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-indigo-700 flex items-center justify-center text-white font-bold text-base shadow-sm">
            🎓
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="font-extrabold text-slate-900 text-lg tracking-tight">
              OmniScholar
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
              AI 2.0 Pro
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/login"
            className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-xl shadow-xs transition-colors"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-12 md:py-16 text-center space-y-12">
        <div className="space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Autonomous Academic Intelligence & Cognitive RAG</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Academic Research Copilot for{' '}
            <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Large Syllabi & Notes
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 leading-relaxed">
            Upload multi-hundred-page college syllabi, lecture presentations, and scanned exam notes up to{' '}
            <strong>{MAX_FILE_SIZE_MB} MB per file</strong>. Zero hallucinations: answers are synthesized
            strictly from your source material with verifiable page citations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              to="/signup"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 px-7 py-3.5 rounded-xl shadow-md shadow-brand-500/20 transition-all hover:scale-[1.02]"
            >
              <span>Get Started for Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/login"
              className="w-full sm:w-auto flex items-center justify-center text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-6 py-3.5 rounded-xl shadow-xs transition-all"
            >
              Sign In to Account
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <section className="pt-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">
            Engineered for Production Rigor
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-brand-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-600 flex items-center justify-center font-bold text-sm border border-blue-100">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Multi-File Batch Upload (100 MB/file)</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Staging queue supports uploading 10+ multi-page PDFs simultaneously. Bounded background workers prevent browser lag and container OOM.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-purple-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm border border-purple-100">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Gemini Vision Multimodal OCR</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Scanned lecture notes, architecture diagrams, and complex mathematical formulas are transcribed and indexed via Gemini Multimodal Vision.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition-all space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm border border-emerald-100">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Autonomous Question Intelligence</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Automatically analyzes course outcomes and units on upload to generate high-value starter questions that students can ask with one click.
              </p>
            </div>
          </div>
        </section>

        {/* Technical Architecture Overview */}
        <section className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-xs text-left space-y-6">
          <div className="flex items-center space-x-2 text-xs font-bold text-brand-700 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-brand-600" />
            <span>Under The Hood • Enterprise Stack</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-400 font-medium">Vector Store</p>
              <p className="text-sm font-bold text-slate-900 mt-1">Supabase pgvector</p>
              <p className="text-[11px] text-slate-500 mt-0.5">384-dim Cosine Index</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-400 font-medium">Generation Model</p>
              <p className="text-sm font-bold text-slate-900 mt-1">Gemini 1.5 Flash</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Multimodal Context</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-400 font-medium">Fine-Tuning</p>
              <p className="text-sm font-bold text-slate-900 mt-1">LoRA DistilBERT</p>
              <p className="text-[11px] text-slate-500 mt-0.5">8 Academic Intents</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xs text-slate-400 font-medium">File Capacity</p>
              <p className="text-sm font-bold text-slate-900 mt-1">100 MB / File</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Async Batch Queue</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 px-6 text-center text-xs text-slate-500">
        <p>OmniScholar AI • Production Academic Intelligence Engine</p>
      </footer>
    </div>
  );
}