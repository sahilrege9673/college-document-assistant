import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import StatCard from '../components/admin/StatCard';
import GlobalDocTable from '../components/admin/GlobalDocTable';
import ChunkInspectorModal from '../components/documents/ChunkInspectorModal';
import Modal from '../components/common/Modal';
import Toast from '../components/common/Toast';
import { adminAPI } from '../api/admin';
import { Users, FileText, Layers, MessageSquare, HelpCircle, Shield, RefreshCw } from 'lucide-react';

export default function AdminPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const [inspectDoc, setInspectDoc] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, docsData] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getAllDocuments(),
      ]);
      setStats(statsData);
      setDocuments(docsData);
    } catch (err) {
      setToast({ message: 'Failed to load administrator data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirmDelete = async () => {
    if (!deletingDoc) return;
    setDeleteLoading(true);
    try {
      await adminAPI.deleteDocument(deletingDoc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== deletingDoc.id));
      if (stats) {
        setStats((prev) => ({
          ...prev,
          total_documents: Math.max(0, prev.total_documents - 1),
          total_chunks: Math.max(0, prev.total_chunks - (deletingDoc.chunk_count || 0)),
        }));
      }
      setToast({
        message: `Admin permanently purged "${deletingDoc.file_name}".`,
        type: 'success',
      });
    } catch (err) {
      setToast({ message: 'Failed to purge document.', type: 'error' });
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
              <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-1 border border-purple-200">
                <Shield className="w-3 h-3" />
                <span>Super Administrator</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                College Platform Administration
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Overview of total students, indexed documents, vector chunks, and system oversight.
              </p>
            </div>

            <button
              onClick={fetchData}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Stats</span>
            </button>
          </div>

          {/* Platform Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard
              title="Students"
              value={stats?.total_users}
              icon={Users}
              color="brand"
              subtitle="Registered accounts"
            />
            <StatCard
              title="Documents"
              value={stats?.total_documents}
              icon={FileText}
              color="emerald"
              subtitle="Uploaded PDFs"
            />
            <StatCard
              title="Vector Chunks"
              value={stats?.total_chunks}
              icon={Layers}
              color="purple"
              subtitle="pgvector embeddings"
            />
            <StatCard
              title="Chat Sessions"
              value={stats?.total_chats}
              icon={MessageSquare}
              color="amber"
              subtitle="Student conversations"
            />
            <StatCard
              title="Total Questions"
              value={stats?.total_questions}
              icon={HelpCircle}
              color="rose"
              subtitle="Grounded queries"
            />
          </div>

          {/* All Documents Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-800">
                Global Document Inventory ({documents.length})
              </h2>
            </div>

            <GlobalDocTable
              documents={documents}
              onDelete={(d) => setDeletingDoc(d)}
              onInspectChunks={(d) => setInspectDoc(d)}
              loading={loading}
            />
          </div>
        </main>
      </div>

      <ChunkInspectorModal
        isOpen={!!inspectDoc}
        document={inspectDoc}
        onClose={() => setInspectDoc(null)}
      />

      <Modal
        isOpen={Boolean(deletingDoc)}
        title="Admin Purge Document?"
        message={`Are you sure you want to administratively purge "${deletingDoc?.file_name}" uploaded by ${deletingDoc?.user_email}? This action cannot be undone.`}
        confirmText="Purge Document"
        confirmVariant="danger"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingDoc(null)}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />
    </div>
  );
}
