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

  uploadBatch: async (files, onUploadProgress) => {
    const formData = new FormData();
    for (const f of files) {
      formData.append('files', f);
    }
    const res = await api.post('/api/documents/upload-batch', formData, {
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

  getChunks: async (id, skip = 0, limit = 100) => {
    const res = await api.get(`/api/documents/${id}/chunks`, {
      params: { skip, limit },
    });
    return res.data;
  },

  getFeaturedQuestions: async (documentId = null) => {
    const params = documentId ? { document_id: documentId } : {};
    const res = await api.get('/api/documents/featured-questions', { params });
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/api/documents/${id}`);
    return res.data;
  },
};
