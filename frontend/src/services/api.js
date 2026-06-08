// src/services/api.js
import axios from 'axios';
import { auth } from './firebase';

const envApiBase = String(import.meta.env.VITE_API_URL || '').trim();
const isDev = import.meta.env.DEV;
const API_BASE = envApiBase || '/api/v1';
const missingProdApiConfig = !envApiBase && !isDev;

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  if (missingProdApiConfig) {
    throw new Error('Production API is not configured. Set VITE_API_URL to your deployed backend base URL, for example https://your-backend.example.com/api/v1.');
  }

  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    const contentType = String(res.headers?.['content-type'] || '');
    if (contentType.includes('text/html')) {
      return Promise.reject(
        new Error('API request returned HTML instead of JSON. Check VITE_API_URL or your hosting rewrites for /api/v1.')
      );
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      auth.signOut();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const searchStudents = (q) => api.get('/students/search', { params: { q } });
export const searchRecruiters = (q) => api.get('/recruiters/search', { params: { q } });
export const searchFaculty = (q) => api.get('/faculty/search', { params: { q } });
export const getFaculty = () => api.get('/faculty');
export const getStudents = (params) => api.get('/students', { params });
export const getStudent = (id) => api.get(`/students/${id}`);
export const createStudent = (data) => api.post('/students', data);
export const updateStudent = (id, data) => api.put(`/students/${id}`, data);
export const deleteStudent = (id) => api.delete(`/students/${id}`);
export const bulkImportStudents = (formData) => api.post('/students/bulk-import', formData);
export const createStudentVerification = (id, data) => api.post(`/students/${id}/verifications`, data);

export const getJobs = (params) => api.get('/jobs', { params });
export const getJob = (id) => api.get(`/jobs/${id}`);
export const createJob = (data) => api.post('/jobs', data);
export const updateJob = (id, data) => api.put(`/jobs/${id}`, data);
export const updateJobStatus = (id, status) => api.put(`/jobs/${id}/status`, { status });
export const closeJob = (id) => api.put(`/jobs/${id}/close`);
export const deleteJob = (id) => api.delete(`/jobs/${id}`);

export const getApplications = (params) => api.get('/applications', { params });
export const createApplication = (data) => api.post('/applications', data);
export const updateApplicationStatus = (id, status) => api.put(`/applications/${id}/status`, { status });

export const getInterviews = (params) => api.get('/interviews', { params });
export const createInterview = (data) => api.post('/interviews', data);
export const deleteInterview = (id) => api.delete(`/interviews/${id}`);

export const getRecruiters = () => api.get('/recruiters');
export const getMyRecruiterProfile = () => api.get('/recruiters/me');
export const createRecruiter = (data) => api.post('/recruiters', data);
export const updateRecruiter = (id, data) => api.put(`/recruiters/${id}`, data);
export const verifyRecruiter = (id, verified) => api.put(`/recruiters/${id}/verify`, { verified });
export const getShortlists = (params) => api.get('/recruiters/shortlists', { params });
export const createShortlist = (data) => api.post('/recruiters/shortlists', data);

export const getPlacementReport = (params) => api.get('/reports/placement', { params });

export const sendNotification = (data) => api.post('/notifications/send', data);
export const getNotifications = () => api.get('/notifications');
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/notifications/read-all');
export const handleNotificationAction = (id, action) => api.post(`/notifications/${id}/action`, { action });

export const getRecommendations = () => api.get('/recommendations');
export const createRecommendation = (data) => api.post('/recommendations', data);

export const parseResume = (formData) => api.post('/resume/parse', formData);
export const uploadResume = (formData) => api.post('/resume/upload', formData);

export const getAdminAnalytics = (params) => api.get('/analytics/admin', { params });
export const getRecruiterAnalytics = () => api.get('/analytics/recruiter');
export const getRankedCandidates = (params) => api.get('/analytics/candidates/ranked', { params });
export const getJobRecommendations = () => api.get('/analytics/recommendations');

export const getMockInterviews = (params) => api.get('/mock-interviews', { params });
export const createMockInterview = (data) => api.post('/mock-interviews', data);

export const getAlumni = (params) => api.get('/alumni', { params });
export const getFacultyVerifications = () => api.get('/faculty/verifications');
export const updateFacultyVerification = (id, data) => api.put(`/faculty/verifications/${id}`, data);
export const getPlacementActivities = () => api.get('/faculty/placement-activities');
export const createPlacementActivity = (data) => api.post('/faculty/placement-activities', data);
export const updatePlacementActivity = (id, data) => api.put(`/faculty/placement-activities/${id}`, data);

export const verifyToken = () => api.post('/auth/verify-token');
export const syncClaims = () => api.post('/auth/sync-claims');
export const bootstrapAdmin = (payload) => api.post('/auth/bootstrap-admin', payload);
export const setUserRole = (targetUid, role) => api.post('/auth/set-role', { targetUid, role });

export default api;
