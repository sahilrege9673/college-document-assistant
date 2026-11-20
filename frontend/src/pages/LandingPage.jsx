import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, MessageSquare, BookOpen, ArrowRight, ShieldCheck, Sparkles, CheckCircle } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Navigation */}
      <header className="max-w-6xl mx-auto w-full px-6 py-5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
            🎓
          </div>
          <span className="font-bold text-slate-900 text-lg tracking-tight">
            College Document Assistant
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/login"
            className="text-sm font-semibold text-slate-700 hover:text-slate-900 px-3.5 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-lg shadow-xs transition-colors"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-12 md:py-16 text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Grounded RAG with LoRA Intent Classification</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Ask questions from your <span className="text-brand-600">syllabus</span>, notes, assignments, and college documents.
        </h1>

        <p className="max-w-2xl mx-auto mt-5 text-base sm:text-lg text-slate-600 leading-relaxed">
          No hallucinations. Answers are generated strictly from your uploaded college materials, citing the source document and page number for every response.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            to="/signup"
            className="w-full sm:w-auto flex items-center justify-center space-x-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 px-6 py-3.5 rounded-xl shadow-md transition-all"
          >
            <span>Get Started for Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/login"
            className="w-full sm:w-auto flex items-center justify-center text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-6 py-3.5 rounded-xl shadow-xs transition-all"
          >
            Login to Account
          </Link>
        </div>

        {/* 3-Step Walkthrough */}
        <section className="mt-20">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">
            How It Works in 3 Simple Steps
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-brand-200 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-600 flex items-center justify-center font-bold text-sm mb-4 border border-blue-100">
                1
              </div>
              <h3 className="text-base font-semibold text-slate-900">Upload College PDFs</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Upload your course syllabus, lecture slides, assignment briefs, exam circulars, and campus regulations (up to 10 MB).
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-brand-200 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm mb-4 border border-purple-100">
                2
              </div>
              <h3 className="text-base font-semibold text-slate-900">Ask in Natural Language</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Our fine-tuned LoRA classifier categorizes your query intent to guide pgvector semantic retrieval across your document chunks.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-brand-200 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm mb-4 border border-emerald-100">
                3
              </div>
              <h3 className="text-base font-semibold text-slate-900">Get Grounded Answers</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Receive clear, concise answers synthesized by Gemini strictly from your documents, complete with page citations and text previews.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center space-x-2">
            <span>© 2026 College Document Assistant</span>
            <span>•</span>
            <span className="text-emerald-600 font-medium flex items-center">
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> 100% Free Tier Architecture
            </span>
          </div>
          <div>
            Built with React, FastAPI, Supabase pgvector, and Google Gemini
          </div>
        </div>
      </footer>
    </div>
  );
}
