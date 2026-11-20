import React from 'react';
import { INTENT_META } from '../../utils/constants';
import { Compass } from 'lucide-react';

export default function IntentBadge({ intent }) {
  if (!intent) return null;

  const meta = INTENT_META[intent] || {
    label: intent.replace('_', ' '),
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
  };

  return (
    <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium tracking-tight mb-2 select-none shadow-2xs">
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}></span>
      <span className="text-slate-400 font-normal">Detected intent:</span>
      <span className="font-semibold text-slate-800">{meta.label}</span>
    </div>
  );
}
