// src/pages/admin/Jobs.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Trash2, Edit2, X, Briefcase, Calendar, MapPin, DollarSign, Users } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import { TableSkeleton } from '../../components/common/SkeletonLoader';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const INITIAL_FORM = {
  title: '', company: '', location: '', ctc: '', type: 'Full-time',
  minCGPA: '', branches: [], skills: '', description: '',
  deadline: '', openings: '', status: 'active',
};

const JOB_TYPES = ['Full-time', 'Internship', 'PPO', 'Contract'];
const BRANCHES = ['Computer Science', 'Information Technology', 'Electronics & Communication', 'Mechanical', 'Civil', 'Electrical', 'All'];

const DEMO_JOBS = [
  { id: 'd1', title: 'Software Development Engineer', company: 'Amazon', location: 'Bangalore', ctc: '24 LPA', type: 'Full-time', minCGPA: '7.0', branches: ['Computer Science', 'IT'], status: 'active', deadline: '2025-02-28', openings: 20, applicants: 145 },
  { id: 'd2', title: 'Product Manager Intern', company: 'Google', location: 'Hyderabad', ctc: '80k/month', type: 'Internship', minCGPA: '8.0', branches: ['Computer Science'], status: 'active', deadline: '2025-02-15', openings: 5, applicants: 89 },
  { id: 'd3', title: 'Data Scientist', company: 'Microsoft', location: 'Pune', ctc: '18 LPA', type: 'Full-time', minCGPA: '7.5', branches: ['Computer Science', 'IT', 'Electronics & Communication'], status: 'active', deadline: '2025-03-10', openings: 10, applicants: 67 },
  { id: 'd4', title: 'Frontend Developer', company: 'Flipkart', location: 'Bangalore', ctc: '15 LPA', type: 'Full-time', minCGPA: '6.5', branches: ['All'], status: 'closed', deadline: '2025-01-30', openings: 8, applicants: 203 },
];

