// src/pages/student/JobBoard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, DollarSign, Calendar } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';
import { addDoc, collection, doc, increment, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';

const normalize = (value) => String(value || '').trim().toLowerCase();

const BRANCH_ALIASES = {
  cse: 'computer science',
  cs: 'computer science',
  'computer science and engineering': 'computer science',
  'computer engineering': 'computer science',
  it: 'information technology',
  ise: 'information technology',
  ece: 'electronics & communication',
  'electronics and communication': 'electronics & communication',
  eee: 'electrical',
  aiml: 'artificial intelligence & machine learning',
  ai: 'artificial intelligence & machine learning',
  ml: 'artificial intelligence & machine learning',
  ds: 'data science',
};

const canonicalBranch = (value) => {
  const base = normalize(value).replace(/[^a-z0-9& ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!base) return '';
  return BRANCH_ALIASES[base] || base;
};

const parseNumber = (value, fallback = 0) => {
  const text = String(value ?? '').trim();
  if (!text) return fallback;
  const match = text.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : fallback;
};

const branchMatches = (jobBranches, studentBranch) => {
  const normalizedStudentBranch = canonicalBranch(studentBranch);
  if (!normalizedStudentBranch) return true;
  const branches = Array.isArray(jobBranches) ? jobBranches : [];
  if (!branches.length || branches.some((branch) => normalize(branch) === 'all')) return true;
  return branches.some((branch) => {
    const normalizedBranch = canonicalBranch(branch);
    return normalizedBranch === normalizedStudentBranch
      || normalizedBranch.includes(normalizedStudentBranch)
      || normalizedStudentBranch.includes(normalizedBranch);
  });
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
    const studentCgpa = student?.cgpa == null ? 10 : parseNumber(student?.cgpa, 0);
    const appliedJobIds = new Set(applications.map((application) => application.jobId));

    return jobs.map((job) => {
      const minCgpa = parseNumber(job.minCGPA, 0);
      const isOpen = normalize(job.status) !== 'closed';
      const meetsCgpa = !minCgpa || studentCgpa >= minCgpa;
      const meetsBranch = branchMatches(job.branches, studentBranch);
      const eligible = isOpen && meetsCgpa && meetsBranch;
      const reason = !isOpen
        ? 'Job is closed'
        : !meetsCgpa
          ? `CGPA requirement: ${job.minCGPA || minCgpa}`
          : !meetsBranch
            ? `Branch mismatch (${studentBranch || 'N/A'})`
            : '';

      return {
        ...job,
        minCgpa,
        meetsCgpa,
        meetsBranch,
        isOpen,
        reason,
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

    if (!user?.uid) {
      toast.error('Please sign in to apply');
      return;
    }

    if (!job.eligible) {
      toast.error(job.reason || 'You are not eligible for this job');
      return;
    }

    setApplying(true);
    try {
      const studentName = student?.name || userProfile?.name || user?.displayName || 'Student';
      const studentEmail = user?.email || userProfile?.email || '';
      const studentRef = doc(db, 'students', user.uid);

      await addDoc(collection(db, 'applications'), {
        studentId: user.uid,
        studentEmail,
        studentName,
        studentBranch: student?.branch || userProfile?.department || '',
        studentCgpa: student?.cgpa ?? '',
        studentRollNo: student?.rollNo || '',
        studentUsn: student?.usn || '',
        jobId: job.id,
        company: job.company,
        role: job.title,
        recruiterId: job.recruiterId || '',
        recruiterName: job.recruiterName || job.company || '',
        source: 'Demo Apply',
        round: 'Screening',
        interviewDate: '',
        expectedCTC: job.ctc || '',
        offeredCTC: '',
        notes: 'Demo application created from the student job board.',
        feedback: '',
        resumeScore: 100,
        status: 'Applied',
        appliedAt: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(studentRef, {
        applicationCount: increment(1),
        latestApplicationCompany: job.company,
        latestApplicationStatus: 'Applied',
        applicationSources: ['Demo Apply'],
        placementStatus: student?.placementStatus === 'placed' ? 'placed' : 'in-process',
        updatedAt: serverTimestamp(),
      }, { merge: true });
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
                { label: 'Mode', value: selected.workMode || 'Onsite' },
                { label: 'Experience', value: selected.experienceLevel || 'Fresher' },
                { label: 'Openings', value: selected.openings },
                { label: 'Min CGPA', value: selected.minCGPA },
                { label: 'Deadline', value: deadlineToLabel(selected.deadline) },
                { label: 'Recruiter', value: selected.recruiterName || selected.company },
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

            {!!selected.perks?.length && (
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-2 font-body">Perks</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.perks.map((perk) => <span key={perk} className="badge-blue text-xs">{perk}</span>)}
                </div>
              </div>
            )}

            {selected.applyLink && (
              <div className="rounded-xl border border-blue-electric/30 bg-blue-electric/10 text-blue-electric text-xs font-body px-3 py-2.5 text-center">
                Demo mode enabled: external apply link is disabled. Use Apply Now.
              </div>
            )}

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
                Not eligible ({selected.reason || `CGPA requirement: ${selected.minCGPA}`})
              </div>
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}