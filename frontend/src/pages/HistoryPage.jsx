import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import Modal from '../components/common/Modal';
import Toast from '../components/common/Toast';
import { CardSkeleton } from '../components/common/Skeleton';
import { chatAPI } from '../api/chat';
import { MessageSquare, Trash2, Clock, ArrowRight, MessageCircle } from 'lucide-react';
import { formatDate } from '../utils/formatters';

export default function HistoryPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingChat, setDeletingChat] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const navigate = useNavigate();

  const fetchChats = async () => {
    try {
      const data = await chatAPI.list();
      setChats(data);
    } catch (err) {
      setToast({ message: 'Failed to load chat history', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  const handleConfirmDelete = async () => {
    if (!deletingChat) return;
    setDeleteLoading(true);
    try {
      await chatAPI.delete(deletingChat.id);
      setChats((prev) => prev.filter((c) => c.id !== deletingChat.id));
      setToast({ message: 'Conversation deleted successfully.', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to delete conversation', type: 'error' });
    } finally {
      setDeleteLoading(false);
      setDeletingChat(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Conversation History
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Review and resume your previous academic queries and cited responses.
            </p>
          </div>

          {loading ? (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : chats.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800">No conversations yet</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Start your first chat session with your uploaded college materials.
              </p>
              <button
                onClick={() => navigate('/chat')}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-xs transition-colors"
              >
                <span>Start New Chat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-brand-200 transition-all flex items-center justify-between gap-4 group"
                >
                  <div
                    onClick={() => navigate(`/chat?id=${chat.id}`)}
                    className="flex-1 cursor-pointer truncate"
                  >
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="w-4 h-4 text-brand-600 shrink-0" />
                      <h4 className="text-sm font-semibold text-slate-900 truncate group-hover:text-brand-600 transition-colors">
                        {chat.title}
                      </h4>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1 pl-6">
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(chat.updated_at)}
                      </span>
                      <span>•</span>
                      <span>{chat.message_count || 0} messages</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => navigate(`/chat?id=${chat.id}`)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-brand-700 hover:bg-brand-50 border border-slate-200 hover:border-brand-200 transition-colors hidden sm:inline-flex items-center"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </button>

                    <button
                      onClick={() => setDeletingChat(chat)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <Modal
        isOpen={Boolean(deletingChat)}
        title="Delete Conversation?"
        message={`Are you sure you want to delete "${deletingChat?.title}"? All user questions and generated answers in this session will be permanently removed.`}
        confirmText="Delete Chat"
        confirmVariant="danger"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingChat(null)}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />
    </div>
  );
}
