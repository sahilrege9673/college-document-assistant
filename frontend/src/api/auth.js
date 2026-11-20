import api from './client';

export const authAPI = {
  signup: async (fullName, email, password) => {
    const res = await api.post('/api/auth/signup', {
      full_name: fullName,
      email,
      password,
    });
    return res.data;
  },

  login: async (email, password) => {
    const res = await api.post('/api/auth/login', {
      username: email,
      password,
    });
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/api/auth/me');
    return res.data;
  },

  logout: async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Ignore network errors on logout
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};