export default function AdminJobs() {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'jobs'));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setJobs(data.length ? data : DEMO_JOBS);
      } catch { setJobs(DEMO_JOBS); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const filtered = jobs.filter((j) =>
    j.title?.toLowerCase().includes(search.toLowerCase()) ||
    j.company?.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (job = null) => {
    setEditJob(job);
    setForm(job ? { ...job, skills: Array.isArray(job.skills) ? job.skills.join(', ') : (job.skills || ''), branches: job.branches || [] } : INITIAL_FORM);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        postedBy: user?.uid,
        updatedAt: serverTimestamp(),
      };
      if (editJob && !editJob.id.startsWith('d')) {
        await updateDoc(doc(db, 'jobs', editJob.id), payload);
        toast.success('Job updated');
      } else {
        await addDoc(collection(db, 'jobs'), { ...payload, createdAt: serverTimestamp(), applicants: 0 });
        toast.success('Job posted');
      }
      setShowModal(false);
    } catch {
      if (editJob) {
        setJobs((prev) => prev.map((j) => j.id === editJob.id ? { ...j, ...form } : j));
      } else {
        setJobs((prev) => [{ ...form, id: `new-${Date.now()}`, applicants: 0 }, ...prev]);
      }
      toast.success(editJob ? 'Job updated' : 'Job posted');
      setShowModal(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this job?')) return;
    try {
      if (!id.startsWith('d') && !id.startsWith('new-')) await deleteDoc(doc(db, 'jobs', id));
      setJobs((prev) => prev.filter((j) => j.id !== id));
      toast.success('Job deleted');
    } catch {
      setJobs((prev) => prev.filter((j) => j.id !== id));
      toast.success('Job deleted');
    }
  };

  const toggleBranch = (branch) => {
    if (branch === 'All') { setForm({ ...form, branches: ['All'] }); return; }
    const curr = form.branches.filter((b) => b !== 'All');
    setForm({ ...form, branches: curr.includes(branch) ? curr.filter((b) => b !== branch) : [...curr, branch] });
  };

  return (
    <DashboardLayout title="Jobs & Drives">
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="flex gap-3 items-center justify-between flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 py-2 text-sm w-60"
            />
          </div>
          <button onClick={() => openModal()} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
            <Plus size={14} /> Post Job · {jobs.filter((j) => j.status === 'active').length} Active
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Drives', value: jobs.length, color: 'text-blue-electric' },
            { label: 'Active', value: jobs.filter(j => j.status === 'active').length, color: 'text-green-400' },
            { label: 'Total Openings', value: jobs.reduce((a, j) => a + (Number(j.openings) || 0), 0), color: 'text-gold' },
            { label: 'Applications', value: jobs.reduce((a, j) => a + (Number(j.applicants) || 0), 0), color: 'text-purple-400' },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4">
              <p className="text-white/40 text-xs font-body mb-1">{s.label}</p>
              <p className={`font-heading font-bold text-2xl ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Job Cards */}
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="glass-card p-5 border border-white/5 hover:border-blue-electric/20 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="section-title text-base truncate">{job.title}</h3>
                      <span className={job.status === 'active' ? 'badge-green' : 'badge-gray'}>{job.status}</span>
                    </div>
                    <p className="text-white/60 font-body text-sm font-semibold">{job.company}</p>
                  </div>
                  <div className="flex gap-1 ml-3">
                    <button onClick={() => openModal(job)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-blue-electric transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(job.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { icon: MapPin, text: job.location },
                    { icon: DollarSign, text: job.ctc },
                    { icon: Users, text: `${job.openings} openings` },
                    { icon: Calendar, text: job.deadline ? `Due ${job.deadline}` : 'No deadline' },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-1.5 text-white/50">
                      <Icon size={12} className="text-white/30 flex-shrink-0" />
                      <span className="text-xs font-body truncate">{text}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex gap-1">
                    <span className="badge-blue text-xs">{job.type}</span>
                    <span className="badge-gray text-xs">Min CGPA {job.minCGPA}</span>
                  </div>
                  <span className="text-white/40 text-xs font-body">
                    {job.applicants || 0} applicants
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-2xl p-6 border border-white/10 my-4"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title">{editJob ? 'Edit Job' : 'Post New Job'}</h2>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Job Title *</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="input-field text-sm" placeholder="Software Development Engineer" required />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Company *</label>
                  <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="input-field text-sm" placeholder="Google" required />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Location</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="input-field text-sm" placeholder="Bangalore" />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">CTC / Stipend</label>
                  <input value={form.ctc} onChange={(e) => setForm({ ...form, ctc: e.target.value })}
                    className="input-field text-sm" placeholder="24 LPA" />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Job Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="input-field text-sm appearance-none">
                    {JOB_TYPES.map((t) => <option key={t} value={t} className="bg-dark-700">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Min CGPA</label>
                  <input type="number" step="0.1" min="0" max="10" value={form.minCGPA}
                    onChange={(e) => setForm({ ...form, minCGPA: e.target.value })}
                    className="input-field text-sm" placeholder="7.0" />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Openings</label>
                  <input type="number" value={form.openings} onChange={(e) => setForm({ ...form, openings: e.target.value })}
                    className="input-field text-sm" placeholder="10" />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Application Deadline</label>
                  <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="input-field text-sm" />
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Eligible Branches</label>
                <div className="flex flex-wrap gap-2">
                  {BRANCHES.map((b) => (
                    <button key={b} type="button" onClick={() => toggleBranch(b)}
                      className={`px-3 py-1 rounded-lg text-xs border transition-all font-body ${
                        form.branches?.includes(b)
                          ? 'border-blue-electric/50 bg-blue-electric/10 text-blue-electric'
                          : 'border-white/10 text-white/40 hover:border-white/20'
                      }`}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Required Skills</label>
                <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })}
                  className="input-field text-sm" placeholder="Python, SQL, Machine Learning" />
              </div>

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Job Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field text-sm resize-none" rows={3} placeholder="Brief description of the role..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1 text-sm py-2.5">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (editJob ? 'Update Job' : 'Post Job')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}
