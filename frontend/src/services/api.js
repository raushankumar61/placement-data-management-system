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
export const closeJob = (id) => api.put(`/jobs/${id}/close`);
export const deleteJob = (id) => api.delete(`/jobs/${id}`);

// ─── Applications ────────────────────────────────────────────
export const getApplications = (params) => api.get('/applications', { params });
export const createApplication = (data) => api.post('/applications', data);
export const updateApplicationStatus = (id, status) => api.put(`/applications/${id}/status`, { status });

// ─── Interviews ──────────────────────────────────────────────
export const getInterviews = (params) => api.get('/interviews', { params });
export const createInterview = (data) => api.post('/interviews', data);
export const deleteInterview = (id) => api.delete(`/interviews/${id}`);

// ─── Recruiters ──────────────────────────────────────────────
export const getRecruiters = () => api.get('/recruiters');
export const getMyRecruiterProfile = () => api.get('/recruiters/me');
export const createRecruiter = (data) => api.post('/recruiters', data);
export const updateRecruiter = (id, data) => api.put(`/recruiters/${id}`, data);
export const verifyRecruiter = (id, verified) => api.put(`/recruiters/${id}/verify`, { verified });

// ─── Reports ─────────────────────────────────────────────────
export const getPlacementReport = (params) => api.get('/reports/placement', { params });

// ─── Notifications ───────────────────────────────────────────
export const sendNotification = (data) => api.post('/notifications/send', data);
export const getNotifications = () => api.get('/notifications');
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/notifications/read-all');

// ─── Complaints ──────────────────────────────────────────────
export const getComplaints = () => api.get('/complaints');
export const createComplaint = (data) => api.post('/complaints', data);
export const resolveComplaint = (id, data) => api.put(`/complaints/${id}/resolve`, data);
export const deleteComplaint = (id) => api.delete(`/complaints/${id}`);

// ─── Resume ──────────────────────────────────────────────────
export const parseResume = (formData) => api.post('/resume/parse', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// ─── Analytics ───────────────────────────────────────────────
export const getAdminAnalytics = () => api.get('/analytics/admin');
export const getRecruiterAnalytics = () => api.get('/analytics/recruiter');
export const getRankedCandidates = (params) => api.get('/analytics/candidates/ranked', { params });
export const getJobRecommendations = () => api.get('/analytics/recommendations');

// ─── Auth ────────────────────────────────────────────────────
export const verifyToken = () => api.post('/auth/verify-token');
export const syncClaims = () => api.post('/auth/sync-claims');
export const setUserRole = (targetUid, role) => api.post('/auth/set-role', { targetUid, role });

export default api;
