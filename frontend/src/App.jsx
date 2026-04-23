// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import DashboardLayout from './components/common/DashboardLayout';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import AdminStudents from './pages/admin/Students';
import AdminJobs from './pages/admin/Jobs';
import AdminApplications from './pages/admin/Applications';
import AdminReports from './pages/admin/Reports';
import AdminNotifications from './pages/admin/Notifications';
import AdminRecruiters from './pages/admin/Recruiters';

// Student
import StudentDashboard from './pages/student/Dashboard';
import StudentProfile from './pages/student/Profile';
import StudentJobBoard from './pages/student/JobBoard';
import StudentApplications from './pages/student/Applications';
import StudentInterviews from './pages/student/Interviews';

// Recruiter
import RecruiterDashboard from './pages/recruiter/Dashboard';
import RecruiterPostJob from './pages/recruiter/PostJob';
import RecruiterCandidates from './pages/recruiter/Candidates';
import RecruiterInterviewScheduler from './pages/recruiter/InterviewScheduler';

// Faculty
import FacultyDashboard from './pages/faculty/Dashboard';
import FacultyRecommendations from './pages/faculty/Recommendations';
import FacultyDataVerification from './pages/faculty/Dataverification';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-blue-electric/30 border-t-blue-electric rounded-full animate-spin" />
          <span className="text-white/50 font-body text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    const redirectMap = {
      admin: '/admin/dashboard',
      student: '/student/dashboard',
      recruiter: '/recruiter/dashboard',
      faculty: '/faculty/dashboard',
    };
    return <Navigate to={redirectMap[role] || '/login'} replace />;
  }

  return children;
}

function RoleRedirect() {
  const { role, user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const map = {
    admin: '/admin/dashboard',
    student: '/student/dashboard',
    recruiter: '/recruiter/dashboard',
    faculty: '/faculty/dashboard',
  };
  return <Navigate to={map[role] || '/login'} replace />;
}

// Wrap student interviews in DashboardLayout
function StudentInterviewsWrapper() {
  return (
    <DashboardLayout title="My Interviews & Feedback">
      <StudentInterviews />
    </DashboardLayout>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<RoleRedirect />} />

      {/* Admin */}
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><AdminStudents /></ProtectedRoute>} />
      <Route path="/admin/jobs" element={<ProtectedRoute allowedRoles={['admin']}><AdminJobs /></ProtectedRoute>} />
      <Route path="/admin/applications" element={<ProtectedRoute allowedRoles={['admin']}><AdminApplications /></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AdminReports /></ProtectedRoute>} />
      <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['admin']}><AdminNotifications /></ProtectedRoute>} />
      <Route path="/admin/recruiters" element={<ProtectedRoute allowedRoles={['admin']}><AdminRecruiters /></ProtectedRoute>} />

      {/* Student */}
      <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
      <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student']}><StudentProfile /></ProtectedRoute>} />
      <Route path="/student/jobs" element={<ProtectedRoute allowedRoles={['student']}><StudentJobBoard /></ProtectedRoute>} />
      <Route path="/student/applications" element={<ProtectedRoute allowedRoles={['student']}><StudentApplications /></ProtectedRoute>} />
      <Route path="/student/interviews" element={<ProtectedRoute allowedRoles={['student']}><StudentInterviewsWrapper /></ProtectedRoute>} />

      {/* Recruiter */}
      <Route path="/recruiter/dashboard" element={<ProtectedRoute allowedRoles={['recruiter']}><RecruiterDashboard /></ProtectedRoute>} />
      <Route path="/recruiter/post-job" element={<ProtectedRoute allowedRoles={['recruiter']}><RecruiterPostJob /></ProtectedRoute>} />
      <Route path="/recruiter/candidates" element={<ProtectedRoute allowedRoles={['recruiter']}><RecruiterCandidates /></ProtectedRoute>} />
      <Route path="/recruiter/interviews" element={<ProtectedRoute allowedRoles={['recruiter']}><RecruiterInterviewScheduler /></ProtectedRoute>} />

      {/* Faculty */}
      <Route path="/faculty/dashboard" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyDashboard /></ProtectedRoute>} />
      <Route path="/faculty/recommendations" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyRecommendations /></ProtectedRoute>} />
      <Route path="/faculty/verification" element={<ProtectedRoute allowedRoles={['faculty']}><FacultyDataVerification /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0D1425',
              color: '#E8EDF5',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontFamily: 'DM Sans, sans-serif',
            },
            success: { iconTheme: { primary: '#00A3FF', secondary: '#050811' } },
            error: { iconTheme: { primary: '#FF4D4F', secondary: '#050811' } },
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}