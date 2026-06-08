// src/pages/admin/Jobs.jsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Trash2, Edit2, X, Calendar, MapPin, DollarSign, Users, AlertCircle } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import { TableSkeleton } from '../../components/common/SkeletonLoader';
import toast from 'react-hot-toast';
import { createJob, deleteJob, updateJob } from '../../services/api';
import { useRealtimeJobs } from '../../hooks/useRealtime';
import { normalizeJobBranches } from '../../utils/branchEligibility';

const INITIAL_FORM = {
  title: '', company: '', recruiterName: '', recruiterEmail: '', industry: '',
  location: '', ctc: '', type: 'Full-time', workMode: 'Onsite', experienceLevel: 'Fresher',
  minCGPA: '', branches: [], skills: '', perks: '', description: '',
  deadline: '', openings: '', status: 'active', interviewRounds: 2, applyLink: '', postedOnCampus: true,
};

const JOB_TYPES = ['Full-time', 'Internship', 'PPO', 'Contract'];
const BRANCHES = ['Computer Science', 'Information Technology', 'Electronics & Communication', 'Mechanical', 'Civil', 'Electrical', 'All'];

export default function AdminJobs() {
  const { jobs, loading, error } = useRealtimeJobs();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [sortField, setSortField] = useState('date_desc');
  const [showModal, setShowModal] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const branchOptions = [...new Set(jobs.flatMap((job) => (Array.isArray(job.branches) ? job.branches : [job.branches])).filter(Boolean))].filter((branch) => branch !== 'All');

  const parseNumber = (value) => {
    const text = String(value ?? '').replace(/,/g, '').replace(/₹/g, '').trim();
    const match = text.match(/\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  };

  const filtered = jobs.filter((j) => {
    const matchSearch = !search || j.title?.toLowerCase().includes(search.toLowerCase()) || j.company?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || j.status === statusFilter;
    const matchType = !typeFilter || j.type === typeFilter;
    const matchCompany = !companyFilter || j.company === companyFilter;
    const branches = Array.isArray(j.branches) ? j.branches : [j.branches].filter(Boolean);
    const matchBranch = !branchFilter || branches.includes('All') || branches.some((branch) => String(branch).toLowerCase() === branchFilter.toLowerCase());
    return matchSearch && matchStatus && matchType && matchBranch && matchCompany;
  }).sort((a, b) => {
    if (sortField === 'date_desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    if (sortField === 'date_asc') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    if (sortField === 'ctc_desc') return (parseNumber(b.ctcValue) || parseNumber(b.ctc)) - (parseNumber(a.ctcValue) || parseNumber(a.ctc));
    if (sortField === 'deadline_asc') return new Date(a.deadline || 0) - new Date(b.deadline || 0);
    return 0;
  });

  const companyOptions = [...new Set(jobs.map((job) => job.company).filter(Boolean))].sort();

  const openModal = (job = null) => {
    setEditJob(job);
    setForm(job ? {
      ...INITIAL_FORM,
      ...job,
      skills: Array.isArray(job.skills) ? job.skills.join(', ') : (job.skills || ''),
      perks: Array.isArray(job.perks) ? job.perks.join(', ') : (job.perks || ''),
      branches: job.branches || [],
    } : INITIAL_FORM);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        branches: normalizeJobBranches(form.branches),
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        perks: String(form.perks || '').split(',').map((s) => s.trim()).filter(Boolean),
        minCGPA: String(form.minCGPA || ''),
        interviewRounds: Number(form.interviewRounds || 0),
        postedOnCampus: Boolean(form.postedOnCampus),
        applyLink: form.applyLink || '',
      };
      if (editJob && !editJob.id.startsWith('d')) {
        await updateJob(editJob.id, payload);
        toast.success('Job updated');
      } else {
        await createJob(payload);
        toast.success('Job posted');
      }
      setShowModal(false);
    } catch {
      toast.error(editJob ? 'Failed to update job' : 'Failed to post job');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this job?')) return;
    try {
      await deleteJob(id);
      toast.success('Job deleted');
    } catch {
      toast.error('Failed to delete job');
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
          <div className="flex flex-wrap gap-3 items-center flex-1">
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
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field py-2 text-sm w-32 appearance-none">
              <option value="">All Status</option>
              <option value="active" className="bg-dark-700">Active</option>
              <option value="closed" className="bg-dark-700">Closed</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input-field py-2 text-sm w-36 appearance-none">
              <option value="">All Types</option>
              {JOB_TYPES.map((type) => (
                <option key={type} value={type} className="bg-dark-700">{type}</option>
              ))}
            </select>
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="input-field py-2 text-sm w-44 appearance-none">
              <option value="">All Branches</option>
              {branchOptions.map((branch) => (
                <option key={branch} value={branch} className="bg-dark-700">{branch}</option>
              ))}
            </select>
            <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="input-field py-2 text-sm w-44 appearance-none">
              <option value="">All Companies</option>
              {companyOptions.map((comp) => (
                <option key={comp} value={comp} className="bg-dark-700">{comp}</option>
              ))}
            </select>
            <select value={sortField} onChange={(e) => setSortField(e.target.value)} className="input-field py-2 text-sm w-44 appearance-none font-semibold text-blue-400">
              <option value="date_desc" className="bg-dark-700">Sort: Newest First</option>
              <option value="date_asc" className="bg-dark-700">Sort: Oldest First</option>
              <option value="ctc_desc" className="bg-dark-700">Sort: Highest CTC</option>
              <option value="deadline_asc" className="bg-dark-700">Sort: Deadline Soon</option>
            </select>
            {(search || statusFilter || typeFilter || branchFilter || companyFilter) && (
              <button
                onClick={() => {
                  setSearch(''); setStatusFilter(''); setTypeFilter(''); setBranchFilter(''); setCompanyFilter('');
                }}
                className="text-white/40 hover:text-white text-sm flex items-center gap-1 font-body"
              >
                <X size={14} /> Clear
              </button>
            )}
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
        ) : error ? (
          <div className="glass-card p-8 text-center border border-red-500/20">
            <AlertCircle size={28} className="text-red-400 mx-auto mb-3" />
            <p className="section-title mb-1">Unable to load jobs</p>
            <p className="text-white/40 text-sm font-body max-w-md mx-auto">
              Firestore rejected the realtime jobs query. Check Firebase configuration, role claims, rules, or indexes.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <BriefcaseEmpty />
            <p className="section-title mb-1">No jobs found</p>
            <p className="text-white/40 text-sm font-body max-w-md mx-auto">
              {jobs.length === 0
                ? 'Post the first job drive to populate this dashboard.'
                : 'No jobs match the current filters.'}
            </p>
          </div>
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

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="badge-blue text-xs">{job.workMode || 'Onsite'}</span>
                  <span className="badge-gray text-xs">{job.experienceLevel || 'Fresher'}</span>
                  {job.recruiterName && <span className="badge-gold text-xs truncate max-w-40">{job.recruiterName}</span>}
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
            className="glass-card w-full max-w-2xl border border-white/10 my-4 flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title">{editJob ? 'Edit Job' : 'Post New Job'}</h2>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 overflow-y-auto flex-1 pr-2 pb-2">
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
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Recruiter Name</label>
                  <input value={form.recruiterName} onChange={(e) => setForm({ ...form, recruiterName: e.target.value })}
                    className="input-field text-sm" placeholder="Talent Team" />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Recruiter Email</label>
                  <input type="email" value={form.recruiterEmail} onChange={(e) => setForm({ ...form, recruiterEmail: e.target.value })}
                    className="input-field text-sm" placeholder="talent@company.com" />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Location</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="input-field text-sm" placeholder="Bangalore" />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Industry</label>
                  <input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    className="input-field text-sm" placeholder="Technology" />
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
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Work Mode</label>
                  <select value={form.workMode} onChange={(e) => setForm({ ...form, workMode: e.target.value })}
                    className="input-field text-sm appearance-none">
                    {['Onsite', 'Hybrid', 'Remote'].map((mode) => <option key={mode} value={mode} className="bg-dark-700">{mode}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Experience Level</label>
                  <select value={form.experienceLevel} onChange={(e) => setForm({ ...form, experienceLevel: e.target.value })}
                    className="input-field text-sm appearance-none">
                    {['Fresher', '0-2 years', '2-4 years', '4+ years'].map((level) => <option key={level} value={level} className="bg-dark-700">{level}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Application Deadline</label>
                  <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                    className="input-field text-sm" />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Interview Rounds</label>
                  <input type="number" min="1" value={form.interviewRounds} onChange={(e) => setForm({ ...form, interviewRounds: e.target.value })}
                    className="input-field text-sm" placeholder="3" />
                </div>
                <div className="col-span-2">
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Apply Link</label>
                  <input value={form.applyLink} onChange={(e) => setForm({ ...form, applyLink: e.target.value })}
                    className="input-field text-sm" placeholder="https://careers.company.com/apply" />
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
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Perks</label>
                <input value={form.perks} onChange={(e) => setForm({ ...form, perks: e.target.value })}
                  className="input-field text-sm" placeholder="Flexible hours, Learning budget" />
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

function BriefcaseEmpty() {
  return (
    <div className="w-12 h-12 rounded-xl bg-blue-electric/10 border border-blue-electric/20 flex items-center justify-center mx-auto mb-3">
      <Plus size={20} className="text-blue-electric" />
    </div>
  );
}
