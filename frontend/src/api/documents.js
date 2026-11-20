import api from './client';

export const documentsAPI = {
  upload: async (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
    return res.data;
  },

  list: async (skip = 0, limit = 50) => {
    const res = await api.get('/api/documents', {
      params: { skip, limit },
    });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/api/documents/${id}`);
    return res.data;
  },

  getStatus: async (id) => {
    const res = await api.get(`/api/documents/${id}/status`);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/api/documents/${id}`);
    return res.data;
  },
};
