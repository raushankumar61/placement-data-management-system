// src/pages/admin/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Briefcase, TrendingUp, Award, Activity, Building2, Clock, CheckCircle2 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import DashboardLayout from '../../components/common/DashboardLayout';
import { getAdminAnalytics } from '../../services/api';

const COLORS = ['#00A3FF', '#F5A623', '#22C55E', '#A855F7', '#EC4899'];

const ACTIVITY_TYPE_LABELS = {
  job_posted: 'New job posted',
  application_submitted: 'Student applied',
  status_updated: 'Application status updated',
  recruiter_verified: 'Recruiter verified',
  role_assigned: 'Role assigned',
  student_imported: 'Students imported',
  interview_scheduled: 'Interview scheduled',
  complaint_filed: 'Complaint filed',
  complaint_resolved: 'Complaint resolved',
  notification_sent: 'Notification sent',
  user_registered: 'New user registered',
};

const ACTIVITY_COLORS = {
  job_posted: 'text-blue-electric',
  application_submitted: 'text-gold',
  status_updated: 'text-green-400',
  recruiter_verified: 'text-purple-400',
  complaint_filed: 'text-red-400',
  complaint_resolved: 'text-green-400',
  notification_sent: 'text-blue-electric',
  user_registered: 'text-purple-400',
  default: 'text-white/50',
};

