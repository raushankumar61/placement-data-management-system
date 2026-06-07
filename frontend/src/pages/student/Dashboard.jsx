// src/pages/student/Dashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Briefcase, CheckCircle, Clock, ArrowRight, Bell } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { fillStudentDefaults } from '../../utils/studentDefaults';
import { getApplications, getInterviews, getJobs, getStudent } from '../../services/api';

const STATUS_CLASS = { Shortlisted: 'badge-blue', Applied: 'badge-gray', Selected: 'badge-green', Rejected: 'badge-red' };
const PLACEMENT_STATUSES = new Set(['selected', 'placed', 'offer', 'offered']);

const normalize = (value) => String(value || '').trim().toLowerCase();

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value === 'string') return new Date(value).getTime() || 0;
  if (value?.toDate) return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return 0;
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value?.toDate) return value.toDate().toLocaleDateString();
  if (value instanceof Date) return value.toLocaleDateString();
  return 'N/A';
};

const getDisplayStatus = (status) => {
  const value = normalize(status);
  if (['selected', 'placed', 'offer'].includes(value)) return 'Selected';
  if (value === 'shortlisted') return 'Shortlisted';
  if (value === 'rejected') return 'Rejected';
  return 'Applied';
};

export default function StudentDashboard() {
  const { user, userProfile } = useAuth();
  const [student, setStudent] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);

  useEffect(() => {
    if (!user?.uid) return undefined;

    let active = true;

    const load = async () => {
      try {
        const [studentRes, jobsRes, applicationsRes, interviewsRes] = await Promise.all([
          getStudent(user.uid).catch(() => ({ data: {} })),
          getJobs().catch(() => ({ data: { jobs: [] } })),
          getApplications({ studentId: user.uid }).catch(() => ({ data: { applications: [] } })),
          getInterviews({ studentId: user.uid }).catch(() => ({ data: { interviews: [] } })),
        ]);

        if (!active) return;

        const studentData = studentRes.data?.student || studentRes.data || {};
        
        // Ensure we don't accidentally set a 0 CGPA if the document is empty or missing
        const fallbackStudent = fillStudentDefaults({
          name: userProfile?.name || '',
          email: userProfile?.email || user?.email || '',
          branch: userProfile?.branch || userProfile?.department || '',
          ...studentData,
        }, user.uid);
        
        // If the backend explicitly returned a valid student but it had 0 CGPA, keep it. 
        // Otherwise, use the fallback.
        if (studentData.id && studentData.cgpa === 0) {
          fallbackStudent.cgpa = 0;
        }

        setStudent(fallbackStudent);
        setJobs(jobsRes.data?.jobs || []);
        setApplications(applicationsRes.data?.applications || []);
        setInterviews(interviewsRes.data?.interviews || []);
      } catch {
        if (!active) return;
        setStudent(fillStudentDefaults({
          name: userProfile?.name || '',
          email: userProfile?.email || user?.email || '',
          branch: userProfile?.branch || userProfile?.department || '',
        }, user.uid));
        setJobs([]);
        setApplications([]);
        setInterviews([]);
      }
    };

    load();
    return () => { active = false; };
  }, [user?.uid, user?.email, userProfile?.name, userProfile?.email, userProfile?.branch, userProfile?.department]);

  const branch = student?.branch || userProfile?.department || '';
  const cgpa = Number(student?.cgpa || 0);
  const activeJobs = useMemo(() => jobs.filter((job) => normalize(job.status) !== 'closed'), [jobs]);

  const recentApplications = useMemo(() => [...applications]
    .sort((a, b) => toMillis(b.appliedAt || b.createdAt) - toMillis(a.appliedAt || a.createdAt))
    .slice(0, 3)
    .map((app) => {
      const job = jobs.find((item) => item.id === app.jobId) || {};
      return {
        company: job.company || app.company || 'N/A',
        role: job.title || app.role || 'N/A',
        status: getDisplayStatus(app.status),
        date: formatDate(app.appliedAt || app.createdAt),
        source: app.source || 'Campus Drive',
        round: app.round || 'Screening',
      };
    }), [applications, jobs]);

  const upcomingInterviews = useMemo(() => [...interviews]
    .filter((interview) => normalize(interview.status) !== 'completed')
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    .slice(0, 2)
    .map((interview) => ({
      company: interview.company || 'Company',
      role: interview.role || 'Role',
      date: formatDate(interview.date),
      time: interview.time || 'TBD',
      mode: interview.mode || 'Online',
      round: interview.round || 'Interview',
    })), [interviews]);

  const notifications = useMemo(() => {
    const items = [];
    if (upcomingInterviews[0]) {
      items.push({ text: `${upcomingInterviews[0].company} ${upcomingInterviews[0].round} is coming up.`, time: 'Live', type: 'interview' });
    }
    if (recentApplications[0]) {
      items.push({ text: `Your application at ${recentApplications[0].company} is ${recentApplications[0].status.toLowerCase()}.`, time: 'Live', type: 'job' });
    }
    if (activeJobs.length) {
      items.push({ text: `${activeJobs.length} jobs are active right now.`, time: 'Live', type: 'deadline' });
    }
    return items.slice(0, 3);
  }, [activeJobs.length, recentApplications, upcomingInterviews]);

  const shortlistedCount = applications.filter((app) => ['shortlisted', 'selected', 'offer', 'placed'].includes(normalize(app.status))).length;
  const placementHistory = applications
    .filter((app) => PLACEMENT_STATUSES.has(normalize(app.status)))
    .sort((a, b) => toMillis(b.updatedAt || b.appliedAt || b.createdAt) - toMillis(a.updatedAt || a.appliedAt || a.createdAt))
    .slice(0, 5)
    .map((app) => {
      const job = jobs.find((item) => item.id === app.jobId) || {};
      return {
        company: job.company || app.company || 'N/A',
        role: job.title || app.role || 'N/A',
        status: getDisplayStatus(app.status),
        date: formatDate(app.updatedAt || app.appliedAt || app.createdAt),
      };
    });

  return (
    <DashboardLayout title="Student Dashboard">
      <div className="space-y-5">
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
              
              <div className="mt-4 flex flex-wrap gap-3">
                {normalize(student?.placementStatus) === 'placed' || placementHistory.length > 0 ? (
                  <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-2 rounded-xl flex items-center gap-2 font-semibold text-sm shadow-lg shadow-green-500/5">
                    <CheckCircle size={16} /> Placed
                    {placementHistory[0] && (
                      <span className="text-white/70 font-body border-l border-white/10 pl-2 ml-1">
                        at <span className="text-white">{placementHistory[0].company}</span> as <span className="text-white">{placementHistory[0].role}</span>
                      </span>
                    )}
                    {student?.currentPackage && (
                      <span className="text-white/70 font-body border-l border-white/10 pl-2 ml-1">
                        CTC: <span className="text-white">{student.currentPackage}</span>
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="bg-gold/10 border border-gold/20 text-gold px-4 py-2 rounded-xl flex items-center gap-2 font-semibold text-sm shadow-lg shadow-gold/5">
                    <Clock size={16} /> Actively Looking for Placement
                    <span className="text-white/70 font-body border-l border-white/10 pl-2 ml-1 text-xs">
                      Current CGPA: <span className="text-white">{cgpa}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Link to="/student/jobs">
              <button className="btn-primary text-sm py-2.5 flex items-center gap-2">
                Browse {activeJobs.length} Jobs <ArrowRight size={14} />
              </button>
            </Link>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Applications', value: applications.length, icon: FileText, color: 'text-blue-electric', bg: 'bg-blue-electric/10' },
            { label: 'Shortlisted', value: shortlistedCount, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Interviews', value: interviews.length, icon: Clock, color: 'text-gold', bg: 'bg-gold/10' },
            { label: 'Jobs Available', value: activeJobs.length, icon: Briefcase, color: 'text-purple-400', bg: 'bg-purple-500/10' },
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
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <p className="section-title">Upcoming Interviews</p>
              <Link to="/student/applications" className="text-blue-electric text-xs font-body hover:underline">View all</Link>
            </div>
            {upcomingInterviews.map((iv, i) => (
              <motion.div key={`${iv.company}-${iv.role}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
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
            {!upcomingInterviews.length && (
              <div className="glass-card p-6 border border-white/5 text-white/40 text-sm font-body">
                No upcoming interviews right now.
              </div>
            )}

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
                    <motion.tr key={`${app.company}-${app.role}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 + i * 0.06 }} className="table-row">
                      <td className="px-4 py-3 text-white text-sm font-medium">{app.company}</td>
                      <td className="px-4 py-3 text-white/60 text-sm font-body">{app.role}</td>
                      <td className="px-4 py-3 text-white/40 text-xs font-body">{app.date}</td>
                      <td className="px-4 py-3"><span className={STATUS_CLASS[app.status] || 'badge-gray'}>{app.status}</span></td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {!recentApplications.length && (
                <div className="px-4 py-6 text-white/40 text-sm font-body">No applications found yet.</div>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              <p className="section-title">Placement History</p>
            </div>
            <div className="glass-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Company', 'Role', 'Updated', 'Status'].map((h) => (
                      <th key={h} className="table-header text-left px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {placementHistory.map((item, i) => (
                    <motion.tr key={`${item.company}-${item.role}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 + i * 0.06 }} className="table-row">
                      <td className="px-4 py-3 text-white text-sm font-medium">{item.company}</td>
                      <td className="px-4 py-3 text-white/60 text-sm font-body">{item.role}</td>
                      <td className="px-4 py-3 text-white/40 text-xs font-body">{item.date}</td>
                      <td className="px-4 py-3"><span className={STATUS_CLASS[item.status] || 'badge-gray'}>{item.status}</span></td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {!placementHistory.length && (
                <div className="px-4 py-6 text-white/40 text-sm font-body">No placement history found yet.</div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-blue-electric" />
              <p className="section-title">Notifications</p>
            </div>
            <div className="space-y-3">
              {notifications.map((n, i) => (
                <motion.div key={`${n.type}-${i}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="glass-card p-4 border border-white/5">
                  <p className="text-white/70 text-sm font-body leading-relaxed">{n.text}</p>
                  <p className="text-white/30 text-xs font-body mt-2">{n.time}</p>
                </motion.div>
              ))}
              {!notifications.length && (
                <div className="glass-card p-4 border border-white/5 text-white/40 text-sm font-body">
                  No live notifications yet.
                </div>
              )}
            </div>

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
                  <span className="text-white/40">{branch || 'Profile'} · CGPA {cgpa || 'N/A'}</span>
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
