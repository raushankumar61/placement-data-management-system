// src/components/common/DashboardLayout.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Briefcase, FileText, BarChart3,
  Bell, Building2, LogOut, Menu, X, ChevronRight, Zap,
  UserCircle, Search, BookOpen, Calendar, MessageSquare,
  Shield, Settings, ClipboardList, TrendingUp, GraduationCap, Video
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';

const NAV_CONFIG = {
  admin: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'Students', icon: Users, path: '/admin/students' },
    { label: 'Jobs & Drives', icon: Briefcase, path: '/admin/jobs' },
    { label: 'Applications', icon: FileText, path: '/admin/applications' },
    { label: 'Reports', icon: BarChart3, path: '/admin/reports' },
    { label: 'Notifications', icon: Bell, path: '/admin/notifications' },
    { label: 'Recruiters', icon: Building2, path: '/admin/recruiters' },
    { label: 'Complaints', icon: MessageSquare, path: '/admin/complaints' },
  ],
  student: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/student/dashboard' },
    { label: 'My Profile', icon: UserCircle, path: '/student/profile' },
    { label: 'Job Board', icon: Search, path: '/student/jobs' },
    { label: 'Applications', icon: FileText, path: '/student/applications' },
    { label: 'Interviews & Feedback', icon: Calendar, path: '/student/interviews' },
    { label: 'Mock Interviews', icon: Video, path: '/student/mock-interviews' },
    { label: 'Alumni Connect', icon: GraduationCap, path: '/student/alumni' },
    { label: 'Notifications', icon: Bell, path: '/student/notifications', badge: true },
    { label: 'Recommendations', icon: TrendingUp, path: '/student/recommendations' },
  ],
  recruiter: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/recruiter/dashboard' },
    { label: 'Post Job', icon: Briefcase, path: '/recruiter/post-job' },
    { label: 'My Jobs', icon: ClipboardList, path: '/recruiter/my-jobs' },
    { label: 'Candidates', icon: Users, path: '/recruiter/candidates' },
    { label: 'Interview Scheduler', icon: Calendar, path: '/recruiter/interviews' },
  ],
  faculty: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/faculty/dashboard' },
    { label: 'Recommendations', icon: BookOpen, path: '/faculty/recommendations' },
    { label: 'Data Verification', icon: Shield, path: '/faculty/verification' },
    { label: 'Placement Activities', icon: ClipboardList, path: '/faculty/activities' },
    { label: 'Send Notifications', icon: Bell, path: '/faculty/notifications' },
  ],
};

const ROLE_LABELS = {
  admin: 'Placement Officer',
  student: 'Student',
  recruiter: 'Recruiter',
  faculty: 'Faculty',
};

const ROLE_COLORS = {
  admin: 'text-blue-electric',
  student: 'text-gold',
  recruiter: 'text-green-400',
  faculty: 'text-purple-400',
};

export default function DashboardLayout({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { userProfile, role, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = NAV_CONFIG[role] || [];

  // Real-time unread notification count for students
  useEffect(() => {
    if (!user?.uid || role !== 'student') return;
    const q = query(
      collection(db, 'notifications'),
      orderBy('sentAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const count = snap.docs.filter((d) => {
        const data = d.data();
        const forMe = !data.targetUid || data.targetUid === user.uid;
        const forRole = !data.targetRole || data.targetRole === 'all' || data.targetRole === 'student';
        const isUnread = !Array.isArray(data.read) || !data.read.includes(user.uid);
        return forMe && forRole && isUnread;
      }).length;
      setUnreadCount(count);
    }, () => {});
    return unsub;
  }, [user?.uid, role]);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-electric/20 border border-blue-electric/40 flex items-center justify-center">
            <Zap size={16} className="text-blue-electric" />
          </div>
          {sidebarOpen && (
            <span className="font-heading font-bold text-white">
              Place<span className="text-blue-electric">Cloud</span>
            </span>
          )}
        </Link>
      </div>

      {/* User Info */}
      {sidebarOpen && (
        <div className="p-4 border-b border-white/5">
          <div className="glass-card p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-electric/30 to-gold/20 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-heading font-bold text-sm">
                {(userProfile?.name || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{userProfile?.name || 'User'}</p>
              <p className={`text-xs font-body ${ROLE_COLORS[role]}`}>{ROLE_LABELS[role]}</p>
            </div>
          </div>
        </div>
      )}

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} onClick={() => setMobileSidebarOpen(false)}>
              <motion.div
                whileHover={{ x: 2 }}
                className={`sidebar-link ${isActive ? 'active' : ''} ${!sidebarOpen ? 'justify-center px-2' : ''}`}
                title={!sidebarOpen ? item.label : ''}
              >
                <item.icon size={18} />
                {sidebarOpen && <span className="text-sm">{item.label}</span>}
                {sidebarOpen && isActive && <ChevronRight size={14} className="ml-auto opacity-60" />}
                {/* Unread badge for Notifications */}
                {sidebarOpen && item.badge && unreadCount > 0 && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-blue-electric text-white text-xs flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-white/5 space-y-1">
        <button
          onClick={handleLogout}
          className={`sidebar-link w-full hover:text-red-400 ${!sidebarOpen ? 'justify-center px-2' : ''}`}
          title={!sidebarOpen ? 'Logout' : ''}
        >
          <LogOut size={18} />
          {sidebarOpen && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen mesh-bg flex">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 240 : 64 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden md:flex flex-col border-r border-white/5 bg-dark-800/60 backdrop-blur-xl flex-shrink-0 overflow-hidden relative"
      >
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-4 -right-3 z-10 w-6 h-6 rounded-full bg-dark-600 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
        >
          <motion.div animate={{ rotate: sidebarOpen ? 0 : 180 }}>
            <ChevronRight size={12} />
          </motion.div>
        </button>
        <SidebarContent />
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/60 z-40"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 25 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-60 bg-dark-800 border-r border-white/10 z-50"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 border-b border-white/5 bg-dark-800/40 backdrop-blur-md flex items-center px-4 md:px-6 gap-4">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden text-white/60 hover:text-white"
          >
            <Menu size={20} />
          </button>
          <div>
            <h1 className="font-heading font-semibold text-white text-base">{title}</h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {role === 'student' && unreadCount > 0 && (
              <Link to="/student/notifications" className="relative">
                <Bell size={18} className="text-white/40 hover:text-blue-electric transition-colors" />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-blue-electric text-white text-[9px] flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </Link>
            )}
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-electric/30 to-gold/20 flex items-center justify-center">
              <span className="text-white font-bold text-xs">
                {(userProfile?.name || 'U')[0].toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <motion.main
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 overflow-auto p-4 md:p-6"
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}