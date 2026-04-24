// src/pages/recruiter/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, Users, CheckCircle, ArrowRight, TrendingUp, BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, FunnelChart, Funnel, LabelList, Cell, PieChart, Pie, Legend,
} from 'recharts';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { getRecruiterAnalytics } from '../../services/api';

const COLORS = ['#00A3FF', '#F5A623', '#A855F7', '#22C55E', '#EC4899'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 border border-white/10 text-xs font-body">
      <p className="text-white font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color || '#00A3FF' }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function RecruiterDashboard() {
  const { userProfile } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getRecruiterAnalytics();
        setAnalytics(data);
      } catch {
        // Fallback to mock data if API unavailable
        setAnalytics({
          stats: { totalJobs: 0, activeJobs: 0, totalApplications: 0, shortlisted: 0, selected: 0 },
          applicationFunnel: [],
          perJobStats: [],
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = analytics?.stats || {};
  const funnel = analytics?.applicationFunnel || [];
  const perJob = analytics?.perJobStats || [];

  return (
    <DashboardLayout title="Recruiter Dashboard">
      <div className="space-y-5">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass-card p-5 border border-blue-electric/20"
          style={{ background: 'linear-gradient(135deg, rgba(0,163,255,0.08), rgba(245,166,35,0.05))' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-white/60 text-sm font-body">Welcome,</p>
              <h2 className="font-heading font-bold text-2xl text-white">{userProfile?.name || 'Recruiter'}</h2>
              <p className="text-white/40 text-sm font-body mt-1">
                {loading ? 'Loading your stats...' : `${stats.activeJobs || 0} active job postings · ${stats.totalApplications || 0} total applicants`}
              </p>
            </div>
            <div className="flex gap-3">
              <Link to="/recruiter/post-job">
                <button className="btn-primary text-sm py-2.5 flex items-center gap-2">
                  Post a Job <ArrowRight size={14} />
                </button>
              </Link>
              <Link to="/recruiter/candidates">
                <button className="btn-outline text-sm py-2.5">Browse Candidates</button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Jobs Posted', value: stats.totalJobs ?? '—', color: 'text-blue-electric' },
            { label: 'Active Jobs', value: stats.activeJobs ?? '—', color: 'text-green-400' },
            { label: 'Applicants', value: stats.totalApplications ?? '—', color: 'text-gold' },
            { label: 'Shortlisted', value: stats.shortlisted ?? '—', color: 'text-purple-400' },
            { label: 'Selected', value: stats.selected ?? '—', color: 'text-green-400' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }} className="glass-card p-4">
              <p className="text-white/40 text-xs font-body mb-1">{s.label}</p>
              <p className={`font-heading font-bold text-2xl ${s.color}`}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Application Funnel */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass-card p-5">
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp size={16} className="text-blue-electric" />
              <p className="section-title">Hiring Funnel</p>
            </div>
            {funnel.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-white/30 text-sm font-body">
                No application data yet. Post jobs to see your funnel.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={funnel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="stage" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} width={75} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Candidates" radius={[0, 4, 4, 0]}>
                    {funnel.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Per-job applicants */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="glass-card p-5">
            <div className="flex items-center gap-2 mb-5">
              <BarChart2 size={16} className="text-gold" />
              <p className="section-title">Applications per Job</p>
            </div>
            {perJob.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-white/30 text-sm font-body">
                No posted jobs yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={perJob.slice(0, 6)} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="title" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="applicants" name="Applicants" fill="#00A3FF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="shortlisted" name="Shortlisted" fill="#F5A623" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </div>

        {/* My Jobs Table */}
        {perJob.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="glass-card overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <p className="section-title">My Job Postings</p>
              <Link to="/recruiter/post-job" className="text-blue-electric text-xs font-body hover:underline">+ Post new</Link>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Job Title', 'Company', 'Applicants', 'Shortlisted'].map((h) => (
                    <th key={h} className="table-header text-left px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perJob.map((job, i) => (
                  <tr key={i} className="table-row">
                    <td className="px-5 py-3 text-white text-sm font-medium">{job.title}</td>
                    <td className="px-5 py-3 text-white/50 text-sm font-body">{job.company}</td>
                    <td className="px-5 py-3 font-mono text-blue-electric">{job.applicants}</td>
                    <td className="px-5 py-3 font-mono text-gold">{job.shortlisted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
