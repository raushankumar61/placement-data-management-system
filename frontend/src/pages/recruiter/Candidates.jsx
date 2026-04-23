// src/pages/recruiter/Candidates.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, Filter, Star, ExternalLink } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function RecruiterCandidates() {
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState('');
  const [minCGPA, setMinCGPA] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [starred, setStarred] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'students'));
        const data = snap.docs.map((d) => {
          const v = d.data();
          const skills = Array.isArray(v.skills)
            ? v.skills
            : String(v.skills || '').split(',').map((s) => s.trim()).filter(Boolean);
          return {
            id: d.id,
            name: v.name || 'Student',
            branch: v.branch || 'Unknown',
            cgpa: Number(v.cgpa || 0),
            skills,
            status: (v.placementStatus || '').toLowerCase() === 'placed' ? 'Placed' : 'Available',
            email: v.email || '',
            rollNo: v.rollNo || '',
          };
        });
        setCandidates(data);
      } catch {
        toast.error('Unable to load candidates');
      }
    };

    load();
  }, []);

  const filtered = candidates.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()));
    const matchCGPA = !minCGPA || c.cgpa >= parseFloat(minCGPA);
    const matchBranch = !branchFilter || c.branch === branchFilter;
    return matchSearch && matchCGPA && matchBranch && c.status !== 'Placed';
  });

  const toggleStar = (id) => setStarred((prev) => ({ ...prev, [id]: !prev[id] }));

  const shortlist = (candidate) => {
    toast.success(`${candidate.name} shortlisted!`);
  };

  return (
    <DashboardLayout title="Candidate Filter">
      <div className="flex gap-5">
        <div className="flex-1 space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input type="text" placeholder="Search by name, skill..." value={search}
                onChange={(e) => setSearch(e.target.value)} className="input-field pl-9 py-2 text-sm w-full" />
            </div>
            <input type="number" placeholder="Min CGPA" value={minCGPA} step="0.1" min="0" max="10"
              onChange={(e) => setMinCGPA(e.target.value)} className="input-field py-2 text-sm w-28" />
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}
              className="input-field py-2 text-sm w-44 appearance-none">
              <option value="">All Branches</option>
              {[...new Set(candidates.map((c) => c.branch).filter(Boolean))].map((b) => (
                <option key={b} value={b} className="bg-dark-700">{b}</option>
              ))}
            </select>
          </div>

          <p className="text-white/40 text-xs font-body">{filtered.length} eligible candidates</p>

          <div className="space-y-3">
            {filtered.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => setSelected(c)}
                className={`glass-card p-4 cursor-pointer border transition-all ${
                  selected?.id === c.id ? 'border-blue-electric/50' : 'border-white/5 hover:border-white/15'
                }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-electric/20 to-gold/10 flex items-center justify-center border border-white/10 flex-shrink-0">
                    <span className="font-heading font-bold text-white text-sm">{c.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold text-sm">{c.name}</p>
                      {starred[c.id] && <Star size={12} className="text-gold fill-gold" />}
                    </div>
                    <p className="text-white/40 text-xs font-body">{c.branch} · CGPA {c.cgpa}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {c.skills.slice(0, 3).map((s) => <span key={s} className="badge-blue text-xs">{s}</span>)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button onClick={(e) => { e.stopPropagation(); toggleStar(c.id); }}
                      className="text-white/30 hover:text-gold transition-colors">
                      <Star size={14} className={starred[c.id] ? 'text-gold fill-gold' : ''} />
                    </button>
                    <div className="text-xs text-white/30 font-body">{c.skills.length} skills</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        {selected && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="w-72 flex-shrink-0 glass-card p-5 border border-white/10 h-fit sticky top-4 space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-electric/30 to-gold/20 flex items-center justify-center border border-white/10 mx-auto mb-3">
                <span className="font-heading font-bold text-white text-2xl">{selected.name[0]}</span>
              </div>
              <p className="text-white font-heading font-bold">{selected.name}</p>
              <p className="text-white/40 text-sm font-body">{selected.branch}</p>
            </div>

            <div className="space-y-2 py-4 border-y border-white/5">
              {[
                { label: 'CGPA', value: selected.cgpa, color: 'text-gold' },
                { label: 'Roll No', value: selected.rollNo || 'N/A' },
                { label: 'Email', value: selected.email || 'N/A' },
                { label: 'Status', value: selected.status },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-white/40 font-body">{label}</span>
                  <span className={`font-body font-semibold ${color || 'text-white/80'}`}>{value}</span>
                </div>
              ))}
            </div>

            <div>
              <p className="text-white/40 text-xs mb-2 font-body uppercase tracking-wider">Skills</p>
              <div className="flex flex-wrap gap-1">
                {selected.skills.map((s) => <span key={s} className="badge-blue text-xs">{s}</span>)}
              </div>
            </div>

            <div className="space-y-2">
              <button onClick={() => shortlist(selected)} className="btn-primary w-full text-sm py-2.5">
                Shortlist Candidate
              </button>
              <button className="btn-outline w-full text-sm py-2.5 flex items-center justify-center gap-2">
                <Download size={13} /> Download Resume
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
