import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Building2, ExternalLink, MessageSquare, Mail } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function StudentAlumni() {
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  useEffect(() => {
    const fetchAlumni = async () => {
      try {
        const q = query(collection(db, 'students'), where('placementStatus', '==', 'placed'));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAlumni(data);
      } catch (error) {
        toast.error('Failed to load alumni directory');
      } finally {
        setLoading(false);
      }
    };
    fetchAlumni();
  }, []);

  const companies = [...new Set(alumni.map(a => a.companyPlaced || a.latestApplicationCompany).filter(Boolean))].sort();

  const filtered = alumni.filter(a => {
    const nameMatch = !search || (a.name || '').toLowerCase().includes(search.toLowerCase());
    const companyMatch = !companyFilter || (a.companyPlaced === companyFilter || a.latestApplicationCompany === companyFilter);
    return nameMatch && companyMatch;
  });

  return (
    <DashboardLayout title="Alumni Connect">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div>
            <h2 className="section-title text-xl">Alumni Network</h2>
            <p className="text-white/40 text-sm font-body mt-1">Connect with placed seniors and industry professionals</p>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input type="text" placeholder="Search alumni..." value={search}
                onChange={(e) => setSearch(e.target.value)} className="input-field pl-9 py-2 text-sm w-full" />
            </div>
            <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}
              className="input-field py-2 text-sm w-40 appearance-none">
              <option value="">All Companies</option>
              {companies.map(c => <option key={c} value={c} className="bg-dark-700">{c}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="glass-card p-5 h-40 animate-pulse bg-white/5" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-white/40 font-body">No alumni found matching your criteria.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((person, i) => {
              const company = person.companyPlaced || person.latestApplicationCompany || 'Unknown';
              return (
                <motion.div
                  key={person.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-5 hover:border-white/20 transition-colors group flex flex-col"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-electric/20 to-purple-500/20 flex items-center justify-center border border-white/10 flex-shrink-0">
                      <span className="font-heading font-bold text-white text-xl">{(person.name || 'U')[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading font-bold text-white text-base truncate">{person.name}</h3>
                      <p className="text-blue-electric text-sm font-semibold truncate flex items-center gap-1">
                        <Building2 size={12} /> {company}
                      </p>
                      <p className="text-white/40 text-xs font-body mt-0.5 truncate">{person.branch}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-white/5 flex-1">
                    <p className="text-white/60 text-xs font-body line-clamp-2 italic">
                      "{person.bio || 'Happy to help juniors with interview prep and referrals!'}"
                    </p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <a href={`mailto:${person.email}`} className="btn-primary flex-1 py-2 text-xs flex items-center justify-center gap-2">
                      <Mail size={14} /> Contact
                    </a>
                    {person.linkedin && (
                      <a href={person.linkedin} target="_blank" rel="noopener noreferrer" 
                        className="btn-outline flex-1 py-2 text-xs flex items-center justify-center gap-2">
                        <ExternalLink size={14} /> LinkedIn
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