const formatActivityText = (a) => {
  const base = ACTIVITY_TYPE_LABELS[a.type] || a.type;
  const p = a.payload || {};
  if (a.type === 'job_posted' && p.title) return `${p.title} at ${p.company || 'company'} posted`;
  if (a.type === 'application_submitted' && p.company) return `Student applied to ${p.company}`;
  if (a.type === 'status_updated' && p.newStatus) return `Application marked ${p.newStatus}`;
  if (a.type === 'notification_sent') return `Notification sent to ${p.targetRole || 'all'}`;
  if (a.type === 'complaint_filed' && p.title) return `Complaint: "${p.title.slice(0, 40)}..."`;
  return base;
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

function StatCard({ icon: Icon, label, value, sub, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="stat-card"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-white/50 text-xs font-body mb-1">{label}</p>
        <p className="font-heading font-bold text-2xl text-white">{value}</p>
        {sub && <p className="text-white/40 text-xs font-body mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 border border-white/10 text-xs font-body bg-dark-800/95 shadow-lg rounded-lg">
      <p className="text-white font-semibold mb-2">{label}</p>
      {payload.map((p) => {
        const displayColor = p.color === '#00A3FF' ? '#00D9FF' : p.color === '#F5A623' ? '#FFB84D' : '#22C55E';
        return (
          <p key={p.name} style={{ color: displayColor }} className="font-medium">
            {p.name}: <span className="font-bold">{p.value}</span>
          </p>
        );
      })}
    </div>
  );
};

const PlacementTrendChart = ({ placementTrend }) => {
  const [chartType, setChartType] = useState('area');

  const totalPlaced = placementTrend.reduce((sum, t) => sum + (t.placed || 0), 0);
  const totalDrives = placementTrend.reduce((sum, t) => sum + (t.drives || 0), 0);
  const avgMonthly = placementTrend.length > 0 ? Math.round(totalPlaced / placementTrend.length) : 0;
  const peakMonth = placementTrend.reduce((max, t) => (t.placed > max.placed ? t : max), placementTrend[0] || {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-card p-6 lg:col-span-2"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="section-title">Placement Trend</p>
          <p className="text-white/40 text-xs font-body mt-0.5">Monthly placements & drives — 2024-25</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartType('area')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              chartType === 'area'
                ? 'bg-blue-electric text-white'
                : 'bg-white/10 text-white/50 hover:bg-white/20'
            }`}
          >
            Area
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              chartType === 'bar'
                ? 'bg-blue-electric text-white'
                : 'bg-white/10 text-white/50 hover:bg-white/20'
            }`}
          >
            Bar
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-white/10">
        <div className="space-y-1">
          <p className="text-white/50 text-xs font-body">Total Placements</p>
          <p className="text-2xl font-bold text-blue-electric">{totalPlaced}</p>
        </div>
        <div className="space-y-1">
          <p className="text-white/50 text-xs font-body">Monthly Average</p>
          <p className="text-2xl font-bold text-gold">{avgMonthly}</p>
        </div>
        <div className="space-y-1">
          <p className="text-white/50 text-xs font-body">Total Applications</p>
          <p className="text-2xl font-bold text-purple-400">{totalDrives}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-4">
        <ResponsiveContainer width="100%" height={280}>
          {chartType === 'area' ? (
            <AreaChart data={placementTrend}>
              <defs>
                <linearGradient id="colorPlaced" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00A3FF" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00A3FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDrives" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F5A623" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#F5A623" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Area type="monotone" dataKey="placed" name="Placed" stroke="#00A3FF" strokeWidth={2.5} fill="url(#colorPlaced)" />
              <Area type="monotone" dataKey="drives" name="Applications" stroke="#F5A623" strokeWidth={2.5} fill="url(#colorDrives)" />
            </AreaChart>
          ) : (
            <BarChart data={placementTrend} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="placed" name="Placed" fill="#00A3FF" radius={[6, 6, 0, 0]} />
              <Bar dataKey="drives" name="Applications" fill="#F5A623" radius={[6, 6, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Peak Month Info */}
      {peakMonth.month && (
        <div className="pt-4 border-t border-white/10">
          <p className="text-white/50 text-xs font-body mb-2">Peak Performance</p>
          <p className="text-sm font-medium text-white">
            <span className="text-gold">{peakMonth.month}</span> had the highest placements:{' '}
            <span className="text-blue-electric font-bold">{peakMonth.placed}</span> students placed
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: res } = await getAdminAnalytics();
        setData(res);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = data?.stats || { students: 0, placed: 0, jobs: 0, companies: 0 };
  const placementTrend = (data?.placementTrend || []).map((t) => ({ month: t.month?.slice(5) || t.month, placed: t.placed, drives: t.applications }));
  const branchData = (data?.byBranch || []).slice(0, 6).map((b) => ({ branch: b.branch?.slice(0, 8), placed: b.placed, total: b.total }));
  const packageDist = data?.packageDist || [];
  const recentActivity = data?.recentActivity || [];
  const placementRate = stats.students ? Math.round((stats.placed / stats.students) * 100) : 0;

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Students" value={stats.students.toLocaleString()} sub="↑ 12% this month" color="bg-blue-electric/20" delay={0} />
          <StatCard icon={CheckCircle2} label="Students Placed" value={stats.placed.toLocaleString()} sub={`${placementRate}% placement rate`} color="bg-green-500/20" delay={0.1} />
          <StatCard icon={Briefcase} label="Active Drives" value={stats.jobs} sub={data ? 'Live job pipeline' : 'Loading live data'} color="bg-gold/20" delay={0.2} />
          <StatCard icon={Building2} label="Companies" value={stats.companies} sub={data ? 'Live recruiter records' : 'Loading live data'} color="bg-purple-500/20" delay={0.3} />
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Placement Trend */}
          <PlacementTrendChart placementTrend={placementTrend} />

          {/* Package Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-5"
          >
            <p className="section-title mb-1">Package Distribution</p>
            <p className="text-white/40 text-xs font-body mb-5">By CTC range</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={packageDist} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {packageDist.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {packageDist.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-white/50 text-xs font-body">{d.name}</span>
                  </div>
                  <span className="text-white/70 text-xs font-mono">{d.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Branch-wise */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card p-5 lg:col-span-2"
          >
            <p className="section-title mb-1">Branch-wise Placement</p>
            <p className="text-white/40 text-xs font-body mb-5">Placed vs Total students</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={branchData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="branch" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="placed" name="Placed" fill="#00A3FF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="total" name="Total" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Recent Activity — LIVE from systemActivity collection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="glass-card p-5"
          >
            <div className="flex items-center gap-2 mb-5">
              <Activity size={16} className="text-blue-electric" />
              <p className="section-title">Recent Activity</p>
            </div>
            <div className="space-y-4">
              {recentActivity.length === 0 && !loading && (
                <p className="text-white/30 text-xs font-body">No activity recorded yet.</p>
              )}
              {recentActivity.map((a, i) => {
                const colorClass = ACTIVITY_COLORS[a.type] || ACTIVITY_COLORS.default;
                return (
                  <motion.div
                    key={a.id || i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8 + i * 0.08 }}
                    className="flex gap-3"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${colorClass}`} />
                    <div>
                      <p className="text-white/70 text-xs font-body leading-relaxed">{formatActivityText(a)}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock size={10} className="text-white/30" />
                        <span className="text-white/30 text-xs">{timeAgo(a.createdAt)}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
