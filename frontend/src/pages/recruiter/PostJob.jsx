// src/pages/recruiter/PostJob.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Send } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';
import { createJob } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const BRANCHES = ['All', 'Computer Science', 'Information Technology', 'Electronics & Communication', 'Mechanical', 'Civil', 'Electrical'];

export default function RecruiterPostJob() {
  const { user, userProfile } = useAuth();
  const [form, setForm] = useState({
    title: '', location: '', ctc: '', type: 'Full-time', minCGPA: '',
    branches: [], skills: '', description: '', deadline: '', openings: '', process: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const toggleBranch = (b) => {
    if (b === 'All') { setForm({ ...form, branches: ['All'] }); return; }
    const curr = form.branches.filter((x) => x !== 'All');
    setForm({ ...form, branches: curr.includes(b) ? curr.filter((x) => x !== b) : [...curr, b] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await createJob({
        ...form,
        company: userProfile?.companyName || userProfile?.name || 'Recruiter Company',
        recruiterName: userProfile?.name || user?.displayName || 'Recruiter',
        recruiterEmail: userProfile?.email || user?.email || '',
        postedBy: user?.uid || '',
        skills: String(form.skills || '').split(',').map((item) => item.trim()).filter(Boolean),
        openings: Number(form.openings || 0),
        minCGPA: String(form.minCGPA || ''),
        status: 'active',
      });

      toast.success('Job posted successfully!');
      setForm({ title: '', location: '', ctc: '', type: 'Full-time', minCGPA: '', branches: [], skills: '', description: '', deadline: '', openings: '', process: '' });
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to post job');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Post a Job">
      <div className="max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-electric/10 border border-blue-electric/20 flex items-center justify-center">
              <Briefcase size={18} className="text-blue-electric" />
            </div>
            <div>
              <h2 className="section-title">New Job Posting</h2>
              <p className="text-white/40 text-xs font-body">Reach thousands of eligible students</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Job Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input-field text-sm" placeholder="e.g., Software Development Engineer" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  {['Full-time', 'Internship', 'PPO', 'Contract'].map((t) => (
                    <option key={t} value={t} className="bg-dark-700">{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Min CGPA</label>
                <input type="number" step="0.1" min="0" max="10" value={form.minCGPA}
                  onChange={(e) => setForm({ ...form, minCGPA: e.target.value })}
                  className="input-field text-sm" placeholder="7.0" />
              </div>
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Number of Openings</label>
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
              <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-2">Eligible Branches</label>
              <div className="flex flex-wrap gap-2">
                {BRANCHES.map((b) => (
                  <button key={b} type="button" onClick={() => toggleBranch(b)}
                    className={`px-3 py-1 rounded-lg text-xs border transition-all font-body ${
                      form.branches.includes(b) ? 'border-blue-electric/50 bg-blue-electric/10 text-blue-electric' : 'border-white/10 text-white/40 hover:border-white/20'
                    }`}>{b}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Required Skills</label>
              <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })}
                className="input-field text-sm" placeholder="Python, SQL, Machine Learning (comma separated)" />
            </div>

            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Job Description *</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field text-sm resize-none" rows={4} placeholder="Describe the role, responsibilities, and requirements..." required />
            </div>

            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Selection Process</label>
              <textarea value={form.process} onChange={(e) => setForm({ ...form, process: e.target.value })}
                className="input-field text-sm resize-none" rows={2} placeholder="e.g., Online Test → Technical Round → HR Round → Offer" />
            </div>

            <button type="submit" disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-3 disabled:opacity-50">
              {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={15} />}
              {submitting ? 'Posting...' : 'Post Job'}
            </button>
          </form>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
