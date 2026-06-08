import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CheckCircle, X, Calendar, UserX, UserCheck, ExternalLink, Mail, Phone, Award, BookOpen } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';
import { updateApplicationStatus, createInterview, getStudent } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeApplications } from '../../hooks/useRealtime';

export default function RecruiterCandidates() {
  const { user } = useAuth();
  const { applications, loading } = useRealtimeApplications({ recruiterId: user?.uid });
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    const appId = searchParams.get('applicationId');
    if (appId && applications.length > 0) {
      const app = applications.find(a => a.id === appId);
      if (app && (!selected || selected.id !== appId)) {
        setSelected(app);
      }
    }
  }, [searchParams, applications, selected]);

  useEffect(() => {
    if (selected?.studentId) {
      setLoadingDetails(true);
      getStudent(selected.studentId)
        .then(res => setStudentDetails(res.data?.student || res.data))
        .catch(() => toast.error('Failed to load full student profile'))
        .finally(() => setLoadingDetails(false));
    } else {
      setStudentDetails(null);
    }
  }, [selected]);
  
  // Interview modal state
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [interviewForm, setInterviewForm] = useState({ date: '', time: '', mode: 'Online', link: '', round: 'Technical Round' });
  const [scheduling, setScheduling] = useState(false);

  const filtered = applications.filter((app) => {
    const matchSearch = !search || app.studentName?.toLowerCase().includes(search.toLowerCase()) || app.role?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || app.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleUpdateStatus = async (appId, status) => {
    setUpdating(appId);
    try {
      await updateApplicationStatus(appId, status);
      toast.success(`Application marked as ${status}`);
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setUpdating(null);
      if (selected?.id === appId) {
        setSelected({ ...selected, status });
      }
    }
  };

  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setScheduling(true);
    try {
      await createInterview({
        studentId: selected.studentId,
        studentName: selected.studentName,
        studentEmail: selected.studentEmail || '',
        jobId: selected.jobId,
        company: selected.company,
        role: selected.role,
        recruiterId: user.uid,
        ...interviewForm
      });
      await updateApplicationStatus(selected.id, 'In Process');
      toast.success('Interview scheduled successfully!');
      setShowInterviewModal(false);
      setSelected({ ...selected, status: 'In Process' });
    } catch (err) {
      toast.error('Failed to schedule interview');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <DashboardLayout title="My Applicants">
      <div className="flex gap-5">
        <div className="flex-1 space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input type="text" placeholder="Search by name, role..." value={search}
                onChange={(e) => setSearch(e.target.value)} className="input-field pl-9 py-2 text-sm w-full" />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field py-2 text-sm w-44 appearance-none">
              <option value="">All Statuses</option>
              {['Applied', 'Shortlisted', 'In Process', 'Selected', 'Rejected'].map(s => (
                <option key={s} value={s} className="bg-dark-700">{s}</option>
              ))}
            </select>
            {(search || statusFilter) && (
              <button onClick={() => { setSearch(''); setStatusFilter(''); }}
                className="text-white/40 hover:text-white text-sm flex items-center gap-1 font-body">
                <X size={14} /> Clear
              </button>
            )}
          </div>

          <p className="text-white/40 text-xs font-body">{filtered.length} applicants found</p>

          <div className="space-y-3">
            {loading ? (
               <div className="text-white/40 text-sm">Loading applicants...</div>
            ) : filtered.length === 0 ? (
               <div className="text-white/40 text-sm p-4 glass-card">No applicants found.</div>
            ) : filtered.map((app, i) => (
              <motion.div key={app.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelected(app)}
                className={`glass-card p-4 cursor-pointer border transition-all ${
                  selected?.id === app.id ? 'border-blue-electric/50' : 'border-white/5 hover:border-white/15'
                }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-electric/20 to-gold/10 flex items-center justify-center border border-white/10 flex-shrink-0">
                      <span className="font-heading font-bold text-white text-sm">{(app.studentName || '?')[0]}</span>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{app.studentName}</p>
                      <p className="text-white/40 text-xs font-body">{app.role} · {app.branch}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-md border ${
                      app.status === 'Applied' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' :
                      app.status === 'Rejected' ? 'border-red-500/30 text-red-400 bg-red-500/10' :
                      app.status === 'Selected' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                      'border-gold/30 text-gold bg-gold/10'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {selected && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="w-96 flex-shrink-0 glass-card border border-white/10 h-fit sticky top-4 flex flex-col max-h-[calc(100vh-6rem)]">
            <div className="p-5 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20 flex-1 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-electric/30 to-gold/20 flex items-center justify-center border border-white/10 flex-shrink-0">
                  <span className="font-heading font-bold text-white text-2xl">{(selected.studentName || '?')[0]}</span>
                </div>
                <div>
                  <p className="text-white font-heading font-bold text-lg">{selected.studentName}</p>
                  <p className="text-white/60 text-sm font-body">{selected.branch}</p>
                </div>
              </div>

              {loadingDetails ? (
                <div className="py-10 text-center text-white/40 text-sm">Loading full profile...</div>
              ) : (
                <>
                  <div className="space-y-2 py-4 border-y border-white/5">
                    {[
                      { label: 'Applied For', value: selected.role },
                      { label: 'Company', value: selected.company },
                      { label: 'Status', value: selected.status, color: 'text-gold' },
                      { label: 'Applied On', value: new Date(selected.appliedAt).toLocaleDateString() },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-white/40 font-body">{label}</span>
                        <span className={`font-body font-semibold ${color || 'text-white/80'}`}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {studentDetails && (
                    <div className="space-y-4">
                      {studentDetails.bio && (
                        <div>
                          <p className="text-white/50 text-xs uppercase tracking-wider mb-1 font-body">About</p>
                          <p className="text-white/80 text-sm font-body leading-relaxed">{studentDetails.bio}</p>
                        </div>
                      )}

                      <div className="space-y-2">
                        {studentDetails.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail size={14} className="text-white/40" />
                            <a href={`mailto:${studentDetails.email}`} className="text-blue-electric hover:underline">{studentDetails.email}</a>
                          </div>
                        )}
                        {studentDetails.phone && (
                          <div className="flex items-center gap-2 text-sm text-white/80">
                            <Phone size={14} className="text-white/40" /> {studentDetails.phone}
                          </div>
                        )}
                        {studentDetails.resumeURL && (
                          <div className="flex items-center gap-2 text-sm pt-1">
                            <ExternalLink size={14} className="text-blue-electric" />
                            <a href={studentDetails.resumeURL} target="_blank" rel="noreferrer" className="text-blue-electric hover:underline font-medium">View Resume</a>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="glass-card p-3 border border-white/5">
                          <p className="text-white/40 text-xs font-body flex items-center gap-1.5 mb-1"><Award size={12} /> CGPA</p>
                          <p className="text-white font-bold">{studentDetails.cgpa || 'N/A'}</p>
                        </div>
                        <div className="glass-card p-3 border border-white/5">
                          <p className="text-white/40 text-xs font-body flex items-center gap-1.5 mb-1"><BookOpen size={12} /> Pass Year</p>
                          <p className="text-white font-bold">{studentDetails.graduationYear || 'N/A'}</p>
                        </div>
                      </div>

                      {studentDetails.skills?.length > 0 && (
                        <div>
                          <p className="text-white/50 text-xs uppercase tracking-wider mb-2 font-body">Skills</p>
                          <div className="flex flex-wrap gap-1.5">
                            {studentDetails.skills.map((skill, idx) => (
                              <span key={idx} className="bg-white/5 border border-white/10 px-2 py-1 rounded text-xs text-white/70 font-body">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(studentDetails.linkedin || studentDetails.github) && (
                        <div className="flex gap-3 pt-2">
                          {studentDetails.linkedin && (
                            <a href={studentDetails.linkedin} target="_blank" rel="noreferrer" className="text-xs text-white/50 hover:text-white flex items-center gap-1 transition-colors">
                              <ExternalLink size={12} /> LinkedIn
                            </a>
                          )}
                          {studentDetails.github && (
                            <a href={studentDetails.github} target="_blank" rel="noreferrer" className="text-xs text-white/50 hover:text-white flex items-center gap-1 transition-colors">
                              <ExternalLink size={12} /> GitHub
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-dark-900 rounded-b-2xl">
              <p className="text-white/50 text-xs uppercase tracking-wider mb-3 font-body">Actions</p>
              
              {selected.status !== 'Selected' && selected.status !== 'Rejected' && (
                <div className="space-y-2">
                  <button onClick={() => handleUpdateStatus(selected.id, 'Shortlisted')} disabled={updating === selected.id}
                    className="btn-outline w-full text-sm py-2 flex items-center justify-center gap-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                    <UserCheck size={14} /> Shortlist
                  </button>
                  <button onClick={() => setShowInterviewModal(true)} disabled={updating === selected.id}
                    className="btn-primary w-full text-sm py-2 flex items-center justify-center gap-2">
                    <Calendar size={14} /> Schedule Interview
                  </button>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button onClick={() => handleUpdateStatus(selected.id, 'Selected')} disabled={updating === selected.id}
                      className="btn-outline text-sm py-2 flex items-center justify-center gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10">
                      <CheckCircle size={14} /> Accept
                    </button>
                    <button onClick={() => handleUpdateStatus(selected.id, 'Rejected')} disabled={updating === selected.id}
                      className="btn-outline text-sm py-2 flex items-center justify-center gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10">
                      <UserX size={14} /> Reject
                    </button>
                  </div>
                </div>
              )}
              {selected.status === 'Selected' && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-center text-green-400 text-sm">
                  Candidate Selected!
                </div>
              )}
              {selected.status === 'Rejected' && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-center text-red-400 text-sm">
                  Candidate Rejected.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showInterviewModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-md p-6 border border-white/10">
              <div className="flex justify-between items-center mb-5">
                <h3 className="section-title text-lg">Schedule Interview</h3>
                <button onClick={() => setShowInterviewModal(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
              </div>
              <form onSubmit={handleScheduleInterview} className="space-y-4">
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider block mb-1">Date</label>
                  <input type="date" required value={interviewForm.date} onChange={e => setInterviewForm({...interviewForm, date: e.target.value})} className="input-field text-sm w-full" />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider block mb-1">Time</label>
                  <input type="time" required value={interviewForm.time} onChange={e => setInterviewForm({...interviewForm, time: e.target.value})} className="input-field text-sm w-full" />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider block mb-1">Round</label>
                  <input type="text" required placeholder="Technical, HR..." value={interviewForm.round} onChange={e => setInterviewForm({...interviewForm, round: e.target.value})} className="input-field text-sm w-full" />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider block mb-1">Mode</label>
                  <select value={interviewForm.mode} onChange={e => setInterviewForm({...interviewForm, mode: e.target.value})} className="input-field text-sm w-full appearance-none">
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>
                {interviewForm.mode === 'Online' && (
                  <div>
                    <label className="text-white/50 text-xs uppercase tracking-wider block mb-1">Meeting Link</label>
                    <input type="url" placeholder="https://meet.google.com/..." value={interviewForm.link} onChange={e => setInterviewForm({...interviewForm, link: e.target.value})} className="input-field text-sm w-full" />
                  </div>
                )}
                <button type="submit" disabled={scheduling} className="btn-primary w-full py-2.5 mt-2 flex justify-center items-center">
                  {scheduling ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Confirm Interview'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
