// src/pages/student/JobBoard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, DollarSign, Calendar, Briefcase, Filter, ExternalLink } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';

const normalize = (value) => String(value || '').trim().toLowerCase();

const branchMatches = (jobBranches, studentBranch) => {
  if (!studentBranch) return true;
  const branches = Array.isArray(jobBranches) ? jobBranches : [];
  if (!branches.length || branches.some((branch) => normalize(branch) === 'all')) return true;
  return branches.some((branch) => normalize(branch).includes(normalize(studentBranch)) || normalize(studentBranch).includes(normalize(branch)));
};

const deadlineToLabel = (deadline) => {
  if (!deadline) return 'TBD';
  if (typeof deadline === 'string') return deadline.slice(0, 10);
  if (deadline?.toDate) return deadline.toDate().toISOString().slice(0, 10);
  return String(deadline);
};

export default function StudentJobBoard() {
  const { user, userProfile } = useAuth();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [jobs, setJobs] = useState([]);
  const [student, setStudent] = useState(null);
  const [applications, setApplications] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!user?.uid) return undefined;

    const studentUnsub = onSnapshot(doc(db, 'students', user.uid), (snap) => {
      setStudent(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    }, () => setStudent(null));

    const jobsUnsub = onSnapshot(collection(db, 'jobs'), (snap) => {
      setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => setJobs([]));

    const appsUnsub = onSnapshot(query(collection(db, 'applications'), where('studentId', '==', user.uid)), (snap) => {
      setApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => setApplications([]));

    return () => {
      studentUnsub();
      jobsUnsub();
      appsUnsub();
    };
  }, [user?.uid]);

  const displayedJobs = useMemo(() => {
    const studentBranch = student?.branch || userProfile?.department || '';
    const studentCgpa = student?.cgpa == null ? 10 : Number(student?.cgpa || 0);
    const appliedJobIds = new Set(applications.map((application) => application.jobId));

    return jobs.map((job) => {
      const minCgpa = Number(job.minCGPA || 0);
      const eligible = (!minCgpa || studentCgpa >= minCgpa) && branchMatches(job.branches, studentBranch) && normalize(job.status) !== 'closed';
      return {
        ...job,
        eligible,
        applied: appliedJobIds.has(job.id),
      };
    });
  }, [applications, jobs, student, userProfile?.department]);

  const filtered = displayedJobs.filter((job) => {
    const title = String(job.title || '').toLowerCase();
    const company = String(job.company || '').toLowerCase();
    const matchSearch = !search || title.includes(search.toLowerCase()) || company.includes(search.toLowerCase());
    const matchType = !typeFilter || job.type === typeFilter;
    return matchSearch && matchType;
  });

  useEffect(() => {
    if (!selectedId && filtered.length) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = useMemo(() => filtered.find((job) => job.id === selectedId) || null, [filtered, selectedId]);

  const applyToJob = async (job) => {
    if (job.applied) {
      toast.error('You already applied to this job');
      return;
    }

    setApplying(true);
    try {
      await addDoc(collection(db, 'applications'), {
        studentId: user?.uid,
        studentEmail: user?.email || userProfile?.email || '',
        jobId: job.id,
        company: job.company,
        role: job.title,
        status: 'Applied',
        appliedAt: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success('Application submitted successfully!');
    } catch {
      toast.error('Unable to submit application');
    } finally {
      setApplying(false);
    }
  };

  const daysLeft = (deadline) => {
    if (!deadline) return null;
    const diff = new Date(deadline) - new Date();
    if (Number.isNaN(diff)) return null;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <DashboardLayout title="Job Board">
      <div className="flex gap-5 h-full">
        <div className="flex-1 space-y-4 min-w-0">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input type="text" placeholder="Search jobs, companies..." value={search}
                onChange={(e) => setSearch(e.target.value)} className="input-field pl-9 py-2 text-sm w-full" />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="input-field py-2 text-sm w-36 appearance-none">
              <option value="">All Types</option>
              {['Full-time', 'Internship', 'PPO', 'Contract'].map((t) => (
                <option key={t} value={t} className="bg-dark-700">{t}</option>
              ))}
            </select>
          </div>

          <p className="text-white/40 text-xs font-body">{filtered.filter((job) => job.eligible).length} eligible jobs found</p>

          <div className="space-y-3">
            {filtered.map((job, i) => (
              <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => setSelectedId(job.id)}
                className={`glass-card p-4 cursor-pointer border transition-all ${
                  selected?.id === job.id ? 'border-blue-electric/50' :
                  !job.eligible ? 'border-white/5 opacity-50' : 'border-white/5 hover:border-white/15'
                }`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-electric/20 to-gold/10 flex items-center justify-center border border-white/10 flex-shrink-0">
                    <span className="font-heading font-bold text-white text-sm">{(job.company || '?')[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-white font-semibold text-sm">{job.title}</p>
                        <p className="text-white/50 text-xs font-body">{job.company}</p>
                      </div>
                      {job.applied && <span className="badge-green text-xs flex-shrink-0">Applied</span>}
                      {!job.eligible && <span className="badge-red text-xs flex-shrink-0">Not Eligible</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <div className="flex items-center gap-1 text-white/40">
                        <MapPin size={11} /><span className="text-xs font-body">{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1 text-white/40">
                        <DollarSign size={11} /><span className="text-xs font-body">{job.ctc}</span>
                      </div>
                      <div className="flex items-center gap-1 text-white/40">
                        <Calendar size={11} />
                        <span className={`text-xs font-body ${daysLeft(job.deadline) !== null && daysLeft(job.deadline) <= 3 ? 'text-red-400' : ''}`}>
                          {daysLeft(job.deadline) !== null ? `${daysLeft(job.deadline)}d left` : 'TBD'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {selected && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="w-80 flex-shrink-0 glass-card p-5 border border-white/10 h-fit sticky top-4 space-y-4">
            <div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-electric/20 to-gold/10 flex items-center justify-center border border-white/10 mb-3">
                <span className="font-heading font-bold text-white text-lg">{(selected.company || '?')[0]}</span>
              </div>
              <h3 className="font-heading font-bold text-white text-lg">{selected.title}</h3>
              <p className="text-blue-electric font-body text-sm font-semibold">{selected.company}</p>
            </div>

            <div className="space-y-2 py-3 border-y border-white/5">
              {[
                { label: 'Location', value: selected.location },
                { label: 'CTC', value: selected.ctc },
                { label: 'Type', value: selected.type },
                { label: 'Openings', value: selected.openings },
                { label: 'Min CGPA', value: selected.minCGPA },
                { label: 'Deadline', value: deadlineToLabel(selected.deadline) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-white/40 font-body">{label}</span>
                  <span className="text-white/80 font-body">{value}</span>
                </div>
              ))}
            </div>

            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider mb-2 font-body">Description</p>
              <p className="text-white/60 text-sm font-body leading-relaxed">{selected.description}</p>
            </div>

            {selected.eligible ? (
              <button
                onClick={() => !selected.applied && applyToJob(selected)}
                disabled={selected.applied || applying}
                className={`w-full py-3 rounded-xl font-heading font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  selected.applied
                    ? 'bg-green-500/20 border border-green-500/30 text-green-400 cursor-default'
                    : 'btn-primary'
                }`}>
                {applying ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : selected.applied ? '✓ Applied' : 'Apply Now'}
              </button>
            ) : (
              <div className="py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-body">
                Not eligible (CGPA requirement: {selected.minCGPA})
              </div>
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}