// src/pages/student/JobBoard.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, DollarSign, Calendar, Briefcase, Filter, ExternalLink } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';

const DEMO_JOBS = [
  { id: 1, title: 'Software Development Engineer', company: 'Amazon', location: 'Bangalore', ctc: '24 LPA', type: 'Full-time', minCGPA: 7.0, deadline: '2025-02-28', openings: 20, eligible: true, applied: false, description: 'Join Amazon\'s world-class engineering team. Build scalable distributed systems.' },
  { id: 2, title: 'Product Manager Intern', company: 'Google', location: 'Hyderabad', ctc: '80k/month', type: 'Internship', minCGPA: 8.0, deadline: '2025-02-15', openings: 5, eligible: true, applied: true, description: 'Work on Google\'s flagship products. Define product roadmaps and work with cross-functional teams.' },
  { id: 3, title: 'Data Scientist', company: 'Microsoft', location: 'Pune', ctc: '18 LPA', type: 'Full-time', minCGPA: 7.5, deadline: '2025-03-10', openings: 10, eligible: true, applied: false, description: 'Apply ML and data science to solve real-world Microsoft challenges at scale.' },
  { id: 4, title: 'Frontend Developer', company: 'Flipkart', location: 'Bangalore', ctc: '15 LPA', type: 'Full-time', minCGPA: 6.5, deadline: '2025-03-05', openings: 8, eligible: true, applied: false, description: 'Build beautiful, performant user interfaces for India\'s largest e-commerce platform.' },
  { id: 5, title: 'Backend Engineer', company: 'Swiggy', location: 'Bangalore', ctc: '14 LPA', type: 'Full-time', minCGPA: 7.0, deadline: '2025-03-15', openings: 12, eligible: true, applied: false, description: 'Power Swiggy\'s backend infrastructure serving millions of food orders daily.' },
  { id: 6, title: 'ML Engineer', company: 'Nvidia', location: 'Pune', ctc: '30 LPA', type: 'Full-time', minCGPA: 8.5, deadline: '2025-02-20', openings: 3, eligible: false, applied: false, description: 'Research and develop cutting-edge GPU-accelerated ML algorithms.' },
];

export default function StudentJobBoard() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [jobs, setJobs] = useState(DEMO_JOBS);
  const [selected, setSelected] = useState(null);
  const [applying, setApplying] = useState(false);

  const filtered = jobs.filter((j) => {
    const matchSearch = !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.company.toLowerCase().includes(search.toLowerCase());
    const matchType = !typeFilter || j.type === typeFilter;
    return matchSearch && matchType;
  });

  const applyToJob = async (jobId) => {
    setApplying(true);
    await new Promise((r) => setTimeout(r, 800));
    setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, applied: true } : j));
    if (selected?.id === jobId) setSelected({ ...selected, applied: true });
    toast.success('Application submitted successfully!');
    setApplying(false);
  };

  const daysLeft = (deadline) => {
    const d = new Date(deadline) - new Date();
    return Math.max(0, Math.ceil(d / (1000 * 60 * 60 * 24)));
  };

  return (
    <DashboardLayout title="Job Board">
      <div className="flex gap-5 h-full">
        {/* Job List */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* Toolbar */}
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

          <p className="text-white/40 text-xs font-body">{filtered.filter(j => j.eligible).length} eligible jobs found</p>

          <div className="space-y-3">
            {filtered.map((job, i) => (
              <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => setSelected(job)}
                className={`glass-card p-4 cursor-pointer border transition-all ${
                  selected?.id === job.id ? 'border-blue-electric/50' :
                  !job.eligible ? 'border-white/5 opacity-50' : 'border-white/5 hover:border-white/15'
                }`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-electric/20 to-gold/10 flex items-center justify-center border border-white/10 flex-shrink-0">
                    <span className="font-heading font-bold text-white text-sm">{job.company[0]}</span>
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
                        <span className={`text-xs font-body ${daysLeft(job.deadline) <= 3 ? 'text-red-400' : ''}`}>
                          {daysLeft(job.deadline)}d left
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Job Detail Panel */}
        {selected && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="w-80 flex-shrink-0 glass-card p-5 border border-white/10 h-fit sticky top-4 space-y-4">
            <div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-electric/20 to-gold/10 flex items-center justify-center border border-white/10 mb-3">
                <span className="font-heading font-bold text-white text-lg">{selected.company[0]}</span>
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
                { label: 'Deadline', value: selected.deadline },
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
                onClick={() => !selected.applied && applyToJob(selected.id)}
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
