import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import MessageBubble from '../components/chat/MessageBubble';
import ChatInput from '../components/chat/ChatInput';
import SuggestedQuestions from '../components/chat/SuggestedQuestions';
import { MessageSkeleton } from '../components/common/Skeleton';
import Toast from '../components/common/Toast';
import { chatAPI } from '../api/chat';
import { PlusCircle, MessageSquare, Bot, Sparkles, BookOpen } from 'lucide-react';

export default function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const chatIdParam = searchParams.get('id');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState(chatIdParam);
  const [messages, setMessages] = useState([]);
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

  // Load chat messages when activeChatId changes
  useEffect(() => {
    if (chatIdParam) {
      setActiveChatId(chatIdParam);
      loadChatMessages(chatIdParam);
    } else {
      // If no ID in URL, create one or start fresh
      setMessages([]);
      setActiveChatId(null);
    }
  }, [chatIdParam]);

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
      const session = await chatAPI.create('New Conversation');
      setActiveChatId(session.id);
      setSearchParams({ id: session.id });
      setMessages([]);
    } catch (err) {
      setToast({ message: 'Failed to start a new chat', type: 'error' });
    }
  };

  const handleSendMessage = async (question) => {
    let currentChatId = activeChatId;

    // Create a new session if one does not exist yet
    if (!currentChatId) {
      try {
        const session = await chatAPI.create(question.slice(0, 30) + '...');
        currentChatId = session.id;
        setActiveChatId(session.id);
        setSearchParams({ id: session.id });
      } catch (err) {
        setToast({ message: 'Could not initialize session', type: 'error' });
        return;
      }
    }

    // Optimistically append user message
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: question,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setAnswering(true);

    try {
      const response = await chatAPI.ask(currentChatId, question);
      const assistantMsg = {
        id: `resp-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        detected_intent: response.detected_intent,
        sources: response.sources,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Failed to generate answer.';
      setToast({ message: errMsg, type: 'error' });
    } finally {
      setAnswering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 flex flex-col h-[calc(100vh-4rem)] max-w-5xl mx-auto w-full">
          {/* Chat Header */}
          <div className="h-14 px-4 sm:px-6 border-b border-slate-200/80 bg-white/70 backdrop-blur-xs flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs border border-brand-100">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-900 block leading-tight">
                  Academic Q&A Assistant
                </span>
                <span className="text-[10px] text-slate-400 block leading-tight">
                  Grounded on uploaded college documents
                </span>
              </div>
            </div>

            <button
              onClick={handleStartNewChat}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100/70 border border-brand-200 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
            {loading ? (
              <div className="space-y-4 pt-4">
                <MessageSkeleton />
                <MessageSkeleton />
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center max-w-lg mx-auto py-8">
                <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4 border border-brand-100 shadow-2xs">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  What would you like to know from your college documents?
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 mb-6 max-w-sm leading-relaxed">
                  Ask about syllabus units, exam patterns, passing marks, assignment deadlines, or attendance policies.
                </p>

                <SuggestedQuestions onSelectQuestion={handleSendMessage} />
              </div>
            ) : (
              <div>
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}

                {answering && (
                  <div className="flex items-start space-x-3 mb-6 animate-fade-in max-w-2xl">
                    <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 shrink-0 mt-1">
                      <Bot className="w-4 h-4 animate-pulse" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-xs p-4 shadow-xs">
                      <div className="flex items-center space-x-2 text-xs font-medium text-slate-500">
                        <span className="w-2 h-2 rounded-full bg-brand-600 animate-ping"></span>
                        <span>Retrieving chunks & generating grounded answer...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Fixed Chat Input */}
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={answering}
          />
        </main>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />
    </div>
  );
}
