// src/pages/faculty/Dashboard.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useAuth } from '../../context/AuthContext';

const deptStudents = [
  { name: 'Priya Sharma', cgpa: 9.1, status: 'Placed', company: 'Google', rollNo: '2021CS001' },
  { name: 'Rahul Kumar', cgpa: 8.7, status: 'In Process', company: 'Amazon', rollNo: '2021CS042' },
  { name: 'Anjali Singh', cgpa: 8.3, status: 'Applied', company: '—', rollNo: '2021CS015' },
  { name: 'Amit Patel', cgpa: 7.8, status: 'Unplaced', company: '—', rollNo: '2021CS008' },
  { name: 'Sneha Reddy', cgpa: 8.0, status: 'Placed', company: 'Infosys', rollNo: '2021CS067' },
];

const cgpaDistribution = [
  { range: '< 6.5', count: 12 },
  { range: '6.5-7.5', count: 28 },
  { range: '7.5-8.5', count: 45 },
  { range: '8.5-9.5', count: 31 },
  { range: '> 9.5', count: 8 },
];

const STATUS_CLASS = {
  Placed: 'badge-green', 'In Process': 'badge-blue', Applied: 'badge-gray', Unplaced: 'badge-red',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 border border-white/10 text-xs font-body">
      <p className="text-white/60">{label}: {payload[0].value}</p>
    </div>
  );
};

export default function FacultyDashboard() {
  const { userProfile } = useAuth();

  return (
    <DashboardLayout title="Faculty Dashboard">
      <div className="space-y-5">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass-card p-5 border border-purple-500/20"
          style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(0,163,255,0.05))' }}>
          <h2 className="font-heading font-bold text-xl text-white">Welcome, {userProfile?.name || 'Faculty'}</h2>
          <p className="text-white/40 text-sm font-body mt-1">Department: {userProfile?.department || 'Computer Science'}</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Dept Students', value: 124, color: 'text-white' },
            { label: 'Placed', value: 89, color: 'text-green-400' },
            { label: 'In Process', value: 21, color: 'text-blue-electric' },
            { label: 'Unplaced', value: 14, color: 'text-red-400' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }} className="glass-card p-4">
              <p className="text-white/40 text-xs font-body mb-1">{s.label}</p>
              <p className={`font-heading font-bold text-2xl ${s.color}`}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-5">
          {/* Student Table */}
          <div className="lg:col-span-3 glass-card overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <p className="section-title">Department Students</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Roll No', 'Name', 'CGPA', 'Status', 'Company'].map((h) => (
                    <th key={h} className="table-header text-left px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deptStudents.map((s, i) => (
                  <motion.tr key={s.rollNo} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.07 }} className="table-row">
                    <td className="px-4 py-3 font-mono text-xs text-white/50">{s.rollNo}</td>
                    <td className="px-4 py-3 text-white text-sm">{s.name}</td>
                    <td className="px-4 py-3 font-mono text-gold text-sm">{s.cgpa}</td>
                    <td className="px-4 py-3"><span className={STATUS_CLASS[s.status]}>{s.status}</span></td>
                    <td className="px-4 py-3 text-white/50 text-sm font-body">{s.company}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CGPA Distribution */}
          <div className="lg:col-span-2 glass-card p-5">
            <p className="section-title mb-1">CGPA Distribution</p>
            <p className="text-white/40 text-xs font-body mb-5">Students by CGPA range</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cgpaDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="range" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Students" fill="#A855F7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Quick Actions */}
            <div className="mt-4 space-y-2">
              <p className="text-white/40 text-xs uppercase tracking-wider font-body">Quick Actions</p>
              {[
                { label: 'Verify Pending Student Data', icon: CheckCircle, color: 'text-green-400' },
                { label: 'Students Needing Attention', icon: AlertCircle, color: 'text-gold', count: 4 },
              ].map((a) => (
                <button key={a.label}
                  className="w-full flex items-center gap-2 p-3 rounded-xl border border-white/5 hover:border-white/15 text-left transition-colors">
                  <a.icon size={14} className={a.color} />
                  <span className="text-white/60 text-xs font-body">{a.label}</span>
                  {a.count && <span className="ml-auto badge-gold">{a.count}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
