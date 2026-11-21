import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import Dropzone from '../components/documents/Dropzone';
import ChunkInspectorModal from '../components/documents/ChunkInspectorModal';
import { documentsAPI } from '../api/documents';
import { chatAPI } from '../api/chat';
import {
  FileText,
  MessageSquare,
  Upload,
  ArrowRight,
  BookOpen,
  Sparkles,
  Layers,
  Database,
  CheckCircle2,
  Cpu,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Tag,
  Zap,
} from 'lucide-react';
import { formatDate, formatBytes } from '../utils/formatters';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [chats, setChats] = useState([]);
  const [featuredQuestions, setFeaturedQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuickUpload, setShowQuickUpload] = useState(false);
  const [inspectDoc, setInspectDoc] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const [docsData, chatsData, questionsData] = await Promise.all([
        documentsAPI.list(0, 10),
        chatAPI.list(0, 6),
        documentsAPI.getFeaturedQuestions().catch(() => []),
      ]);
      setDocuments(docsData || []);
      setChats(chatsData || []);
      setFeaturedQuestions(questionsData || []);
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Real-time polling on Dashboard if any document is processing
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === 'processing');
    if (!hasProcessing) return;

    const interval = setInterval(async () => {
      try {
        const [docsData, questionsData] = await Promise.all([
          documentsAPI.list(0, 10),
          documentsAPI.getFeaturedQuestions().catch(() => []),
        ]);
        setDocuments(docsData || []);
        if (questionsData?.length) setFeaturedQuestions(questionsData);
      } catch {
        // Silent catch during background sync
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [documents]);

  const handleStartNewChat = async (initialQuestion = null, documentId = null) => {
    try {
      const title = initialQuestion
        ? initialQuestion.substring(0, 36) + '...'
        : 'New Academic Conversation';
      const newSession = await chatAPI.create(title);
      navigate(`/chat?id=${newSession.id}`, {
        state: { autoQuestion: initialQuestion, selectedDocId: documentId },
      });
    } catch (err) {
      console.error('Error starting chat', err);
      navigate('/chat', { state: { autoQuestion: initialQuestion, selectedDocId: documentId } });
    }
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const totalChunks = documents.reduce((sum, d) => sum + (d.chunk_count || 0), 0);
  const totalPages = documents.reduce((sum, d) => sum + (d.page_count || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Executive Welcome Hero Banner */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-700/50">
            {/* Background decorative glow */}
            <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-brand-300">
                  <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                  <span>OmniScholar AI • Academic Intelligence Platform</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                  {getTimeGreeting()}, {user?.full_name || 'Scholar'}
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Upload complete course syllabi, lecture slides, and notes (up to <strong>100 MB per file</strong>).
                  Our autonomous agent chunks, vectorizes, and analyzes each document for strictly grounded academic answers.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
                    <Cpu className="w-3 h-3 mr-1 text-brand-400" />
                    Gemini 1.5 Flash Vision Multimodal
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
                    <Database className="w-3 h-3 mr-1 text-purple-400" />
                    Supabase pgvector (384-dim)
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
                    <Zap className="w-3 h-3 mr-1 text-emerald-400" />
                    Batch Upload Cap: 100 MB / file
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowQuickUpload(!showQuickUpload)}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md transition-all shadow-sm"
                >
                  <Upload className="w-4 h-4 text-brand-300" />
                  <span>{showQuickUpload ? 'Hide Uploader' : 'Batch Upload PDFs'}</span>
                  {showQuickUpload ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleStartNewChat()}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/30 transition-all hover:scale-[1.02]"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open Research Copilot</span>
                </button>
              </div>
            </div>

            {/* Collapsible Inline Batch Uploader Widget */}
            {showQuickUpload && (
              <div className="mt-6 pt-6 border-t border-slate-700/60 animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="bg-slate-900/90 rounded-2xl p-4 sm:p-5 border border-slate-700">
                  <div className="mb-3 flex items-center justify-between text-xs text-slate-300">
                    <span className="font-semibold text-white">Direct Batch Staging Zone:</span>
                    <span>Upload multiple PDFs simultaneously (up to 100 MB each)</span>
                  </div>
                  <Dropzone
                    onUploadSuccess={(docs) => {
                      fetchDashboardData();
                    }}
                    onError={(err) => console.error(err)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Metric Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Document Vault
                </p>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">{documents.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{totalPages} total pages parsed & OCR'd</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Indexed Vectors
                </p>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">{totalChunks}</p>
              <p className="text-[11px] text-purple-600 font-medium mt-0.5">384-dim dense embeddings</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Active Conversations
                </p>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-extrabold text-slate-900 mt-2">{chats.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Persistent multi-session history</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Grounding Rigor
                </p>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <p className="text-lg font-extrabold text-slate-900 mt-2">Zero Hallucination</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Strict Page Citation Enforced
              </p>
            </div>
          </div>

          {/* Featured AI Questions Section (Autonomous Document Intelligence) */}
          <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/70 border border-blue-200/80 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    AI-Discovered Featured Questions
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Autonomously extracted from your indexed syllabi and documents. Click to ask the Copilot directly:
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-block text-[11px] text-brand-600 font-semibold">
                Click any question to ask ➔
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
              {featuredQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleStartNewChat(q)}
                  className="text-left p-3 rounded-xl bg-white border border-slate-200 hover:border-brand-300 hover:bg-brand-50/40 text-xs text-slate-800 transition-all shadow-2xs hover:shadow-xs group flex items-start space-x-2"
                >
                  <HelpCircle className="w-4 h-4 text-brand-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <span className="font-medium group-hover:text-brand-900 leading-snug">{q}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Inventory & Recent Activity Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Document Inventory (2 Columns) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-brand-600" />
                  <h3 className="text-sm font-bold text-slate-900">Indexed Document Corpus</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                    {documents.length}
                  </span>
                </div>
                <Link
                  to="/documents"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center"
                >
                  <span>Manage All</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading document vault...</div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">No documents indexed yet</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Upload your college syllabi, lecture slides, or exam patterns to start asking grounded questions.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowQuickUpload(true)}
                    className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload First PDF</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.slice(0, 5).map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100 mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 truncate" title={doc.file_name}>
                            {doc.file_name}
                          </h4>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                            <span>{formatBytes(doc.file_size)}</span>
                            <span>•</span>
                            <span>{doc.page_count} pages</span>
                            <span>•</span>
                            <span className="font-semibold text-purple-700">{doc.chunk_count} chunks</span>
                          </div>
                          {doc.summary && (
                            <p className="text-[11px] text-slate-600 mt-1 line-clamp-1">
                              {doc.summary}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => setInspectDoc(doc)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors"
                          title="Inspect chunks & embeddings"
                        >
                          <Database className="w-3 h-3 text-purple-600" />
                          <span>Chunks</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartNewChat(null, doc.id)}
                          className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg text-[11px] font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-2xs transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Ask AI</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Conversations / Q&A Sessions (1 Column) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-brand-600" />
                  <h3 className="text-sm font-bold text-slate-900">Recent Q&A Threads</h3>
                </div>
                <Link
                  to="/history"
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  View all
                </Link>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading history...</div>
              ) : chats.length === 0 ? (
                <div className="text-center py-8 text-slate-400 space-y-1">
                  <p className="text-xs font-medium text-slate-600">No conversations yet</p>
                  <p className="text-[11px] text-slate-400">Questions you ask will be saved here.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {chats.slice(0, 5).map((chat) => (
                    <Link
                      key={chat.id}
                      to={`/chat?id=${chat.id}`}
                      className="block p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-100 hover:border-slate-200 transition-all text-xs"
                    >
                      <p className="font-semibold text-slate-800 truncate">{chat.title}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                        <span>{chat.message_count} messages</span>
                        <span>{formatDate(chat.updated_at || chat.created_at)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Chunk Inspector Modal */}
      <ChunkInspectorModal
        isOpen={!!inspectDoc}
        document={inspectDoc}
        onClose={() => setInspectDoc(null)}
      />
    </div>
  );
}