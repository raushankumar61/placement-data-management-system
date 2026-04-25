// src/pages/recruiter/MyJobs.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Users, X, Edit2, EyeOff, CheckCircle,
  Plus, Search, Clock, AlertCircle
} from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { updateJob, closeJob } from '../../services/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { branchMatches } from '../../utils/branchEligibility';

const BRANCHES = ['All', 'Computer Science', 'Information Technology', 'Electronics & Communication', 'Mechanical', 'Civil', 'Electrical'];
const STATUS_BADGE = { active: 'badge-green', closed: 'badge-red', draft: 'badge-gray' };

export default function RecruiterMyJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [editing, setEditing] = useState(null);      // job being edited
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(null);

  // Real-time listener for recruiter's own jobs
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'jobs'), where('postedBy', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user?.uid]);

  const filtered = useMemo(() => jobs.filter((j) => {
    const matchSearch = !search || j.title?.toLowerCase().includes(search.toLowerCase()) || j.company?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || j.status === statusFilter;
    const matchType = !typeFilter || j.type === typeFilter;
    const matchBranch = !branchFilter || branchMatches(j.branches, branchFilter);
    return matchSearch && matchStatus && matchType && matchBranch;
  }), [jobs, search, statusFilter, typeFilter, branchFilter]);

  const branchOptions = useMemo(() => (
    [...new Set(jobs.flatMap((job) => (Array.isArray(job.branches) ? job.branches : [job.branches])).filter(Boolean))]
      .filter((branch) => branch !== 'All')
  ), [jobs]);

  const stats = useMemo(() => ({
    total: jobs.length,
    active: jobs.filter((j) => j.status === 'active').length,
    closed: jobs.filter((j) => j.status === 'closed').length,
    totalApplicants: jobs.reduce((s, j) => s + (Number(j.applicants) || 0), 0),
  }), [jobs]);

  const handleClose = async (jobId) => {
    setClosing(jobId);
    try {
      await closeJob(jobId);
      toast.success('Job closed successfully');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to close job');
    } finally {
      setClosing(null);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await updateJob(editing.id, {
        title: editing.title,
        location: editing.location,
        ctc: editing.ctc,
        type: editing.type,
        minCGPA: editing.minCGPA,
        openings: editing.openings,
        deadline: editing.deadline,
        description: editing.description,
        skills: editing.skills,
        branches: editing.branches,
        process: editing.process,
      });
      toast.success('Job updated');
      setEditing(null);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to update job');
    } finally {
      setSaving(false);
    }
  };

  const toggleBranch = (b) => {
    if (!editing) return;
    if (b === 'All') { setEditing({ ...editing, branches: ['All'] }); return; }
    const curr = (editing.branches || []).filter((x) => x !== 'All');
    setEditing({ ...editing, branches: curr.includes(b) ? curr.filter((x) => x !== b) : [...curr, b] });
  };

  const daysLeft = (deadline) => {
    if (!deadline) return null;
    const diff = new Date(deadline) - new Date();
    if (isNaN(diff)) return null;
    return Math.max(0, Math.ceil(diff / 86400000));
  };

  return (
    <DashboardLayout title="My Jobs">
      <div className="space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Posted', value: stats.total, color: 'text-white' },
            { label: 'Active', value: stats.active, color: 'text-green-400' },
            { label: 'Closed', value: stats.closed, color: 'text-red-400' },
            { label: 'Total Applicants', value: stats.totalApplicants, color: 'text-blue-electric' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }} className="glass-card p-4">
              <p className="text-white/40 text-xs font-body mb-1">{s.label}</p>
              <p className={`font-heading font-bold text-2xl ${s.color}`}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 py-2 text-sm w-full" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field py-2 text-sm w-32 appearance-none">
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field py-2 text-sm w-36 appearance-none">
            <option value="">All Types</option>
            {['Full-time', 'Internship', 'PPO', 'Contract'].map((type) => (
              <option key={type} value={type} className="bg-dark-700">{type}</option>
            ))}
          </select>
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="input-field py-2 text-sm w-44 appearance-none">
            <option value="">All Branches</option>
            {branchOptions.map((branch) => (
              <option key={branch} value={branch} className="bg-dark-700">{branch}</option>
            ))}
          </select>
          {(search || statusFilter || typeFilter || branchFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                setTypeFilter('');
                setBranchFilter('');
              }}
              className="text-white/40 hover:text-white text-sm flex items-center gap-1 font-body"
            >
              <X size={14} /> Clear
            </button>
          )}
          <Link to="/recruiter/post-job">
            <button className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
              <Plus size={14} /> Post Job
            </button>
          </Link>
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-5 bg-white/5 rounded w-1/3 mb-2" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          ))}</div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Briefcase size={36} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/50 font-body mb-4">No jobs posted yet.</p>
            <Link to="/recruiter/post-job">
              <button className="btn-primary text-sm py-2 px-5">Post your first job</button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((job, i) => {
              const days = daysLeft(job.deadline);
              return (
                <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-5 border border-white/5 hover:border-white/15 transition-all">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-white font-semibold">{job.title}</p>
                        <span className={STATUS_BADGE[job.status] || 'badge-gray'}>{job.status}</span>
                        {job.type && <span className="badge-blue text-xs">{job.type}</span>}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs font-body text-white/40 mt-1">
                        <span className="flex items-center gap-1">
                          <Users size={11} />{job.applicants || 0} applicants
                        </span>
                        <span>{job.location}</span>
                        <span>{job.ctc}</span>
                        {days !== null && (
                          <span className={`flex items-center gap-1 ${days <= 3 ? 'text-red-400' : ''}`}>
                            <Clock size={11} />
                            {days === 0 ? 'Deadline today' : `${days}d left`}
                          </span>
                        )}
                        {job.openings && <span>{job.openings} opening{job.openings !== 1 ? 's' : ''}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {job.status === 'active' && (
                        <>
                          <button onClick={() => setEditing({ ...job })}
                            className="p-2 rounded-xl border border-white/10 text-white/40 hover:text-blue-electric hover:border-blue-electric/30 transition-all"
                            title="Edit job">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleClose(job.id)} disabled={closing === job.id}
                            className="p-2 rounded-xl border border-white/10 text-white/40 hover:text-red-400 hover:border-red-500/30 transition-all"
                            title="Close job">
                            {closing === job.id
                              ? <div className="w-3.5 h-3.5 border border-white/20 border-t-white/60 rounded-full animate-spin" />
                              : <EyeOff size={14} />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Skills */}
                  {job.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(Array.isArray(job.skills) ? job.skills : String(job.skills).split(',').map(s => s.trim())).slice(0, 6).map((s) => (
                        <span key={s} className="badge-gray text-xs">{s}</span>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
              className="glass-card w-full max-w-2xl p-6 border border-white/10 my-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="section-title">Edit Job Posting</h2>
                <button onClick={() => setEditing(null)} className="text-white/40 hover:text-white"><X size={20} /></button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Job Title *</label>
                  <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    className="input-field text-sm" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Location', key: 'location', placeholder: 'Bangalore' },
                    { label: 'CTC / Stipend', key: 'ctc', placeholder: '12 LPA' },
                    { label: 'Min CGPA', key: 'minCGPA', placeholder: '7.0', type: 'number' },
                    { label: 'Openings', key: 'openings', placeholder: '10', type: 'number' },
                  ].map(({ label, key, placeholder, type = 'text' }) => (
                    <div key={key}>
                      <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">{label}</label>
                      <input type={type} value={editing[key] || ''} onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                        className="input-field text-sm" placeholder={placeholder} />
                    </div>
                  ))}

                  <div>
                    <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Job Type</label>
                    <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                      className="input-field text-sm appearance-none">
                      {['Full-time', 'Internship', 'PPO', 'Contract'].map((t) => (
                        <option key={t} value={t} className="bg-dark-700">{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Deadline</label>
                    <input type="date" value={editing.deadline || ''} onChange={(e) => setEditing({ ...editing, deadline: e.target.value })}
                      className="input-field text-sm" />
                  </div>
                </div>

                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-2">Eligible Branches</label>
                  <div className="flex flex-wrap gap-2">
                    {BRANCHES.map((b) => (
                      <button key={b} type="button" onClick={() => toggleBranch(b)}
                        className={`px-3 py-1 rounded-lg text-xs border transition-all font-body ${
                          (editing.branches || []).includes(b)
                            ? 'border-blue-electric/50 bg-blue-electric/10 text-blue-electric'
                            : 'border-white/10 text-white/40 hover:border-white/20'
                        }`}>{b}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Required Skills</label>
                  <input value={Array.isArray(editing.skills) ? editing.skills.join(', ') : editing.skills || ''}
                    onChange={(e) => setEditing({ ...editing, skills: e.target.value })}
                    className="input-field text-sm" placeholder="Python, React, SQL (comma separated)" />
                </div>

                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Job Description</label>
                  <textarea value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    className="input-field text-sm resize-none" rows={3} />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditing(null)} className="btn-outline flex-1 text-sm py-2.5">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-2">
                    {saving
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <CheckCircle size={14} />}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
