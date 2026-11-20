import React from 'react';
import { FileText, Trash2, CheckCircle2, Clock, AlertTriangle, Layers, BookOpen } from 'lucide-react';
import { formatBytes, formatDate } from '../../utils/formatters';

export default function DocumentCard({ doc, onDelete }) {
  const statusStyles = {
    ready: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />,
      text: 'Ready',
    },
    processing: {
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <Clock className="w-3.5 h-3.5 mr-1 text-blue-600 animate-spin" />,
      text: 'Processing',
    },
    failed: {
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />,
      text: 'Failed',
    },
  }[doc.status] || {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: null,
    text: doc.status,
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-100">
            <FileText className="w-5 h-5" />
          </div>

          <div className="flex items-center space-x-1.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusStyles.badge}`}
            >
              {statusStyles.icon}
              {statusStyles.text}
            </span>

            <button
              onClick={() => onDelete(doc)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-80 group-hover:opacity-100"
              title="Delete document"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h4 className="text-sm font-semibold text-slate-900 truncate" title={doc.file_name}>
          {doc.file_name}
        </h4>

        <div className="flex items-center space-x-3 text-xs text-slate-500 mt-2">
          <span>{formatBytes(doc.file_size)}</span>
          <span>•</span>
          <span className="flex items-center">
            <BookOpen className="w-3.5 h-3.5 mr-1 text-slate-400" />
            {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}
          </span>
          <span>•</span>
          <span className="flex items-center">
            <Layers className="w-3.5 h-3.5 mr-1 text-slate-400" />
            {doc.chunk_count} {doc.chunk_count === 1 ? 'chunk' : 'chunks'}
          </span>
        </div>

        {doc.error_message && (
          <div className="mt-2.5 p-2 rounded-lg bg-rose-50 border border-rose-100 text-[11px] text-rose-700 leading-tight">
            {doc.error_message}
          </div>
        )}
      </div>

      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Uploaded {formatDate(doc.created_at)}</span>
      </div>
    </div>
  );
}
