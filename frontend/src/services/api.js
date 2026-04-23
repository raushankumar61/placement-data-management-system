// src/services/api.js
import axios from 'axios';
import { auth } from './firebase';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      auth.signOut();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Students ───────────────────────────────────────────────
export const getStudents = (params) => api.get('/students', { params });
export const getStudent = (id) => api.get(`/students/${id}`);
export const createStudent = (data) => api.post('/students', data);
export const updateStudent = (id, data) => api.put(`/students/${id}`, data);
export const deleteStudent = (id) => api.delete(`/students/${id}`);
export const bulkImportStudents = (formData) => api.post('/students/bulk-import', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// ─── Jobs ────────────────────────────────────────────────────
export const getJobs = (params) => api.get('/jobs', { params });
export const getJob = (id) => api.get(`/jobs/${id}`);
export const createJob = (data) => api.post('/jobs', data);
export const updateJob = (id, data) => api.put(`/jobs/${id}`, data);
export const deleteJob = (id) => api.delete(`/jobs/${id}`);

// ─── Applications ────────────────────────────────────────────
export const getApplications = (params) => api.get('/applications', { params });
export const createApplication = (data) => api.post('/applications', data);
export const updateApplicationStatus = (id, status) => api.put(`/applications/${id}/status`, { status });

// ─── Recruiters ──────────────────────────────────────────────
export const getRecruiters = () => api.get('/recruiters');
export const createRecruiter = (data) => api.post('/recruiters', data);
export const updateRecruiter = (id, data) => api.put(`/recruiters/${id}`, data);

// ─── Reports ─────────────────────────────────────────────────
export const getPlacementReport = (params) => api.get('/reports/placement', { params });

// ─── Notifications ───────────────────────────────────────────
export const sendNotification = (data) => api.post('/notifications/send', data);
export const getNotifications = () => api.get('/notifications');
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);

// ─── Auth ────────────────────────────────────────────────────
export const verifyToken = () => api.post('/auth/verify-token');

/**
 * Calls the backend to read the current user's role from Firestore
 * and write it into their Firebase custom claims. The ID token must
 * be refreshed afterward for the role to appear in subsequent tokens.
 * Call this once after registration or first login.
 */
export const syncClaims = () => api.post('/auth/sync-claims');

export default api;
