import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Video, Calendar, Clock, Plus, X, CheckCircle } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { createMockInterview, getMockInterviews } from '../../services/api';

export default function StudentMockInterviews() {
  const { user, userProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ domain: 'Technical', topic: '', notes: '' });

  useEffect(() => {
    const fetchRequests = async () => {
      if (!user?.uid) return;
      try {
        const { data } = await getMockInterviews();
        setRequests(data.requests || []);
      } catch (err) {
        toast.error('Failed to load mock interview requests');
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [user?.uid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.topic) { toast.error('Please provide a specific topic or company'); return; }
    setSubmitting(true);
    try {
      const payload = {
        studentName: userProfile?.name || 'Student',
        studentBranch: userProfile?.branch || userProfile?.department || '',
        domain: form.domain,
        topic: form.topic,
        notes: form.notes,
      };
      const { data } = await createMockInterview(payload);
      setRequests((prev) => [{ ...data }, ...prev]);
      toast.success('Mock interview requested successfully!');
      setShowModal(false);
      setForm({ domain: 'Technical', topic: '', notes: '' });
    } catch (err) {
      toast.error('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const statusColors = {
    'Pending': 'badge-gray',
    'Scheduled': 'badge-blue',
    'Completed': 'badge-green',
  };

  return (
    <DashboardLayout title="Mock Interviews">
      <div className="space-y-6 h-full flex flex-col">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="section-title text-xl">Mock Interview Sessions</h2>
            <p className="text-white/40 text-sm font-body mt-1">Request 1-on-1 practice sessions with faculty or alumni.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary py-2 px-4 flex items-center gap-2 text-sm">
            <Plus size={16} /> Request Session
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="glass-card h-24 animate-pulse bg-white/5" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20 border border-white/5 border-dashed rounded-2xl glass-card">
            <Video size={48} className="text-white/20 mb-4" />
            <h3 className="text-white font-heading text-lg font-semibold">No Mock Interviews Yet</h3>
            <p className="text-white/40 font-body text-sm max-w-md mt-2">
              Practice makes perfect! Request a mock interview to get personalized feedback on your technical or HR skills.
            </p>
            <button onClick={() => setShowModal(true)} className="btn-outline mt-6 py-2 px-6">Request Now</button>
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((req, i) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${req.status === 'Scheduled' ? 'bg-blue-electric/20 text-blue-electric' : 'bg-white/5 text-white/40'}`}>
                    <Video size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold font-heading">{req.domain} Interview</h3>
                      <span className={statusColors[req.status] || 'badge-gray'}>{req.status}</span>
                    </div>
                    <p className="text-white/60 text-sm font-body mt-1">Topic: <span className="text-white">{req.topic}</span></p>
                    {req.notes && <p className="text-white/40 text-xs font-body mt-1 italic">"{req.notes}"</p>}
                  </div>
                </div>

                {req.status === 'Scheduled' && (
                  <div className="flex flex-col md:items-end gap-1 border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-5">
                    <p className="text-white/40 text-xs uppercase tracking-wider font-body">Scheduled For</p>
                    <div className="flex items-center gap-1.5 text-white text-sm font-semibold">
                      <Calendar size={14} className="text-blue-electric" /> {req.scheduledDate || 'TBD'}
                    </div>
                    <div className="flex items-center gap-1.5 text-white text-sm">
                      <Clock size={14} className="text-gold" /> {req.scheduledTime || 'TBD'}
                    </div>
                    {req.meetingLink && (
                      <a href={req.meetingLink} target="_blank" rel="noopener noreferrer" className="text-blue-electric hover:underline text-xs mt-1">
                        Join Meeting Link
                      </a>
                    )}
                  </div>
                )}
                {req.status === 'Completed' && req.feedback && (
                  <div className="border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-5 max-w-xs">
                    <p className="text-green-400 text-xs uppercase tracking-wider font-body flex items-center gap-1"><CheckCircle size={12}/> Feedback Provided</p>
                    <p className="text-white/60 text-xs font-body mt-1 line-clamp-3">{req.feedback}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full max-w-md border border-white/10 p-6 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
              <X size={20} />
            </button>
            <h2 className="section-title mb-6">Request Mock Interview</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Interview Domain</label>
                <select value={form.domain} onChange={e => setForm({...form, domain: e.target.value})} className="input-field text-sm appearance-none">
                  <option className="bg-dark-700" value="Technical (SDE)">Technical (SDE)</option>
                  <option className="bg-dark-700" value="Technical (Core)">Technical (Core Engineering)</option>
                  <option className="bg-dark-700" value="HR / Behavioral">HR / Behavioral</option>
                  <option className="bg-dark-700" value="Consulting / Case">Consulting / Case</option>
                </select>
              </div>

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Specific Topic or Target Company</label>
                <input required type="text" value={form.topic} onChange={e => setForm({...form, topic: e.target.value})} placeholder="e.g. Data Structures, React, or Google/Amazon prep" className="input-field text-sm" />
              </div>

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Additional Notes (Optional)</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Any specific areas you want the interviewer to focus on?" rows={3} className="input-field text-sm resize-none" />
              </div>

              <button type="submit" disabled={submitting} className="btn-primary w-full py-3 flex items-center justify-center gap-2 mt-2">
                {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Submit Request'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}
