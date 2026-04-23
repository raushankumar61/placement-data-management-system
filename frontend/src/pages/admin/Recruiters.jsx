// src/pages/admin/Recruiters.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, CheckCircle, XCircle, Search, Globe, Mail, Phone } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';

const DEMO_RECRUITERS = [
  { id: 1, companyName: 'Google', contactEmail: 'hr@google.com', phone: '+1 650-253-0000', website: 'google.com', industry: 'Technology', verified: true, jobsPosted: 3, hires: 12 },
  { id: 2, companyName: 'Amazon', contactEmail: 'campus@amazon.com', phone: '+1 206-266-1000', website: 'amazon.com', industry: 'E-Commerce', verified: true, jobsPosted: 5, hires: 25 },
  { id: 3, companyName: 'StartupXYZ', contactEmail: 'hr@startupxyz.io', phone: '+91 9876543210', website: 'startupxyz.io', industry: 'SaaS', verified: false, jobsPosted: 0, hires: 0 },
  { id: 4, companyName: 'Infosys', contactEmail: 'campus.india@infosys.com', phone: '+91 80-2852-0261', website: 'infosys.com', industry: 'IT Services', verified: true, jobsPosted: 8, hires: 120 },
  { id: 5, companyName: 'NewTech Corp', contactEmail: 'recruit@newtech.com', phone: '+91 9988776655', website: 'newtech.com', industry: 'Technology', verified: false, jobsPosted: 1, hires: 0 },
];

export default function AdminRecruiters() {
  const [recruiters, setRecruiters] = useState(DEMO_RECRUITERS);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = recruiters.filter((r) => {
    const matchSearch = !search || r.companyName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'verified' ? r.verified : !r.verified);
    return matchSearch && matchFilter;
  });

  const toggleVerify = (id) => {
    setRecruiters((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, verified: !r.verified };
      toast.success(`${updated.companyName} ${updated.verified ? 'approved' : 'suspended'}`);
      return updated;
    }));
  };

  return (
    <DashboardLayout title="Recruiter Management">
      <div className="space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Recruiters', value: recruiters.length, color: 'text-white' },
            { label: 'Verified', value: recruiters.filter(r => r.verified).length, color: 'text-green-400' },
            { label: 'Pending Approval', value: recruiters.filter(r => !r.verified).length, color: 'text-gold' },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4">
              <p className="text-white/40 text-xs font-body mb-1">{s.label}</p>
              <p className={`font-heading font-bold text-2xl ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="text" placeholder="Search recruiters..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="input-field pl-9 py-2 text-sm w-52" />
          </div>
          <div className="flex gap-2">
            {['all', 'verified', 'pending'].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-xl text-xs font-body border transition-all capitalize ${
                  filter === f ? 'border-blue-electric/50 bg-blue-electric/10 text-blue-electric' : 'border-white/10 text-white/40'
                }`}>
                {f === 'pending' ? 'Pending' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`glass-card p-5 border transition-colors ${r.verified ? 'border-green-500/10' : 'border-gold/10'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-electric/20 to-gold/10 flex items-center justify-center border border-white/10">
                    <Building2 size={20} className="text-white/70" />
                  </div>
                  <div>
                    <p className="text-white font-heading font-semibold">{r.companyName}</p>
                    <p className="text-white/40 text-xs font-body">{r.industry}</p>
                  </div>
                </div>
                <span className={r.verified ? 'badge-green' : 'badge-gold'}>{r.verified ? 'Verified' : 'Pending'}</span>
              </div>

              <div className="space-y-2 mb-4">
                {[
                  { icon: Mail, text: r.contactEmail },
                  { icon: Phone, text: r.phone },
                  { icon: Globe, text: r.website },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-white/50">
                    <Icon size={12} className="text-white/30" />
                    <span className="text-xs font-body">{text}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div className="flex gap-4 text-xs font-body text-white/40">
                  <span>Jobs: <span className="text-white/70">{r.jobsPosted}</span></span>
                  <span>Hires: <span className="text-green-400">{r.hires}</span></span>
                </div>
                <button onClick={() => toggleVerify(r.id)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all font-body ${
                    r.verified
                      ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                      : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                  }`}>
                  {r.verified ? <><XCircle size={12} /> Suspend</> : <><CheckCircle size={12} /> Approve</>}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
