import React from 'react';
import { SUGGESTED_QUESTIONS } from '../../utils/constants';
import { HelpCircle } from 'lucide-react';

export default function SuggestedQuestions({ onSelectQuestion }) {
  return (
    <div className="p-4 bg-white/70 rounded-2xl border border-slate-200/80 mb-4">
      <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 mb-2.5">
        <HelpCircle className="w-3.5 h-3.5 text-brand-600" />
        <span>Suggested Academic Questions</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => onSelectQuestion(q)}
            className="text-left text-xs bg-slate-50 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
