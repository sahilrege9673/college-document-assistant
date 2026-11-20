import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

export default function SourceCard({ sources }) {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center space-x-1.5 text-xs font-medium text-slate-500 hover:text-brand-600 transition-colors"
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span>
          {sources.length} cited {sources.length === 1 ? 'source' : 'sources'}
        </span>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
        )}
      </button>

      {expanded && (
        <div className="mt-2.5 space-y-2 animate-fade-in">
          {sources.map((src, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 text-xs text-slate-700 space-y-1.5"
            >
              <div className="flex items-center justify-between font-semibold text-slate-900">
                <span className="truncate pr-2" title={src.document_name}>
                  📄 {src.document_name}
                </span>
                <span className="shrink-0 px-2 py-0.5 bg-white text-slate-600 rounded-md border border-slate-200 text-[10px]">
                  Page {src.page_number || 1}
                </span>
              </div>
              <p className="text-slate-600 font-mono text-[11px] leading-relaxed bg-white/70 p-2 rounded-lg border border-slate-100 italic">
                "{src.chunk_preview}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
