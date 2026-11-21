import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Copy, Check, Sparkles, FileText } from 'lucide-react';

export default function SourceCard({ sources }) {
  const [expanded, setExpanded] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);

  if (!sources || sources.length === 0) return null;

  const handleCopy = (idx, text) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-brand-600 transition-colors bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80"
      >
        <BookOpen className="w-3.5 h-3.5 text-brand-600" />
        <span>
          {sources.length} Verified Document Citation{sources.length === 1 ? '' : 's'}
        </span>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 ml-0.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 ml-0.5 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-2.5 space-y-2 animate-in fade-in duration-150">
          {sources.map((src, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2"
            >
              <div className="flex items-center justify-between font-semibold text-slate-900 gap-2">
                <span className="truncate flex items-center space-x-1.5" title={src.document_name}>
                  <FileText className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                  <span className="truncate">{src.document_name}</span>
                </span>
                <div className="flex items-center space-x-1.5 shrink-0">
                  {src.similarity && (
                    <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-mono text-[10px] rounded-md border border-purple-200">
                      {(src.similarity * 100).toFixed(1)}% match
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-md border border-blue-200 text-[10px]">
                    Page {src.page_number || 1}
                  </span>
                </div>
              </div>

              <p className="text-slate-700 font-sans text-xs leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/80 whitespace-pre-wrap">
                "{src.chunk_preview}"
              </p>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleCopy(idx, src.chunk_preview)}
                  className="inline-flex items-center space-x-1 text-[11px] text-slate-400 hover:text-slate-700"
                >
                  {copiedIdx === idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy excerpt</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}