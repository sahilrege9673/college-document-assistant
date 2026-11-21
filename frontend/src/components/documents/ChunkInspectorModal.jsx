import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Database,
  FileText,
  Hash,
  Layers,
  Loader2,
  Copy,
  Check,
  Cpu,
  BookOpen,
} from 'lucide-react';
import { documentsAPI } from '../../api/documents';

export default function ChunkInspectorModal({ isOpen, onClose, document }) {
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (isOpen && document?.id) {
      loadChunks(document.id);
    } else {
      setChunks([]);
      setSearchQuery('');
    }
  }, [isOpen, document]);

  const loadChunks = async (docId) => {
    setLoading(true);
    try {
      const data = await documentsAPI.getChunks(docId, 0, 150);
      setChunks(data || []);
    } catch (err) {
      console.error('Failed to load chunks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen || !document) return null;

  const filteredChunks = chunks.filter((c) =>
    searchQuery
      ? c.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(c.page_number).includes(searchQuery)
      : true
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  pgvector Dense Index
                </span>
                <span className="text-xs text-slate-400">384-dim Embeddings</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1 truncate max-w-md sm:max-w-xl">
                {document.file_name}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {document.chunk_count} total semantic chunks indexed across {document.page_count} pages
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search keyword or page number inside chunks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-200"
            />
          </div>
          <span className="text-xs text-slate-400 shrink-0">
            Showing {filteredChunks.length} of {chunks.length} chunks
          </span>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
              <p className="text-xs font-medium">Fetching pgvector embeddings & chunk text...</p>
            </div>
          ) : filteredChunks.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <Layers className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No matching chunks found</p>
              <p className="text-xs text-slate-400">Try adjusting your search query</p>
            </div>
          ) : (
            filteredChunks.map((chunk) => (
              <div
                key={chunk.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:border-slate-300 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono font-semibold">
                      <Hash className="w-3 h-3 text-slate-400" />
                      <span>Chunk {chunk.chunk_index + 1}</span>
                    </span>
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-100">
                      <BookOpen className="w-3 h-3" />
                      <span>Page {chunk.page_number}</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {chunk.token_count} words/tokens
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {chunk.embedding_preview && chunk.embedding_preview.length > 0 && (
                      <span
                        className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-mono border border-purple-100"
                        title="Vector embedding excerpt"
                      >
                        <Cpu className="w-3 h-3" />
                        <span>[{chunk.embedding_preview.map((x) => x.toFixed(3)).join(', ')}...]</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopyText(chunk.id, chunk.content)}
                      className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-[11px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      title="Copy chunk text"
                    >
                      {copiedId === chunk.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-wrap font-sans bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  {chunk.content}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between text-xs text-slate-500">
          <span>Target Embedding Model: <code>sentence-transformers/all-MiniLM-L6-v2</code></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}