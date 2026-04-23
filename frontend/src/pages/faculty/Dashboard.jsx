// src/pages/faculty/Dashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, CheckCircle, AlertCircle, ClipboardList } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardLayout from '../../components/common/DashboardLayout';
import StudentInsightsModal from '../../components/common/StudentInsightsModal';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

const STATUS_CLASS = {
  placed: 'badge-green',
  'in-process': 'badge-blue',
  unplaced: 'badge-red',
};

const DEPARTMENT_ALIASES = {
  'computer science': ['computer science', 'cse', 'cs', 'computer science and engineering'],
  'information technology': ['information technology', 'it'],
  'electronics & communication': ['electronics & communication', 'electronics and communication', 'ece', 'ec'],
  mechanical: ['mechanical', 'mech', 'mechanical engineering'],
  civil: ['civil', 'civil engineering'],
  electrical: ['electrical', 'ee', 'electrical engineering'],
  'artificial intelligence & machine learning': ['artificial intelligence & machine learning', 'ai & ml', 'aiml', 'aiml engineering'],
  'data science': ['data science'],
  'aerospace engineering': ['aerospace engineering'],
  biotechnology: ['biotechnology', 'biotech'],
  'robotics and automation': ['robotics and automation', 'robotics'],
};

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function matchesDepartment(branch, department) {
  if (!department) return true;
  const normalizedBranch = normalizeText(branch);
  const normalizedDepartment = normalizeText(department);
  const aliases = Object.entries(DEPARTMENT_ALIASES).find(([, values]) => values.includes(normalizedDepartment));
  if (aliases) {
    return aliases[1].some((alias) => normalizedBranch.includes(normalizeText(alias)));
  }
  return normalizedBranch.includes(normalizedDepartment) || normalizedDepartment.includes(normalizedBranch);
}

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
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [jobsById, setJobsById] = useState({});
  const [interviews, setInterviews] = useState([]);
  const [placementActivitiesCount, setPlacementActivitiesCount] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [studentsSnap, verificationsSnap, appsSnap, jobsSnap, interviewsSnap, activitiesSnap] = await Promise.all([
          getDocs(collection(db, 'students')),
          getDocs(collection(db, 'verifications')),
          getDocs(collection(db, 'applications')),
          getDocs(collection(db, 'jobs')),
          getDocs(collection(db, 'interviews')),
          getDocs(collection(db, 'placementActivities')),
        ]);
        const data = studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const apps = appsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const jobs = jobsSnap.docs.reduce((acc, d) => {
          acc[d.id] = d.data();
          return acc;
        }, {});
        const interviewData = interviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setStudents(data);
        setApplications(apps);
        setJobsById(jobs);
        setInterviews(interviewData);
        setPlacementActivitiesCount(activitiesSnap.size || 0);
        setPendingVerifications(
          verificationsSnap.docs.filter((d) => (d.data()?.status || 'pending') === 'pending').length
        );
      } catch {
        setStudents([]);
        setApplications([]);
        setJobsById({});
        setInterviews([]);
        setPlacementActivitiesCount(0);
        setPendingVerifications(0);
      }
    };
    load();
  }, []);

  const deptStudents = useMemo(() => {
    const dept = userProfile?.department;
    const source = dept ? students.filter((s) => matchesDepartment(s.branch, dept)) : students;
    const fallback = !source.length && dept ? students : source;
    return fallback.map((s) => ({
      id: s.id,
      rollNo: s.rollNo || 'N/A',
      name: s.name || 'Student',
      cgpa: Number(s.cgpa || 0),
      status: (s.placementStatus || 'unplaced').toLowerCase(),
      company: s.company || '—',
    }));
  }, [students, userProfile?.department]);

  const cgpaDistribution = useMemo(() => {
    const ranges = [
      { range: '< 6.5', min: 0, max: 6.5 },
      { range: '6.5-7.5', min: 6.5, max: 7.5 },
      { range: '7.5-8.5', min: 7.5, max: 8.5 },
      { range: '8.5-9.5', min: 8.5, max: 9.5 },
      { range: '> 9.5', min: 9.5, max: 20 },
    ];
    return ranges.map((r) => ({
      range: r.range,
      count: deptStudents.filter((s) => s.cgpa >= r.min && s.cgpa < r.max).length,
    }));
  }, [deptStudents]);

  const stats = useMemo(() => ({
    total: deptStudents.length,
    placed: deptStudents.filter((s) => s.status === 'placed').length,
    inProcess: deptStudents.filter((s) => s.status === 'in-process').length,
    unplaced: deptStudents.filter((s) => s.status === 'unplaced').length,
  }), [deptStudents]);

  const selectedDepartment = userProfile?.department || 'All Departments';
  const departmentMatchNote = userProfile?.department && deptStudents.length === students.length
    ? 'No exact department match found, showing all students.'
    : null;

  const normalizeStatus = (value) => String(value || '').toLowerCase();

  const getStudentInsights = (student) => {
    if (!student) return null;

    const studentKeys = [student.id, student.rollNo, student.email].filter(Boolean).map((v) => String(v).toLowerCase());
    const matchesStudent = (item) => {
      const candidates = [item.studentId, item.rollNo, item.email, item.studentEmail].filter(Boolean).map((v) => String(v).toLowerCase());
      return candidates.some((v) => studentKeys.includes(v));
    };

    const studentApps = applications.filter(matchesStudent);
    const offerStatuses = new Set(['selected', 'offered', 'offer', 'placed']);
    const offerApps = studentApps.filter((a) => offerStatuses.has(normalizeStatus(a.status)));

    const companies = Array.from(new Set(offerApps.map((a) => jobsById[a.jobId]?.company || a.company).filter(Boolean)));
    const packages = Array.from(new Set(offerApps.map((a) => jobsById[a.jobId]?.ctc || a.package || a.ctc).filter(Boolean)));
    const studentInterviews = interviews.filter(matchesStudent);
    const latestInterview = studentInterviews[0] || null;
    const interviewExperience = student.interviewExperience
      || latestInterview?.feedback
      || latestInterview?.notes
      || latestInterview?.experience
      || 'No interview experience submitted yet.';

    const suggestions = Array.isArray(student.improvementSuggestions)
      ? student.improvementSuggestions
      : String(student.improvementSuggestions || '').split('\n').map((s) => s.trim()).filter(Boolean);

    const autoSuggestions = [];
    if (!suggestions.length) {
      if (Number(student.cgpa || 0) < 7.5) autoSuggestions.push('Focus on improving core fundamentals and maintain a semester-wise CGPA improvement plan.');
      if ((Array.isArray(student.skills) ? student.skills.length : String(student.skills || '').split(',').filter(Boolean).length) < 4) {
        autoSuggestions.push('Add 2-3 role-focused technical skills and build project proofs for each.');
      }
      if ((student.placementStatus || 'unplaced') !== 'placed') {
        autoSuggestions.push('Practice mock interviews weekly and apply consistently to role-matched openings.');
      }
      if (!autoSuggestions.length) autoSuggestions.push('Keep improving communication clarity and system design depth for higher package opportunities.');
    }

    const offersCount = offerApps.length;
    const placementsCount = Math.max((student.placementStatus === 'placed' ? 1 : 0), offersCount);

    return {
      applicationsCount: studentApps.length,
      offersCount,
      placementsCount,
      companyText: companies.length ? companies.join(', ') : (student.company || 'N/A'),
      packageText: packages.length ? packages.join(', ') : (student.ctc || 'N/A'),
      interviewCount: studentInterviews.length,
      interviewExperience,
      suggestions: suggestions.length ? suggestions : autoSuggestions,
      skillsText: Array.isArray(student.skills) ? student.skills.join(', ') : (student.skills || 'N/A'),
      activityParticipationCount: Number(student.activityParticipationCount || 0),
      activityMissedCount: Number(student.activityMissedCount || 0),
      activityWarningsCount: Number(student.activityWarningsCount || 0),
      placementActivityBlocked: Boolean(student.placementActivityBlocked),
      offerSummary: offersCount
        ? `${offersCount} offer(s) tracked across ${Math.max(1, companies.length)} compan${companies.length === 1 ? 'y' : 'ies'}.`
        : 'No confirmed offers yet. Student is currently in preparation/application stage.',
    };
  };

  return (
    <DashboardLayout title="Faculty Dashboard">
      <div className="space-y-5">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass-card p-5 border border-purple-500/20"
          style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(0,163,255,0.05))' }}>
          <h2 className="font-heading font-bold text-xl text-white">Welcome, {userProfile?.name || 'Faculty'}</h2>
          <p className="text-white/40 text-sm font-body mt-1">Department: {selectedDepartment}</p>
          {departmentMatchNote && <p className="text-gold text-xs font-body mt-1">{departmentMatchNote}</p>}
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Dept Students', value: stats.total, color: 'text-white' },
            { label: 'Placed', value: stats.placed, color: 'text-green-400' },
            { label: 'In Process', value: stats.inProcess, color: 'text-blue-electric' },
            { label: 'Unplaced', value: stats.unplaced, color: 'text-red-400' },
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
                {deptStudents.slice(0, 10).map((s, i) => (
                  <motion.tr key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.07 }} className="table-row cursor-pointer"
                    onClick={() => setSelectedStudent(s)}>
                    <td className="px-4 py-3 font-mono text-xs text-white/50">{s.rollNo}</td>
                    <td className="px-4 py-3 text-white text-sm">{s.name}</td>
                    <td className="px-4 py-3 font-mono text-gold text-sm">{s.cgpa}</td>
                    <td className="px-4 py-3"><span className={STATUS_CLASS[s.status]}>{s.status}</span></td>
                    <td className="px-4 py-3 text-white/50 text-sm font-body">{s.company}</td>
                  </motion.tr>
                ))}
                {deptStudents.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-white/40 text-sm font-body">No department students found.</td>
                  </tr>
                )}
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
                { label: 'Verify Pending Student Data', icon: CheckCircle, color: 'text-green-400', action: () => navigate('/faculty/verification') },
                { label: 'Placement Activities', icon: ClipboardList, color: 'text-blue-electric', count: placementActivitiesCount, action: () => navigate('/faculty/activities') },
                {
                  label: 'Students Needing Attention',
                  icon: AlertCircle,
                  color: 'text-gold',
                  count: pendingVerifications || deptStudents.filter((s) => s.status !== 'placed' || s.cgpa < 7.5).length,
                  action: () => navigate('/faculty/verification'),
                },
              ].map((a) => (
                <button key={a.label}
                  onClick={a.action}
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

      <StudentInsightsModal
        open={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        student={selectedStudent}
        insights={getStudentInsights(selectedStudent)}
      />
    </DashboardLayout>
  );
}
