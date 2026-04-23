// src/pages/recruiter/InterviewScheduler.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Plus, X, CheckCircle, User, Video, MapPin } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';
import { collection, getDocs, addDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { db } from '../../services/firebase';

const INITIAL_FORM = {
  studentId: '', role: '', date: '', time: '',
  mode: 'Online', platform: '', round: 'Technical Round 1',
  link: '', venue: '', instructions: '',
};

const ROUNDS = ['Technical Round 1', 'Technical Round 2', 'HR Round', 'Managerial Round', 'Final Round'];

export default function RecruiterInterviewScheduler() {
  const [students, setStudents] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [studentsSnap, interviewsSnap] = await Promise.all([
          getDocs(collection(db, 'students')),
          getDocs(query(collection(db, 'interviews'), orderBy('createdAt', 'desc'))),
        ]);

        const data = studentsSnap.docs.map((d) => {
          const v = d.data();
          return {
            id: d.id,
            name: v.name || 'Student',
            branch: v.branch || 'Unknown',
            cgpa: Number(v.cgpa || 0),
            email: v.email || '',
            placementStatus: (v.placementStatus || 'unplaced').toLowerCase(),
          };
        });
        setStudents(data);

        const scheduledData = interviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setScheduled(scheduledData);
      } catch {
        setStudents([]);
        setScheduled([]);
      }
    };

    load();
  }, []);

  const shortlistedStudents = useMemo(
    () => students.filter((s) => s.placementStatus !== 'placed').slice(0, 30),
    [students]
  );

  const handleSchedule = async (e) => {
    e.preventDefault();
    if (!form.studentId || !form.date || !form.time) {
      return toast.error('Please fill all required fields');
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));

    const student = shortlistedStudents.find((s) => s.id === form.studentId);
    const newInterview = {
      student: student?.name || '',
      studentId: student?.id || '',
      role: form.role,
      date: form.date,
      time: form.time,
      mode: form.mode,
      platform: form.mode === 'Online' ? (form.platform || 'Google Meet') : 'Offline',
      round: form.round,
      link: form.mode === 'Online' ? form.link : form.venue,
      createdAt: new Date().toISOString(),
    };

    try {
      const ref = await addDoc(collection(db, 'interviews'), newInterview);
      setScheduled((prev) => [{ id: ref.id, ...newInterview }, ...prev]);
      toast.success(`Interview scheduled for ${student?.name}!`);
      setShowModal(false);
      setForm(INITIAL_FORM);
    } catch {
      toast.error('Failed to schedule interview');
    } finally {
      setSaving(false);
    }
  };

  const cancelInterview = async (id) => {
    try {
      await deleteDoc(doc(db, 'interviews', id));
      setScheduled((prev) => prev.filter((s) => s.id !== id));
      toast.success('Interview cancelled');
    } catch {
      toast.error('Failed to cancel interview');
    }
  };

  return (
    <DashboardLayout title="Interview Scheduler">
      <div className="space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Scheduled', value: scheduled.length, color: 'text-blue-electric' },
            { label: 'This Week', value: 2, color: 'text-gold' },
            { label: 'Completed', value: 4, color: 'text-green-400' },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <p className={`font-heading font-bold text-2xl ${s.color}`}>{s.value}</p>
              <p className="text-white/40 text-xs font-body mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex justify-between items-center">
          <p className="text-white/40 text-sm font-body">{scheduled.length} interviews scheduled</p>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
            <Plus size={14} /> Schedule Interview
          </button>
        </div>

        {/* Scheduled List */}
        <div className="space-y-3">
          {scheduled.map((iv, i) => (
            <motion.div
              key={iv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card p-5 border border-white/5 hover:border-blue-electric/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-electric/20 to-gold/10 flex items-center justify-center border border-white/10">
                    <User size={16} className="text-white/60" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{iv.student}</p>
                    <p className="text-white/40 text-xs font-body">{iv.role} · {iv.round}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge-blue">{iv.round}</span>
                  <button
                    onClick={() => cancelInterview(iv.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {[
                  { icon: Calendar, text: iv.date },
                  { icon: Clock, text: iv.time },
                  { icon: Video, text: `${iv.mode} · ${iv.platform}` },
                  { icon: MapPin, text: iv.link || 'TBD' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-white/40">
                    <Icon size={12} className="text-white/25 flex-shrink-0" />
                    <span className="text-xs font-body truncate">{text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}

          {scheduled.length === 0 && (
            <div className="glass-card p-12 text-center">
              <Calendar size={32} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 font-body">No interviews scheduled yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-lg p-6 border border-white/10"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title">Schedule Interview</h2>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSchedule} className="space-y-4">
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Student *</label>
                <select
                  value={form.studentId}
                  onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                  className="input-field text-sm appearance-none"
                  required
                >
                  <option value="">Select Student</option>
                  {shortlistedStudents.map((s) => (
                    <option key={s.id} value={s.id} className="bg-dark-700">
                      {s.name} — {s.branch} (CGPA: {s.cgpa})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Job Role *</label>
                <input
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="input-field text-sm"
                  placeholder="e.g. Software Development Engineer"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="input-field text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Time *</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="input-field text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Mode</label>
                  <select
                    value={form.mode}
                    onChange={(e) => setForm({ ...form, mode: e.target.value })}
                    className="input-field text-sm appearance-none"
                  >
                    <option value="Online" className="bg-dark-700">Online</option>
                    <option value="Offline" className="bg-dark-700">Offline</option>
                    <option value="Hybrid" className="bg-dark-700">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Round</label>
                  <select
                    value={form.round}
                    onChange={(e) => setForm({ ...form, round: e.target.value })}
                    className="input-field text-sm appearance-none"
                  >
                    {ROUNDS.map((r) => (
                      <option key={r} value={r} className="bg-dark-700">{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">
                  {form.mode === 'Online' ? 'Platform & Meeting Link' : 'Venue Address'}
                </label>
                <input
                  value={form.mode === 'Online' ? form.link : form.venue}
                  onChange={(e) => setForm({
                    ...form,
                    [form.mode === 'Online' ? 'link' : 'venue']: e.target.value
                  })}
                  className="input-field text-sm"
                  placeholder={form.mode === 'Online' ? 'e.g. meet.google.com/abc-def' : 'e.g. Room 204, Block A'}
                />
              </div>

              {form.mode === 'Online' && (
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Platform</label>
                  <input
                    value={form.platform}
                    onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    className="input-field text-sm"
                    placeholder="Google Meet / Zoom / Teams"
                  />
                </div>
              )}

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Instructions for Student</label>
                <textarea
                  value={form.instructions}
                  onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                  className="input-field text-sm resize-none"
                  rows={2}
                  placeholder="e.g. Focus on DSA, carry your laptop..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1 text-sm py-2.5">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-2">
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><CheckCircle size={14} /> Schedule</>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}