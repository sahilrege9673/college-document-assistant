import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import { documentsAPI } from '../api/documents';
import { chatAPI } from '../api/chat';
import {
  FileText,
  MessageSquare,
  Upload,
  ArrowRight,
  BookOpen,
  Sparkles,
  Clock,
  Layers,
} from 'lucide-react';
import { formatDate } from '../utils/formatters';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [docsData, chatsData] = await Promise.all([
          documentsAPI.list(0, 5),
          chatAPI.list(0, 5),
        ]);
        setDocuments(docsData);
        setChats(chatsData);
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleStartNewChat = async () => {
    try {
      const newSession = await chatAPI.create('New Conversation');
      navigate(`/chat?id=${newSession.id}`);
    } catch (err) {
      console.error('Error starting chat', err);
      navigate('/chat');
    }
  };

  const totalChunks = documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0);
  const totalQuestions = chats.reduce((sum, c) => sum + (c.message_count ? Math.floor(c.message_count / 2) : 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* Welcome Banner */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Academic Assistant Active</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Welcome back, {user?.full_name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Query your college materials with zero hallucinations and verified page citations.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                to="/documents"
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs transition-colors"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Upload PDF</span>
              </Link>

              <button
                onClick={handleStartNewChat}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-xs transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Start New Chat</span>
              </button>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Documents
                </p>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{documents.length}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Uploaded syllabi & notes</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Indexed Chunks
                </p>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{totalChunks}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">384-dim dense vectors</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Chat Sessions
                </p>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{chats.length}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Q&A conversations</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Grounding Status
                </p>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <p className="text-lg font-bold text-slate-900 mt-2">Active</p>
              <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">Strict citations enforced</p>
            </div>
          </div>

          {/* Recent Activity Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Documents */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Recent Documents</h3>
                <Link
                  to="/documents"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>

              {loading ? (
                <p className="text-xs text-slate-400">Loading documents...</p>
              ) : documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">No documents uploaded yet</p>
                  <Link
                    to="/documents"
                    className="text-xs text-brand-600 hover:underline mt-1 inline-block"
                  >
                    Upload your first syllabus or notes PDF
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.slice(0, 4).map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100"
                    >
                      <div className="flex items-center space-x-2.5 truncate pr-2">
                        <FileText className="w-4 h-4 text-brand-600 shrink-0" />
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {doc.file_name}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        {doc.page_count} pgs
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Conversations */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Recent Chats</h3>
                <Link
                  to="/history"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center"
                >
                  <span>View history</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>

              {loading ? (
                <p className="text-xs text-slate-400">Loading chats...</p>
              ) : chats.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">No chat sessions yet</p>
                  <button
                    onClick={handleStartNewChat}
                    className="text-xs text-brand-600 hover:underline mt-1 inline-block"
                  >
                    Start your first academic conversation
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {chats.slice(0, 4).map((chat) => (
                    <Link
                      key={chat.id}
                      to={`/chat?id=${chat.id}`}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-brand-50/50 hover:border-brand-200 transition-colors"
                    >
                      <div className="flex items-center space-x-2.5 truncate pr-2">
                        <MessageSquare className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {chat.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(chat.updated_at)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
