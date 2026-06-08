// src/pages/admin/Faculty.jsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Search, Mail, Building2, UserCircle, BadgeCheck, X, Calendar, Fingerprint } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import { getFaculty } from '../../services/api';

export default function AdminFaculty() {
  const [faculty, setFaculty] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState(null);

  useEffect(() => {
    let active = true;

    const loadFaculty = async () => {
      try {
        const { data } = await getFaculty();
        if (!active) return;
        setFaculty(data.faculty || []);
      } catch {
        if (active) setFaculty([]);
      }
    };

    loadFaculty();
    return () => { active = false; };
  }, []);

  const filtered = faculty.filter((f) => {
    const matchSearch = !search || 
      (f.name && f.name.toLowerCase().includes(search.toLowerCase())) || 
      (f.department && f.department.toLowerCase().includes(search.toLowerCase())) ||
      (f.employeeId && f.employeeId.toLowerCase().includes(search.toLowerCase()));
    return matchSearch;
  });

  return (
    <DashboardLayout title="Faculty Management">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 max-w-lg">
          <div className="glass-card p-4">
            <p className="text-white/40 text-xs font-body mb-1">Total Faculty</p>
            <p className="font-heading font-bold text-2xl text-white">{faculty.length}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-white/40 text-xs font-body mb-1">Departments</p>
            <p className="font-heading font-bold text-2xl text-purple-400">
              {new Set(faculty.map(f => f.department)).size}
            </p>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="text" placeholder="Search faculty or ID..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="input-field pl-9 py-2 text-sm w-64" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((f, i) => {
            const isHOD = f.designation?.toLowerCase().includes('head');
            
            return (
            <motion.div key={f.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedFaculty(f)}
              className="glass-card p-5 border border-purple-500/10 hover:border-purple-500/40 hover:bg-white/5 transition-all cursor-pointer relative overflow-hidden group">
              
              {isHOD && (
                <div className="absolute top-0 right-0 bg-gold/20 text-gold px-3 py-1 rounded-bl-xl text-[10px] font-bold tracking-wider flex items-center gap-1 border-b border-l border-gold/30">
                  <BadgeCheck size={12} /> HOD
                </div>
              )}

              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border flex-shrink-0 ${isHOD ? 'bg-gradient-to-br from-gold/20 to-purple-500/20 border-gold/30 text-gold' : 'bg-gradient-to-br from-purple-500/20 to-blue-electric/10 border-white/10 text-purple-400'}`}>
                  <UserCircle size={24} />
                </div>
                <div>
                  <p className="text-white font-heading font-semibold pr-10">{f.name || 'Faculty Member'}</p>
                  <p className="text-white/60 text-xs font-body mb-1">{f.designation || 'Faculty Member'}</p>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between text-white/50">
                   <div className="flex items-center gap-2">
                     <Fingerprint size={14} className="text-white/30" />
                     <span className="text-xs font-body">{f.employeeId || 'N/A'}</span>
                   </div>
                </div>
                <div className="flex items-center justify-between text-white/50">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-white/30" />
                    <span className="text-xs font-body">{f.department || 'General Department'}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )})}
          
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <BookOpen size={32} className="mx-auto text-white/20 mb-3" />
              <p className="text-white/40 text-sm font-body">No faculty found</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedFaculty && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-dark-950/60 backdrop-blur-sm z-50 flex justify-end"
              onClick={() => setSelectedFaculty(null)}>
              
              <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md h-full bg-dark-900 border-l border-white/10 shadow-2xl flex flex-col">
                
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                  <h2 className="font-heading font-bold text-lg text-white">Faculty Details</h2>
                  <button onClick={() => setSelectedFaculty(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Profile Header */}
                  <div className="flex flex-col items-center text-center pb-6 border-b border-white/10">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-electric/20 border border-purple-500/30 flex items-center justify-center mb-4 text-purple-400">
                      <UserCircle size={48} />
                    </div>
                    <h3 className="font-heading font-bold text-2xl text-white mb-1">{selectedFaculty.name}</h3>
                    <p className="text-purple-400 font-medium font-body text-sm mb-2">{selectedFaculty.designation || 'Faculty Member'}</p>
                    
                    {selectedFaculty.designation?.toLowerCase().includes('head') && (
                      <span className="badge-gold inline-flex items-center gap-1 mt-1">
                        <BadgeCheck size={12} /> Department Head
                      </span>
                    )}
                  </div>

                  {/* Information Grid */}
                  <div className="space-y-4">
                    <h4 className="text-white/40 uppercase tracking-wider text-xs font-semibold mb-3">Professional Information</h4>
                    
                    <div className="glass-card p-4 space-y-4 border border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white/50">
                          <Fingerprint size={16} />
                          <span className="text-sm font-body">Employee ID</span>
                        </div>
                        <span className="text-white font-medium text-sm">{selectedFaculty.employeeId || 'Not Assigned'}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white/50">
                          <Building2 size={16} />
                          <span className="text-sm font-body">Department</span>
                        </div>
                        <span className="text-white font-medium text-sm">{selectedFaculty.department || 'N/A'}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white/50">
                          <Mail size={16} />
                          <span className="text-sm font-body">Email</span>
                        </div>
                        <span className="text-white font-medium text-sm">{selectedFaculty.email}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-white/50">
                          <Calendar size={16} />
                          <span className="text-sm font-body">Joined Date</span>
                        </div>
                        <span className="text-white font-medium text-sm">
                          {selectedFaculty.createdAt ? new Date(selectedFaculty.createdAt).toLocaleDateString() : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* System Access */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-white/40 uppercase tracking-wider text-xs font-semibold mb-3">System Access</h4>
                    <div className="glass-card p-4 border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                          <BadgeCheck size={14} />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">Active Account</p>
                          <p className="text-white/40 text-xs">Role: {selectedFaculty.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
