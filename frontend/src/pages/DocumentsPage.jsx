import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import Dropzone from '../components/documents/Dropzone';
import DocumentCard from '../components/documents/DocumentCard';
import Modal from '../components/common/Modal';
import Toast from '../components/common/Toast';
import { CardSkeleton } from '../components/common/Skeleton';
import { documentsAPI } from '../api/documents';
import { FileText, RefreshCw, Layers } from 'lucide-react';

export default function DocumentsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const fetchDocuments = async () => {
    try {
      const data = await documentsAPI.list();
      setDocuments(data);
    } catch (err) {
      setToast({ message: 'Failed to fetch documents', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUploadSuccess = (newDoc) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setToast({
      message: `Document "${newDoc.file_name}" uploaded and indexed successfully!`,
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
        message: `Deleted "${deletingDoc.file_name}" and associated vector index.`,
        type: 'success',
      });
    } catch (err) {
      setToast({ message: 'Failed to delete document', type: 'error' });
    } finally {
      setDeleteLoading(false);
      setDeletingDoc(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Academic Documents Hub
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Upload and manage the PDFs that power your personalized RAG knowledge base.
              </p>
            </div>

            <button
              onClick={() => {
                setLoading(true);
                fetchDocuments();
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {/* Upload Area */}
          <div className="mb-8">
            <Dropzone
              onUploadSuccess={handleUploadSuccess}
              onError={(msg) => setToast({ message: msg, type: 'error' })}
            />
          </div>

          {/* Documents Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-800 flex items-center space-x-2">
                <span>Uploaded Documents</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700 text-xs font-medium">
                  {documents.length}
                </span>
              </h2>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : documents.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800">No documents uploaded yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Upload your first syllabus, lecture notes, or college circular above to begin asking cited questions.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onDelete={(d) => setDeletingDoc(d)}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingDoc)}
        title="Delete Academic Document?"
        message={`Are you sure you want to permanently delete "${deletingDoc?.file_name}"? All associated dense vector chunks and embeddings will be removed from pgvector.`}
        confirmText="Delete Document"
        confirmVariant="danger"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingDoc(null)}
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
