import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import Dropzone from '../components/documents/Dropzone';
import DocumentCard from '../components/documents/DocumentCard';
import ChunkInspectorModal from '../components/documents/ChunkInspectorModal';
import Modal from '../components/common/Modal';
import Toast from '../components/common/Toast';
import { CardSkeleton } from '../components/common/Skeleton';
import { documentsAPI } from '../api/documents';
import { FileText, RefreshCw, Layers, Database, Sparkles } from 'lucide-react';
import { MAX_FILE_SIZE_MB } from '../utils/constants';

export default function DocumentsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [inspectDoc, setInspectDoc] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const fetchDocuments = async () => {
    try {
      const data = await documentsAPI.list();
      setDocuments(data || []);
    } catch (err) {
      setToast({ message: 'Failed to fetch documents', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Real-time auto-polling: Polls if any document is being indexed in the background
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === 'processing');
    if (!hasProcessing) return;

    const interval = setInterval(async () => {
      try {
        const data = await documentsAPI.list();
        setDocuments(data || []);
      } catch {
        // Silent catch during periodic background refresh
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [documents]);

  const handleUploadSuccess = (uploaded) => {
    const newItems = Array.isArray(uploaded) ? uploaded : [uploaded];
    setDocuments((prev) => {
      const existingIds = new Set(newItems.map((d) => d.id));
      return [...newItems, ...prev.filter((d) => !existingIds.has(d.id))];
    });
    setToast({
      message: `${newItems.length} document(s) uploaded successfully! Parsing & generating vector embeddings in background...`,
      type: 'success',
    });
  };

  const handleConfirmDelete = async () => {
    if (!deletingDoc) return;
    setDeleteLoading(true);
    try {
      await documentsAPI.delete(deletingDoc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== deletingDoc.id));
      setToast({
        message: `"${deletingDoc.file_name}" and its vector index were permanently deleted.`,
        type: 'success',
      });
    } catch (err) {
      setToast({ message: 'Failed to delete document', type: 'error' });
    } finally {
      setDeleteLoading(false);
      setDeletingDoc(null);
    }
  };

  const totalChunks = documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-brand-700 text-xs font-semibold mb-1 border border-blue-200">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Multimodal Knowledge Vault</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Academic Document Inventory
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Upload and manage your college syllabi, lecture slides, scanned notes, and assignment briefs (up to <strong>{MAX_FILE_SIZE_MB} MB per file</strong>).
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
                <Layers className="w-3.5 h-3.5" />
                <span>{totalChunks} Chunks in pgvector</span>
              </div>
              <button
                onClick={fetchDocuments}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Multi-File Batch Dropzone */}
          <div className="mb-8">
            <Dropzone
              onUploadSuccess={handleUploadSuccess}
              onError={(msg) => setToast({ message: msg, type: 'error' })}
            />
          </div>

          {/* Documents Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">
                All Uploaded Documents ({documents.length})
              </h2>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : documents.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800">No documents in vault</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Drag and drop multiple syllabus or notes PDFs into the upload area above to index them.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onDelete={(d) => setDeletingDoc(d)}
                    onInspectChunks={(d) => setInspectDoc(d)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingDoc}
        title="Delete Document & Vector Index?"
        message={`Are you sure you want to permanently delete "${deletingDoc?.file_name}"? All associated pgvector semantic chunks will be purged.`}
        confirmText="Delete Document"
        confirmVariant="danger"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingDoc(null)}
      />

      {/* Chunk Inspector Modal */}
      <ChunkInspectorModal
        isOpen={!!inspectDoc}
        document={inspectDoc}
        onClose={() => setInspectDoc(null)}
      />

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />
    </div>
  );
}