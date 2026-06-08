// src/pages/admin/Dashboard.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Briefcase, Activity, Building2, Clock, CheckCircle2 } from 'lucide-react';
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

function StatCard({ icon: Icon, label, value, sub, color, delay, sparklineData, sparklineColor }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="stat-card relative overflow-hidden group"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color} relative z-10`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="relative z-10 flex-grow">
        <p className="text-white/50 text-xs font-body mb-1">{label}</p>
        <p className="font-heading font-bold text-2xl text-white">{value}</p>
        {sub && <p className="text-white/40 text-xs font-body mt-0.5">{sub}</p>}
      </div>
      {sparklineData && (
        <div className="absolute right-0 bottom-0 w-24 h-16 opacity-30 group-hover:opacity-60 transition-opacity duration-300">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <Area type="monotone" dataKey="val" stroke={sparklineColor} fill={sparklineColor} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-4 border border-white/20 text-xs font-body bg-[#0A0F1C]/95 shadow-2xl rounded-xl backdrop-blur-xl">
      <p className="text-white/70 font-semibold mb-3 uppercase tracking-wider">{label}</p>
      <div className="space-y-2">
        {payload.map((p) => {
          const displayColor = p.color === '#00A3FF' ? '#00D9FF' : p.color === '#F5A623' ? '#FFB84D' : p.color || '#fff';
          return (
            <div key={p.name} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shadow-sm" style={{ background: displayColor, boxShadow: `0 0 8px ${displayColor}` }} />
                <span className="text-white/80 font-medium">{p.name}</span>
              </div>
              <span className="font-bold text-white font-mono">{p.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PlacementTrendChart = ({ placementTrend, selectedYear, setSelectedYear }) => {
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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="section-title">Placement Trend</p>
          <p className="text-white/40 text-xs font-body mt-0.5">Monthly placements & drives — 2024-25</p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            className="input-field py-1.5 px-3 text-xs w-28 appearance-none border border-white/10"
          >
            <option value="" className="bg-dark-800 text-white">All Years</option>
            <option value="2024" className="bg-dark-800 text-white">2024</option>
            <option value="2025" className="bg-dark-800 text-white">2025</option>
            <option value="2026" className="bg-dark-800 text-white">2026</option>
          </select>
          <div className="h-6 w-px bg-white/10 mx-1"></div>
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
            <AreaChart data={placementTrend} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
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
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, dy: 10 }} axisLine={true} tickLine={false} label={{ value: 'Month', position: 'insideBottom', offset: -25, fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, dx: -5 }} axisLine={true} tickLine={false} width={60} label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: 15, fill: 'rgba(255,255,255,0.5)', fontSize: 12, style: { textAnchor: 'middle' } }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Area type="monotone" dataKey="placed" name="Placed" stroke="#00A3FF" strokeWidth={2.5} fill="url(#colorPlaced)" />
              <Area type="monotone" dataKey="drives" name="Applications" stroke="#F5A623" strokeWidth={2.5} fill="url(#colorDrives)" />
            </AreaChart>
          ) : (
            <BarChart data={placementTrend} barGap={8} margin={{ top: 20, right: 30, left: 20, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, dy: 10 }} axisLine={true} tickLine={false} label={{ value: 'Month', position: 'insideBottom', offset: -25, fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12, dx: -5 }} axisLine={true} tickLine={false} width={60} label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: 15, fill: 'rgba(255,255,255,0.5)', fontSize: 12, style: { textAnchor: 'middle' } }} />
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
  const [selectedYear, setSelectedYear] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const { data: res } = await getAdminAnalytics(selectedYear ? { year: selectedYear } : {});
        if (isMounted) setData(res);
      } catch {
        if (isMounted) setData(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchData(); // Initial load
    const interval = setInterval(fetchData, 5000); // Poll every 5s for real-time feel
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedYear]);

  const stats = data?.stats || { students: 0, placed: 0, jobs: 0, companies: 0 };
  const placementTrend = (data?.placementTrend || []).map((t) => {
    let m = t.month?.slice(5) || t.month;
    if (t.month && t.month.length >= 7) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(t.month.slice(5, 7)) - 1;
      if (mIdx >= 0 && mIdx <= 11) m = monthNames[mIdx];
    }
    return { month: m, placed: t.placed, drives: t.applications };
  });
  const branchData = (data?.byBranch || []).slice(0, 6).map((b) => ({ branch: b.branch, placed: b.placed, total: b.total }));
  const packageDist = data?.packageDist || [];
  const recentActivity = data?.recentActivity || [];
  const yearWisePlacement = data?.yearWisePlacement || [];
  const placementRate = stats.students ? Math.round((stats.placed / stats.students) * 100) : 0;

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-6">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-xl font-heading text-white">Overview</h2>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Students" value={stats.students.toLocaleString()} sub="↑ 12% this month" color="bg-blue-electric/20" delay={0} sparklineData={[{val: 10}, {val: 25}, {val: 20}, {val: 45}, {val: 40}, {val: 60}]} sparklineColor="#00A3FF" />
          <StatCard icon={CheckCircle2} label="Students Placed" value={stats.placed.toLocaleString()} sub={`${placementRate}% placement rate`} color="bg-green-500/20" delay={0.1} sparklineData={[{val: 5}, {val: 15}, {val: 10}, {val: 35}, {val: 30}, {val: 50}]} sparklineColor="#22C55E" />
          <StatCard icon={Briefcase} label="Active Drives" value={stats.jobs} sub={data ? 'Live job pipeline' : 'Loading live data'} color="bg-gold/20" delay={0.2} sparklineData={[{val: 40}, {val: 30}, {val: 45}, {val: 25}, {val: 35}, {val: 20}]} sparklineColor="#F5A623" />
          <StatCard icon={Building2} label="Companies" value={stats.companies} sub={data ? 'Live recruiter records' : 'Loading live data'} color="bg-purple-500/20" delay={0.3} sparklineData={[{val: 10}, {val: 20}, {val: 15}, {val: 30}, {val: 45}, {val: 60}]} sparklineColor="#A855F7" />
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Placement Trend */}
          <PlacementTrendChart placementTrend={placementTrend} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />

          {/* Package Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-5 relative"
          >
            <p className="section-title mb-1">Package Distribution</p>
            <p className="text-white/40 text-xs font-body mb-5">By CTC range</p>
            <div className="relative h-[200px] flex-1">
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-heading font-bold text-white">{packageDist.reduce((a, b) => a + b.value, 0)}</span>
                <span className="text-white/40 text-[10px] uppercase tracking-wider mt-1">Total Offers</span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={packageDist} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={6} dataKey="value" stroke="none" cornerRadius={6}>
                    {packageDist.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 mt-5">
              {packageDist.map((d, i) => {
                const total = packageDist.reduce((a, b) => a + b.value, 0);
                const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                return (
                  <div key={d.name} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full transition-transform group-hover:scale-125" style={{ background: COLORS[i % COLORS.length], boxShadow: `0 0 10px ${COLORS[i % COLORS.length]}80` }} />
                      <span className="text-white/70 text-sm font-body group-hover:text-white transition-colors">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-white/40 text-xs font-mono">{pct}%</span>
                      <span className="text-white font-mono font-semibold">{d.value}</span>
                    </div>
                  </div>
                );
              })}
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
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={branchData} layout="vertical" barGap={4} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11, dy: 5 }} axisLine={true} tickLine={false} label={{ value: 'Number of Students', position: 'insideBottom', offset: -25, fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                <YAxis dataKey="branch" type="category" width={180} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 500 }} axisLine={true} tickLine={false} label={{ value: 'Department', angle: -90, position: 'insideLeft', offset: 15, fill: 'rgba(255,255,255,0.5)', fontSize: 12, style: { textAnchor: 'middle' } }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="placed" name="Placed" fill="#00A3FF" radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="total" name="Total" fill="rgba(255,255,255,0.1)" radius={[0, 4, 4, 0]} barSize={12} />
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
