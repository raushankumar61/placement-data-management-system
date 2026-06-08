// src/pages/admin/Recruiters.jsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, CheckCircle, XCircle, Search, Globe, Mail, Phone, Users, X, BadgeCheck, Briefcase } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';
import { getRecruiters, verifyRecruiter } from '../../services/api';

export default function AdminRecruiters() {
  const [recruiters, setRecruiters] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedRecruiter, setSelectedRecruiter] = useState(null);

  useEffect(() => {
    let active = true;

    const loadRecruiters = async () => {
      try {
        const { data } = await getRecruiters();
        if (!active) return;

        const records = (data.recruiters || []).map((recruiter) => ({
          id: recruiter.id,
          companyName: recruiter.companyName || recruiter.name || 'Recruiter',
          contactEmail: recruiter.contactEmail || recruiter.email || '',
          phone: recruiter.phone || 'N/A',
          website: recruiter.website || 'N/A',
          industry: recruiter.industry || 'General',
          location: recruiter.location || 'N/A',
          companySize: recruiter.companySize || 'N/A',
          foundedYear: recruiter.foundedYear || 'N/A',
          hiringRoles: Array.isArray(recruiter.hiringRoles)
            ? recruiter.hiringRoles
            : String(recruiter.hiringRoles || '').split(',').map((s) => s.trim()).filter(Boolean),
          verified: Boolean(recruiter.verified),
          jobsPosted: Number(recruiter.jobsPosted || 0),
          hires: Number(recruiter.hires || 0),
        }));

        setRecruiters(records);
      } catch {
        if (active) setRecruiters([]);
      }
    };

    loadRecruiters();
    return () => { active = false; };
  }, []);

  const filtered = recruiters.filter((r) => {
    const matchSearch = !search || r.companyName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'verified' ? r.verified : !r.verified);
    return matchSearch && matchFilter;
  });

  const toggleVerify = async (id, e) => {
    if (e) e.stopPropagation();
    const recruiter = recruiters.find((item) => item.id === id);
    if (!recruiter) return;

    try {
      await verifyRecruiter(id, !recruiter.verified);
      const newVerified = !recruiter.verified;
      setRecruiters((prev) => prev.map((item) => (
        item.id === id ? { ...item, verified: newVerified } : item
      )));
      if (selectedRecruiter && selectedRecruiter.id === id) {
        setSelectedRecruiter((prev) => ({ ...prev, verified: newVerified }));
      }
      toast.success(`${recruiter.companyName} ${newVerified ? 'approved' : 'suspended'}`);
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
              onClick={() => setSelectedRecruiter(r)}
              className={`glass-card p-5 border transition-all cursor-pointer hover:bg-white/5 ${r.verified ? 'border-green-500/10 hover:border-green-500/30' : 'border-gold/10 hover:border-gold/30'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center border flex-shrink-0 ${r.verified ? 'bg-gradient-to-br from-green-500/20 to-blue-electric/10 border-green-500/30 text-green-400' : 'bg-gradient-to-br from-gold/20 to-blue-electric/10 border-gold/30 text-gold'}`}>
                    <Building2 size={20} />
                  </div>
                  <div>
                    <p className="text-white font-heading font-semibold pr-4">{r.companyName}</p>
                    <p className="text-white/40 text-xs font-body">{r.industry}</p>
                  </div>
                </div>
                <span className={r.verified ? 'badge-green flex items-center gap-1' : 'badge-gold flex items-center gap-1'}>
                  {r.verified ? <><BadgeCheck size={12} /> Verified</> : 'Pending'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {[
                  { icon: Mail, text: r.contactEmail },
                  { icon: Globe, text: r.website },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-white/50">
                    <Icon size={12} className="text-white/30" />
                    <span className="text-xs font-body truncate">{text}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div className="flex gap-4 text-xs font-body text-white/40">
                  <span>Jobs: <span className="text-white/70">{r.jobsPosted}</span></span>
                  <span>Hires: <span className="text-green-400">{r.hires}</span></span>
                </div>
                <button onClick={(e) => toggleVerify(r.id, e)}
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
          
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <Building2 size={32} className="mx-auto text-white/20 mb-3" />
              <p className="text-white/40 text-sm font-body">No recruiters found</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedRecruiter && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm z-50 flex justify-end"
            onClick={() => setSelectedRecruiter(null)}>
            
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md h-full bg-dark-900 border-l border-white/10 shadow-2xl flex flex-col">
              
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <h2 className="font-heading font-bold text-lg text-white">Recruiter Details</h2>
                <button onClick={() => setSelectedRecruiter(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Profile Header */}
                <div className="flex flex-col items-center text-center pb-6 border-b border-white/10">
                  <div className={`w-24 h-24 rounded-2xl flex items-center justify-center mb-4 border ${selectedRecruiter.verified ? 'bg-gradient-to-br from-green-500/20 to-blue-electric/20 border-green-500/30 text-green-400' : 'bg-gradient-to-br from-gold/20 to-blue-electric/20 border-gold/30 text-gold'}`}>
                    <Building2 size={48} />
                  </div>
                  <h3 className="font-heading font-bold text-2xl text-white mb-1">{selectedRecruiter.companyName}</h3>
                  <p className="text-white/50 font-medium font-body text-sm mb-3">{selectedRecruiter.industry}</p>
                  
                  <span className={selectedRecruiter.verified ? 'badge-green flex items-center gap-1' : 'badge-gold'}>
                    {selectedRecruiter.verified ? <><BadgeCheck size={12} /> Verified Partner</> : 'Pending Approval'}
                  </span>
                </div>

                {/* Information Grid */}
                <div className="space-y-4">
                  <h4 className="text-white/40 uppercase tracking-wider text-xs font-semibold mb-3">Company Information</h4>
                  
                  <div className="glass-card p-4 space-y-4 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-white/50">
                        <Mail size={16} />
                        <span className="text-sm font-body">Contact Email</span>
                      </div>
                      <span className="text-white font-medium text-sm">{selectedRecruiter.contactEmail}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-white/50">
                        <Phone size={16} />
                        <span className="text-sm font-body">Phone</span>
                      </div>
                      <span className="text-white font-medium text-sm">{selectedRecruiter.phone}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-white/50">
                        <Globe size={16} />
                        <span className="text-sm font-body">Website</span>
                      </div>
                      <span className="text-blue-400 hover:text-blue-300 transition-colors font-medium text-sm cursor-pointer">{selectedRecruiter.website}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-white/50">
                        <Building2 size={16} />
                        <span className="text-sm font-body">Location</span>
                      </div>
                      <span className="text-white font-medium text-sm">{selectedRecruiter.location}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-white/50">
                        <Users size={16} />
                        <span className="text-sm font-body">Company Size</span>
                      </div>
                      <span className="text-white font-medium text-sm">{selectedRecruiter.companySize}</span>
                    </div>
                  </div>
                </div>

                {/* Recruiting Stats */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-white/40 uppercase tracking-wider text-xs font-semibold mb-3">Placement Activity</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="glass-card p-4 border border-white/5">
                      <div className="flex items-center gap-2 text-white/50 mb-1">
                        <Briefcase size={14} />
                        <span className="text-xs font-body">Jobs Posted</span>
                      </div>
                      <p className="text-white text-xl font-heading font-bold">{selectedRecruiter.jobsPosted}</p>
                    </div>
                    <div className="glass-card p-4 border border-white/5">
                      <div className="flex items-center gap-2 text-white/50 mb-1">
                        <Users size={14} />
                        <span className="text-xs font-body">Total Hires</span>
                      </div>
                      <p className="text-green-400 text-xl font-heading font-bold">{selectedRecruiter.hires}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-6 border-t border-white/10">
                  <button onClick={(e) => toggleVerify(selectedRecruiter.id, e)}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${
                      selectedRecruiter.verified
                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
                        : 'bg-green-500 text-dark-900 hover:bg-green-400'
                    }`}>
                    {selectedRecruiter.verified ? <><XCircle size={18} /> Suspend Account</> : <><CheckCircle size={18} /> Approve Account</>}
                  </button>
                  <p className="text-center text-white/30 text-xs mt-3 font-body">
                    {selectedRecruiter.verified ? 'Suspending will restrict the recruiter from posting new jobs.' : 'Approving will grant the recruiter full access to the portal.'}
                  </p>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}