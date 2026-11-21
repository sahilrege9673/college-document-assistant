import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  BookOpen,
  Database,
  MessageSquare,
  Sparkles,
  Tag,
} from 'lucide-react';
import { formatBytes, formatDate } from '../../utils/formatters';

export default function DocumentCard({ doc, onDelete, onInspectChunks }) {
  const navigate = useNavigate();

  const statusStyles = {
    ready: {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />,
      text: 'Indexed & Ready',
    },
    processing: {
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <Clock className="w-3.5 h-3.5 mr-1 text-blue-600 animate-spin" />,
      text: 'Vectorizing...',
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

  const startChatWithDoc = () => {
    navigate('/chat', { state: { selectedDocId: doc.id, selectedDocName: doc.file_name } });
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-50 to-blue-100/60 text-brand-600 flex items-center justify-center shrink-0 border border-brand-100 shadow-2xs">
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

        <h4 className="text-sm font-bold text-slate-900 truncate" title={doc.file_name}>
          {doc.file_name}
        </h4>

        <div className="flex items-center space-x-2 text-xs text-slate-500 mt-2">
          <span>{formatBytes(doc.file_size)}</span>
          <span>•</span>
          <span className="flex items-center">
            <BookOpen className="w-3.5 h-3.5 mr-1 text-slate-400" />
            {doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}
          </span>
          <span>•</span>
          <span className="flex items-center font-medium text-slate-700">
            <Layers className="w-3.5 h-3.5 mr-1 text-brand-500" />
            {doc.chunk_count} chunks
          </span>
        </div>

        {/* AI Executive Summary preview if available */}
        {doc.summary && (
          <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 leading-relaxed">
            <div className="flex items-center space-x-1 text-brand-600 font-semibold mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Document Summary</span>
            </div>
            <p className="line-clamp-2">{doc.summary}</p>
          </div>
        )}

        {/* Detected Topics Tags */}
        {doc.detected_topics && doc.detected_topics.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {doc.detected_topics.slice(0, 3).map((topic, idx) => (
              <span
                key={idx}
                className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60 font-medium"
              >
                <Tag className="w-2.5 h-2.5 mr-1 text-slate-400" />
                {topic}
              </span>
            ))}
            {doc.detected_topics.length > 3 && (
              <span className="text-[10px] text-slate-400 self-center">
                +{doc.detected_topics.length - 3} more
              </span>
            )}
          </div>
        )}

        {doc.error_message && (
          <div className="mt-2.5 p-2 rounded-lg bg-rose-50 border border-rose-100 text-[11px] text-rose-700 leading-tight">
            {doc.error_message}
          </div>
        )}
      </div>

      <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400">
          {formatDate(doc.created_at)}
        </span>

        <div className="flex items-center space-x-1.5">
          {doc.status === 'ready' && (
            <>
              <button
                type="button"
                onClick={() => onInspectChunks?.(doc)}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
                title="Inspect semantic chunks and pgvector embeddings"
              >
                <Database className="w-3 h-3 text-purple-600" />
                <span>Chunks</span>
              </button>
              <button
                type="button"
                onClick={startChatWithDoc}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-2xs transition-colors"
                title="Open grounded Q&A with this document"
              >
                <MessageSquare className="w-3 h-3" />
                <span>Ask AI</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}