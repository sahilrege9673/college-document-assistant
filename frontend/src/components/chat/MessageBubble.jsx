import React, { useState } from 'react';
import { Copy, Check, Bot, User as UserIcon } from 'lucide-react';
import IntentBadge from './IntentBadge';
import SourceCard from './SourceCard';

export default function MessageBubble({ message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-4 animate-fade-in">
        <div className="max-w-2xl bg-brand-600 text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-xs">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-3 mb-6 animate-fade-in max-w-3xl">
      <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 shrink-0 mt-1 shadow-2xs">
        <Bot className="w-4 h-4" />
      </div>

      <div className="flex-1 bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-4 shadow-xs">
        {/* Intent Badge */}
        {message.detected_intent && (
          <IntentBadge intent={message.detected_intent} />
        )}

        {/* Answer Content */}
        <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>

        {/* Source Citations */}
        {message.sources && message.sources.length > 0 && (
          <SourceCard sources={message.sources} />
        )}

        {/* Action toolbar */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Grounded from College Documents</span>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-50 transition-colors"
            title="Copy answer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
