/**
 * services/api.js
 * ─────────────────────────────────────────────────────────────────────────────
 * MERN API Service Layer
 * Connects the React application to the Express/Node.js backend.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios from 'axios';
import { LS } from '../utils/localStorage';

let tempApiUrl = 'http://localhost:5000/api';
try {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) {
    tempApiUrl = import.meta.env.VITE_API_URL;
  } else if (process.env && process.env.REACT_APP_API_URL) {
    tempApiUrl = process.env.REACT_APP_API_URL;
  }
} catch (e) {
  if (process.env && process.env.REACT_APP_API_URL) {
    tempApiUrl = process.env.REACT_APP_API_URL;
  }
}

if (tempApiUrl && !tempApiUrl.endsWith('/api') && !tempApiUrl.endsWith('/api/')) {
  tempApiUrl = tempApiUrl.endsWith('/') ? `${tempApiUrl}api` : `${tempApiUrl}/api`;
}

const BASE_URL = tempApiUrl;

// Create central Axios instance
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Token Helpers ───────────────────────────────────────────────────────────
export const tokenService = {
  get: () => LS.get('noteflow_token', null),
  set: (token) => LS.set('noteflow_token', token),
  clear: () => LS.remove('noteflow_token'),
};

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = tokenService.get();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authAPI = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },

  register: async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    return res.data;
  },

  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

// ─── Notes API ────────────────────────────────────────────────────────────────
export const notesAPI = {
  getAll: async (params = {}) => {
    const res = await api.get('/notes', { params });
    return res.data;
  },

  getOne: async (id) => {
    const res = await api.get(`/notes/${id}`);
    return res.data;
  },

  create: async (data) => {
    const res = await api.post('/notes', data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/notes/${id}`, data);
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/notes/${id}`);
    return res.data;
  },
};

// ─── AI features API ──────────────────────────────────────────────────────────
export const aiAPI = {
  summarize: async (content) => {
    const res = await api.post('/ai/summarize', { content });
    return res.data;
  },

  improve: async (content) => {
    const res = await api.post('/ai/improve', { content });
    return res.data;
  },

  generateTags: async (content) => {
    const res = await api.post('/ai/generate-tags', { content });
    return res.data;
  },

  extractActions: async (content) => {
    const res = await api.post('/ai/extract-actions', { content });
    return res.data;
  },

  askNote: async (noteId, question) => {
    const res = await api.post('/ai/ask-note', { noteId, question });
    return res.data;
  },

  semanticSearch: async (query) => {
    const res = await api.post('/ai/semantic-search', { query });
    return res.data;
  },

  agentChat: async (messages, userMessage) => {
    const res = await api.post('/ai/agent-chat', { messages, userMessage });
    return res.data;
  },

  getDailyBrief: async () => {
    const res = await api.get('/ai/daily-brief');
    return res.data;
  },

  prepareDay: async () => {
    const res = await api.post('/ai/prepare-day');
    return res.data;
  },

  getKnowledgeGraph: async (threshold) => {
    const res = await api.get('/ai/knowledge-graph', { params: { threshold } });
    return res.data;
  },

  generateMCQs: async (content) => {
    const res = await api.post('/ai/generate-mcqs', { content });
    return res.data;
  },

  generateQuiz: async (content) => {
    const res = await api.post('/ai/generate-quiz', { content });
    return res.data;
  },
};


// ─── Friends API ─────────────────────────────────────────────────────────────
export const friendsAPI = {
  getAll: async () => {
    const res = await api.get('/friends');
    return res.data;
  },
  search: async (q) => {
    const res = await api.get('/friends/search', { params: { q } });
    return res.data;
  },
  getRequests: async () => {
    const res = await api.get('/friends/requests');
    return res.data;
  },
  sendRequest: async (receiverId) => {
    const res = await api.post('/friends/requests', { receiverId });
    return res.data;
  },
  acceptRequest: async (id) => {
    const res = await api.post(`/friends/requests/${id}/accept`);
    return res.data;
  },
  rejectRequest: async (id) => {
    const res = await api.post(`/friends/requests/${id}/reject`);
    return res.data;
  },
  remove: async (id) => {
    const res = await api.delete(`/friends/${id}`);
    return res.data;
  },
};

// ─── Note Sharing API ─────────────────────────────────────────────────────────
export const sharesAPI = {
  share: async (noteId, sharedWithUserId, permission) => {
    const res = await api.post(`/notes/${noteId}/share`, { sharedWithUserId, permission });
    return res.data;
  },
  getSharedWithMe: async () => {
    const res = await api.get('/notes/shared-with-me');
    return res.data;
  },
  getNoteShares: async (noteId) => {
    const res = await api.get(`/notes/${noteId}/shares`);
    return res.data;
  },
  updatePermission: async (noteId, shareId, permission) => {
    const res = await api.patch(`/notes/${noteId}/shares/${shareId}`, { permission });
    return res.data;
  },
  removeShare: async (noteId, shareId) => {
    const res = await api.delete(`/notes/${noteId}/shares/${shareId}`);
    return res.data;
  },
  invite: async (noteId, email, permission) => {
    const res = await api.post(`/notes/${noteId}/invitations`, { email, permission });
    return res.data;
  },
  removeInvitation: async (noteId, invitationId) => {
    const res = await api.delete(`/notes/${noteId}/invitations/${invitationId}`);
    return res.data;
  },
};

// ─── Messages API ─────────────────────────────────────────────────────────────
export const messagesAPI = {
  getConversations: async () => {
    const res = await api.get('/messages');
    return res.data;
  },
  getHistory: async (friendId) => {
    const res = await api.get(`/messages/${friendId}`);
    return res.data;
  },
  sendMessage: async (receiverId, content) => {
    const res = await api.post('/messages', { receiverId, content });
    return res.data;
  },
  deleteMessage: async (id) => {
    const res = await api.delete(`/messages/${id}`);
    return res.data;
  },
  deleteConversation: async (friendId) => {
    const res = await api.delete(`/messages/conversation/${friendId}`);
    return res.data;
  },
};

// ─── Notifications API ────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll: async () => {
    const res = await api.get('/notifications');
    return res.data;
  },
  markAsRead: async () => {
    const res = await api.post('/notifications/read');
    return res.data;
  },
};

// ─── Users API ───────────────────────────────────────────────────────────────
export const usersAPI = {
  checkEmail: async (email) => {
    const res = await api.get('/users/check-email', { params: { email } });
    return res.data;
  },
};

// ─── Events API ──────────────────────────────────────────────────────────────
export const eventsAPI = {
  getAll: async () => {
    const res = await api.get('/events');
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/events', data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/events/${id}`);
    return res.data;
  },
};

// ─── Related Notes API ────────────────────────────────────────────────────────
export const relatedNotesAPI = {
  getRelated: async (noteId) => {
    const res = await api.get(`/notes/${noteId}/related`);
    return res.data;
  },
};

export default api;

