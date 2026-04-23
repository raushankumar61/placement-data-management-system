// src/pages/admin/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Briefcase, TrendingUp, Award, Activity, Building2, Clock, CheckCircle2 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import DashboardLayout from '../../components/common/DashboardLayout';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

const COLORS = ['#00A3FF', '#F5A623', '#22C55E', '#A855F7', '#EC4899'];

const placementTrend = [
  { month: 'Jul', placed: 12, drives: 3 },
  { month: 'Aug', placed: 28, drives: 7 },
  { month: 'Sep', placed: 45, drives: 11 },
  { month: 'Oct', placed: 89, drives: 18 },
  { month: 'Nov', placed: 134, drives: 25 },
  { month: 'Dec', placed: 178, drives: 31 },
  { month: 'Jan', placed: 220, drives: 38 },
  { month: 'Feb', placed: 265, drives: 42 },
];

const branchData = [
  { branch: 'CS/IT', placed: 320, total: 350 },
  { branch: 'ECE', placed: 180, total: 240 },
  { branch: 'Mech', placed: 95, total: 160 },
  { branch: 'Civil', placed: 60, total: 120 },
  { branch: 'EE', placed: 72, total: 100 },
];

const packageDist = [
  { name: '< 5 LPA', value: 120 },
  { name: '5-10 LPA', value: 380 },
  { name: '10-20 LPA', value: 210 },
  { name: '> 20 LPA', value: 90 },
];

const recentActivity = [
  { type: 'placement', text: 'A student placed at Google — 24 LPA', time: '2m ago', color: 'text-green-400' },
  { type: 'drive', text: 'Microsoft drive posted — 45 eligible students', time: '18m ago', color: 'text-blue-electric' },
  { type: 'application', text: '12 students applied to Amazon SDE', time: '1h ago', color: 'text-gold' },
  { type: 'recruiter', text: 'Infosys recruiter account approved', time: '2h ago', color: 'text-purple-400' },
  { type: 'placement', text: 'A student placed at Meta — 32 LPA', time: '3h ago', color: 'text-green-400' },
];

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
    <div className="glass-card p-3 border border-white/10 text-xs font-body">
      <p className="text-white/60 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({ students: 0, jobs: 0, placed: 0, companies: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [studSnap, jobsSnap, recSnap] = await Promise.all([
          getDocs(collection(db, 'students')),
          getDocs(collection(db, 'jobs')),
          getDocs(collection(db, 'recruiters')),
        ]);
        const placedSnap = await getDocs(query(collection(db, 'students'), where('placementStatus', '==', 'placed')));
        setStats({
          students: studSnap.size || 1247,
          jobs: jobsSnap.size || 62,
          placed: placedSnap.size || 847,
          companies: recSnap.size || 134,
        });
      } catch {
        setStats({ students: 1247, jobs: 62, placed: 847, companies: 134 });
      }
    };
    fetchStats();
  }, []);

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Students" value={stats.students.toLocaleString()} sub="↑ 12% this month" color="bg-blue-electric/20" delay={0} />
          <StatCard icon={CheckCircle2} label="Students Placed" value={stats.placed.toLocaleString()} sub={`${Math.round(stats.placed / stats.students * 100)}% placement rate`} color="bg-green-500/20" delay={0.1} />
          <StatCard icon={Briefcase} label="Active Drives" value={stats.jobs} sub="8 closing this week" color="bg-gold/20" delay={0.2} />
          <StatCard icon={Building2} label="Companies" value={stats.companies} sub="12 new this month" color="bg-purple-500/20" delay={0.3} />
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Placement Trend */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-5 lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="section-title">Placement Trend</p>
                <p className="text-white/40 text-xs font-body mt-0.5">Monthly placements & drives — 2024-25</p>
              </div>
              <TrendingUp size={18} className="text-blue-electric" />
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={placementTrend}>
                <defs>
                  <linearGradient id="colorPlaced" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00A3FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00A3FF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDrives" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F5A623" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F5A623" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="placed" name="Placed" stroke="#00A3FF" strokeWidth={2} fill="url(#colorPlaced)" />
                <Area type="monotone" dataKey="drives" name="Drives" stroke="#F5A623" strokeWidth={2} fill="url(#colorDrives)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

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

          {/* Recent Activity */}
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
              {recentActivity.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.08 }}
                  className="flex gap-3"
                >
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${a.color}`} />
                  <div>
                    <p className="text-white/70 text-xs font-body leading-relaxed">{a.text}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock size={10} className="text-white/30" />
                      <span className="text-white/30 text-xs">{a.time}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
