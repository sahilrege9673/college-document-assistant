import React from 'react';
import { SUGGESTED_QUESTIONS } from '../../utils/constants';
import { HelpCircle, Sparkles } from 'lucide-react';

export default function SuggestedQuestions({ onSelectQuestion, questions = [] }) {
  const displayQuestions = questions && questions.length > 0 ? questions : SUGGESTED_QUESTIONS;

  return (
    <div className="p-4 bg-white/80 rounded-2xl border border-slate-200/90 mb-4 shadow-2xs">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          <span>Featured Autonomous Starter Questions</span>
        </div>
        <span className="text-[10px] text-slate-400">Click to ask instantly</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {displayQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectQuestion(q)}
            className="text-left text-xs bg-slate-50 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 transition-all shadow-2xs hover:shadow-xs active:scale-95"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}