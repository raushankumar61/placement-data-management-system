// src/pages/student/Dashboard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Briefcase, CheckCircle, Clock, ArrowRight, Bell } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const upcomingInterviews = [
  { company: 'Google', role: 'SDE', date: 'Feb 5, 2025', time: '10:00 AM', mode: 'Online', round: 'Technical Round 1' },
  { company: 'Amazon', role: 'SDE-2', date: 'Feb 8, 2025', time: '2:00 PM', mode: 'Online', round: 'HR Round' },
];

const recentApplications = [
  { company: 'Google', role: 'SDE', status: 'Shortlisted', date: 'Jan 20' },
  { company: 'Microsoft', role: 'Data Scientist', status: 'Applied', date: 'Jan 22' },
  { company: 'Amazon', role: 'SDE-2', status: 'Applied', date: 'Jan 23' },
];

const notifications = [
  { text: 'Google Technical Round scheduled for Feb 5', time: '2h ago', type: 'interview' },
  { text: 'New job posted: Adobe — UI Engineer (15 LPA)', time: '5h ago', type: 'job' },
  { text: 'Deadline approaching: Infosys application due tomorrow', time: '1d ago', type: 'deadline' },
];

const STATUS_CLASS = { Shortlisted: 'badge-blue', Applied: 'badge-gray', Selected: 'badge-green', Rejected: 'badge-red' };

export default function StudentDashboard() {
  const { userProfile } = useAuth();

  return (
    <DashboardLayout title="Student Dashboard">
      <div className="space-y-5">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 border border-blue-electric/20"
          style={{ background: 'linear-gradient(135deg, rgba(0,163,255,0.08), rgba(245,166,35,0.05))' }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-white/60 text-sm font-body">Welcome back,</p>
              <h2 className="font-heading font-bold text-2xl text-white">{userProfile?.name || 'Student'} 👋</h2>
              <p className="text-white/40 text-sm font-body mt-1">You have 2 upcoming interviews this week</p>
            </div>
            <Link to="/student/jobs">
              <button className="btn-primary text-sm py-2.5 flex items-center gap-2">
                Browse 24 Jobs <ArrowRight size={14} />
              </button>
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Applications', value: 8, icon: FileText, color: 'text-blue-electric', bg: 'bg-blue-electric/10' },
            { label: 'Shortlisted', value: 3, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Interviews', value: 2, icon: Clock, color: 'text-gold', bg: 'bg-gold/10' },
            { label: 'Jobs Available', value: 24, icon: Briefcase, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }} className="glass-card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon size={16} className={s.color} />
              </div>
              <div>
                <p className={`font-heading font-bold text-xl ${s.color}`}>{s.value}</p>
                <p className="text-white/40 text-xs font-body">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Upcoming Interviews */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <p className="section-title">Upcoming Interviews</p>
              <Link to="/student/applications" className="text-blue-electric text-xs font-body hover:underline">View all</Link>
            </div>
            {upcomingInterviews.map((iv, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="glass-card p-4 border border-white/5 hover:border-blue-electric/20 transition-colors">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-electric/20 to-gold/10 flex items-center justify-center border border-white/10">
                      <span className="font-heading font-bold text-white text-sm">{iv.company[0]}</span>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{iv.company} — {iv.role}</p>
                      <p className="text-white/40 text-xs font-body">{iv.round}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white/70 text-sm font-body">{iv.date}</p>
                    <p className="text-white/40 text-xs font-body">{iv.time} · {iv.mode}</p>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Recent Applications */}
            <div className="flex items-center justify-between mt-2">
              <p className="section-title">Recent Applications</p>
            </div>
            <div className="glass-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Company', 'Role', 'Applied', 'Status'].map((h) => (
                      <th key={h} className="table-header text-left px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentApplications.map((app, i) => (
                    <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 + i * 0.06 }} className="table-row">
                      <td className="px-4 py-3 text-white text-sm font-medium">{app.company}</td>
                      <td className="px-4 py-3 text-white/60 text-sm font-body">{app.role}</td>
                      <td className="px-4 py-3 text-white/40 text-xs font-body">{app.date}</td>
                      <td className="px-4 py-3"><span className={STATUS_CLASS[app.status]}>{app.status}</span></td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-blue-electric" />
              <p className="section-title">Notifications</p>
            </div>
            <div className="space-y-3">
              {notifications.map((n, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="glass-card p-4 border border-white/5">
                  <p className="text-white/70 text-sm font-body leading-relaxed">{n.text}</p>
                  <p className="text-white/30 text-xs font-body mt-2">{n.time}</p>
                </motion.div>
              ))}
            </div>

            {/* Profile Completion */}
            <div className="glass-card p-4 border border-gold/20">
              <p className="text-white/80 text-sm font-semibold mb-3">Profile Completion</p>
              <div className="space-y-2">
                {[
                  { label: 'Basic Info', done: true },
                  { label: 'Resume Uploaded', done: true },
                  { label: 'Skills Added', done: true },
                  { label: 'Projects Added', done: false },
                  { label: 'Certifications', done: false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${item.done ? 'bg-green-500/20' : 'bg-white/5'}`}>
                      {item.done && <CheckCircle size={10} className="text-green-400" />}
                    </div>
                    <span className={`text-xs font-body ${item.done ? 'text-white/60' : 'text-white/30'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs font-body mb-1">
                  <span className="text-white/40">60% complete</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full w-3/5 rounded-full bg-gold" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
