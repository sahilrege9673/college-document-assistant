import api from './client';

export const chatAPI = {
  create: async (title = 'New Conversation') => {
    const res = await api.post('/api/chats', { title });
    return res.data;
  },

  list: async (skip = 0, limit = 50) => {
    const res = await api.get('/api/chats', {
      params: { skip, limit },
    });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/api/chats/${id}`);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/api/chats/${id}`);
    return res.data;
  },

  ask: async (chatId, question, documentId = null) => {
    const payload = { question };
    if (documentId) payload.document_id = documentId;
    const res = await api.post(`/api/chats/${chatId}/ask`, payload);
    return res.data;
  },
};
