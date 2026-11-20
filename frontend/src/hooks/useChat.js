import { useState, useEffect } from 'react';
import { chatAPI } from '../api/chat';

export function useChat(chatId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await chatAPI.getById(chatId);
        setMessages(data.messages || []);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load conversation');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [chatId]);

  return { messages, setMessages, loading, error };
}
