import api from './client';

export const adminAPI = {
  getStats: async () => {
    const res = await api.get('/api/admin/stats');
    return res.data;
  },

  getAllDocuments: async (skip = 0, limit = 100) => {
    const res = await api.get('/api/admin/documents', {
      params: { skip, limit },
    });
    return res.data;
  },

  deleteDocument: async (id) => {
    const res = await api.delete(`/api/admin/documents/${id}`);
    return res.data;
  },
};
