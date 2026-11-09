import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexus_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('nexus_token');
        localStorage.removeItem('nexus_user');
        window.dispatchEvent(new Event('nexus_auth_logout'));
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email, new_password) => api.post('/auth/forgot-password', { email, new_password }),
};

export const documentService = {
  list: (params) => api.get('/documents', { params }),
  get: (id) => api.get(`/documents/${id}`),
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/documents/${id}`),
  downloadUrl: (id) => `/api/documents/${id}/download`,
  preview: (id) => api.get(`/documents/${id}/preview`),
  categories: () => api.get('/documents/categories'),
  createCategory: (formData) => api.post('/documents/categories', formData),
  tags: () => api.get('/documents/tags'),
};

export const searchService = {
  search: (payload) => api.post('/search', payload),
  history: (limit = 20) => api.get('/search/history', { params: { limit } }),
  clearHistory: () => api.delete('/search/history'),
  deleteHistoryItem: (id) => api.delete(`/search/history/${id}`),
};

export const aiService = {
  ask: (payload) => api.post('/ai/ask', payload),
  recommendations: (documentId, limit = 5) => api.get(`/ai/recommendations/${documentId}`, { params: { limit } }),
};

export const analyticsService = {
  dashboard: () => api.get('/analytics/dashboard'),
  knowledgeGaps: () => api.get('/analytics/knowledge-gaps'),
};

export const userService = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const notificationService = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const settingsService = {
  get: () => api.get('/settings'),
  update: (settings) => api.put('/settings', { settings }),
};

export default api;

