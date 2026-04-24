// src/pages/admin/Recruiters.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, CheckCircle, XCircle, Search, Globe, Mail, Phone } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function AdminRecruiters() {
  const [recruiters, setRecruiters] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'recruiters'), (snap) => {
      setRecruiters(snap.docs.map((d) => ({
        id: d.id,
        companyName: d.data().companyName || d.data().name || 'Recruiter',
        contactEmail: d.data().contactEmail || d.data().email || '',
        phone: d.data().phone || 'N/A',
        website: d.data().website || 'N/A',
        industry: d.data().industry || 'General',
        location: d.data().location || 'N/A',
        companySize: d.data().companySize || 'N/A',
        foundedYear: d.data().foundedYear || 'N/A',
        hiringRoles: Array.isArray(d.data().hiringRoles)
          ? d.data().hiringRoles
          : String(d.data().hiringRoles || '').split(',').map((s) => s.trim()).filter(Boolean),
        verified: Boolean(d.data().verified),
        jobsPosted: Number(d.data().jobsPosted || 0),
        hires: Number(d.data().hires || 0),
      })));
    }, () => setRecruiters([]));

    return unsub;
  }, []);

  const filtered = recruiters.filter((r) => {
    const matchSearch = !search || r.companyName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'verified' ? r.verified : !r.verified);
    return matchSearch && matchFilter;
  });

  const toggleVerify = async (id) => {
    const recruiter = recruiters.find((item) => item.id === id);
    if (!recruiter) return;

    try {
      await updateDoc(doc(db, 'recruiters', id), { verified: !recruiter.verified });
      toast.success(`${recruiter.companyName} ${!recruiter.verified ? 'approved' : 'suspended'}`);
    } catch {
      toast.error('Unable to update recruiter status');
    }
  };

  return (
    <DashboardLayout title="Recruiter Management">
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Recruiters', value: recruiters.length, color: 'text-white' },
            { label: 'Verified', value: recruiters.filter((r) => r.verified).length, color: 'text-green-400' },
            { label: 'Pending Approval', value: recruiters.filter((r) => !r.verified).length, color: 'text-gold' },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4">
              <p className="text-white/40 text-xs font-body mb-1">{s.label}</p>
              <p className={`font-heading font-bold text-2xl ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="text" placeholder="Search recruiters..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="input-field pl-9 py-2 text-sm w-52" />
          </div>
          <div className="flex gap-2">
            {['all', 'verified', 'pending'].map((f) => {
              const count = f === 'all' ? recruiters.length : recruiters.filter((r) => (f === 'verified' ? r.verified : !r.verified)).length;
              return (
                <button key={f} onClick={() => setFilter(f)}
                  className={`tab-chip text-xs capitalize flex items-center gap-2 ${filter === f ? 'active' : ''}`}>
                  {f === 'pending' ? 'Pending' : f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${filter === f ? 'bg-white/15 text-white' : 'bg-white/8 text-white/60'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

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
                  { icon: Building2, text: r.location },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-white/50">
                    <Icon size={12} className="text-white/30" />
                    <span className="text-xs font-body">{text}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="badge-blue text-xs">{r.industry}</span>
                <span className="badge-gray text-xs">{r.companySize}</span>
                <span className="badge-gold text-xs">Founded {r.foundedYear}</span>
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

              {!!r.hiringRoles.length && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {r.hiringRoles.slice(0, 4).map((role) => (
                    <span key={role} className="badge-blue text-xs">{role}</span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}