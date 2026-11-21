import React from 'react';
import { FileText, Trash2, CheckCircle2, Clock, AlertTriangle, Database } from 'lucide-react';
import { formatBytes, formatDate } from '../../utils/formatters';

export default function GlobalDocTable({ documents, onDelete, onInspectChunks, loading = false }) {
  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Loading system documents...
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">No documents found</p>
        <p className="text-xs text-slate-400 mt-1">No students have uploaded documents yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="p-4">Document</th>
              <th className="p-4">Uploaded By</th>
              <th className="p-4">Pages / Chunks</th>
              <th className="p-4">Size</th>
              <th className="p-4">Status</th>
              <th className="p-4">Uploaded</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-semibold text-slate-900 max-w-xs truncate" title={doc.file_name}>
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-brand-600 shrink-0" />
                    <span className="truncate">{doc.file_name}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-medium text-slate-800">{doc.user_name}</div>
                  <div className="text-[11px] text-slate-400">{doc.user_email}</div>
                </td>
                <td className="p-4">
                  {doc.page_count} pgs / {doc.chunk_count} chunks
                </td>
                <td className="p-4">{formatBytes(doc.file_size)}</td>
                <td className="p-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      doc.status === 'ready'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : doc.status === 'processing'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {doc.status}
                  </span>
                </td>
                <td className="p-4 text-slate-400">{formatDate(doc.created_at)}</td>
                <td className="p-4 text-right space-x-1">
                  <button
                    onClick={() => onInspectChunks?.(doc)}
                    className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Inspect Chunks"
                  >
                    <Database className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(doc)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Administrative Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
