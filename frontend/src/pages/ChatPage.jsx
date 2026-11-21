import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import MessageBubble from '../components/chat/MessageBubble';
import ChatInput from '../components/chat/ChatInput';
import SuggestedQuestions from '../components/chat/SuggestedQuestions';
import { MessageSkeleton } from '../components/common/Skeleton';
import Toast from '../components/common/Toast';
import { chatAPI } from '../api/chat';
import { documentsAPI } from '../api/documents';
import {
  PlusCircle,
  MessageSquare,
  Bot,
  Sparkles,
  BookOpen,
  Filter,
  Download,
  Trash2,
  Layers,
  FileText,
} from 'lucide-react';

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const chatIdParam = searchParams.get('id');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState(chatIdParam);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(location.state?.selectedDocId || '');
  const [featuredQuestions, setFeaturedQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, answering]);

  // Load document list for filtering & suggested questions
  useEffect(() => {
    const fetchDocsAndQuestions = async () => {
      try {
        const [docsData, questionsData] = await Promise.all([
          documentsAPI.list(),
          documentsAPI.getFeaturedQuestions(selectedDocId || null),
        ]);
        setDocuments(docsData || []);
        setFeaturedQuestions(questionsData || []);
      } catch (err) {
        console.error('Failed to load documents for chat', err);
      }
    };
    fetchDocsAndQuestions();
  }, [selectedDocId]);

  // Load chat messages when chatIdParam changes
  useEffect(() => {
    if (chatIdParam) {
      setActiveChatId(chatIdParam);
      loadChatMessages(chatIdParam);
    } else {
      setMessages([]);
      setActiveChatId(null);
    }
  }, [chatIdParam]);

  // Handle autoQuestion passed from Dashboard or Documents page
  useEffect(() => {
    if (location.state?.autoQuestion) {
      const q = location.state.autoQuestion;
      // Clear location state so it doesn't re-trigger
      navigate(location.pathname + (chatIdParam ? `?id=${chatIdParam}` : ''), {
        replace: true,
        state: {},
      });
      handleSendMessage(q);
    }
  }, [location.state]);

  const loadChatMessages = async (id) => {
    setLoading(true);
    try {
      const data = await chatAPI.getById(id);
      setMessages(data.messages || []);
    } catch (err) {
      setToast({ message: 'Could not load conversation', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewChat = async () => {
    try {
      const session = await chatAPI.create('New Academic Conversation');
      setActiveChatId(session.id);
      setSearchParams({ id: session.id });
      setMessages([]);
    } catch (err) {
      setToast({ message: 'Failed to start a new chat', type: 'error' });
    }
  };

  const handleSendMessage = async (question) => {
    let currentChatId = activeChatId;

    if (!currentChatId) {
      try {
        const session = await chatAPI.create(question.slice(0, 36) + '...');
        currentChatId = session.id;
        setActiveChatId(session.id);
        setSearchParams({ id: session.id });
      } catch (err) {
        setToast({ message: 'Could not initialize session', type: 'error' });
        return;
      }
    }

    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: question,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setAnswering(true);

    try {
      const response = await chatAPI.ask(currentChatId, question, selectedDocId || null);
      const assistantMsg = {
        id: `resp-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        detected_intent: response.detected_intent,
        sources: response.sources || [],
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail || 'An error occurred while communicating with the model.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${errorMsg}`,
          sources: [],
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setAnswering(false);
    }
  };

  const exportConversation = () => {
    if (messages.length === 0) return;
    let md = `# OmniScholar AI Conversation Export\nDate: ${new Date().toLocaleString()}\n\n---\n\n`;
    for (const m of messages) {
      md += `### ${m.role === 'user' ? '🧑 User' : '🤖 OmniScholar AI'}\n\n${m.content}\n\n`;
      if (m.sources && m.sources.length > 0) {
        md += `**Citations:**\n`;
        m.sources.forEach((s) => {
          md += `- *${s.document_name}* (Page ${s.page_number}): "${s.chunk_preview}"\n`;
        });
        md += `\n`;
      }
      md += `---\n\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OmniScholar-Chat-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ message: 'Conversation exported as Markdown file.', type: 'success' });
  };

  const selectedDocName = documents.find((d) => d.id === selectedDocId)?.file_name;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex-1 flex flex-col h-[calc(100vh-65px)]">
          {/* Top Control Bar */}
          <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5">
                <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-sm">
                  🤖
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-tight">
                    Academic Research Copilot
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Strict pgvector Grounding • Page Citations Enforced
                  </p>
                </div>
              </div>

              {/* Document Filter Dropdown */}
              <div className="hidden sm:flex items-center space-x-1.5 pl-3 border-l border-slate-200">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium focus:outline-none focus:border-brand-500"
                >
                  <option value="">📚 All Documents ({documents.length})</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      📄 {d.file_name} ({d.chunk_count} chunks)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={exportConversation}
                  className="inline-flex items-center space-x-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                  title="Export chat as Markdown"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleStartNewChat}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>New Thread</span>
              </button>
            </div>
          </div>

          {/* Active Document Filter Pill for mobile */}
          {selectedDocName && (
            <div className="bg-brand-50/70 border-b border-brand-100 px-4 py-1.5 flex items-center justify-between text-xs text-brand-800 font-medium">
              <span className="truncate">Active Scope: 📄 {selectedDocName}</span>
              <button
                onClick={() => setSelectedDocId('')}
                className="text-[11px] text-brand-600 hover:underline shrink-0 ml-2"
              >
                Clear Scope (Search All)
              </button>
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4">
            {loading ? (
              <div className="max-w-4xl mx-auto space-y-4">
                <MessageSkeleton />
                <MessageSkeleton />
              </div>
            ) : messages.length === 0 ? (
              <div className="max-w-3xl mx-auto py-10 sm:py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/25">
                  <Bot className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  How can I help with your college documents today?
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto mt-2 leading-relaxed">
                  Answers are synthesized strictly from your uploaded syllabus and lecture materials,
                  complete with verified page citations.
                </p>

                {/* Suggested Questions */}
                <div className="mt-8 text-left">
                  <SuggestedQuestions
                    onSelectQuestion={handleSendMessage}
                    questions={featuredQuestions}
                  />
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}

                {answering && (
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      🤖
                    </div>
                    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-2">
                      <div className="flex items-center space-x-2 text-xs text-brand-600 font-semibold">
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        <span>Scanning pgvector dense index & synthesizing grounded answer...</span>
                      </div>
                      <div className="h-2 w-48 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full animate-pulse w-3/4" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Chat Input */}
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={answering}
            placeholder={
              selectedDocName
                ? `Ask anything from "${selectedDocName}"...`
                : 'Ask anything from your uploaded college documents...'
            }
          />
        </div>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />
    </div>
  );
}