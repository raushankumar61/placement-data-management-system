// src/pages/faculty/Recommendations.jsx  (D3)
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Send, X, Plus, CheckCircle } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';

const STUDENTS = [
  { id: 1, name: 'Priya Sharma', rollNo: '2021CS001', cgpa: 9.1, skills: ['React', 'Node.js', 'Python'], branch: 'CS' },
  { id: 2, name: 'Rahul Kumar', rollNo: '2021CS042', cgpa: 8.7, skills: ['Python', 'ML', 'TensorFlow'], branch: 'CS' },
  { id: 3, name: 'Anjali Singh', rollNo: '2021CS015', cgpa: 8.3, skills: ['Java', 'Spring', 'AWS'], branch: 'CS' },
  { id: 4, name: 'Deepa Menon', rollNo: '2021CS099', cgpa: 9.0, skills: ['UI/UX', 'Figma', 'React'], branch: 'CS' },
  { id: 5, name: 'Amit Patel', rollNo: '2021CS008', cgpa: 7.8, skills: ['C++', 'DSA'], branch: 'CS' },
];

const JOBS = [
  { id: 1, title: 'SDE', company: 'Google' },
  { id: 2, title: 'Data Scientist', company: 'Microsoft' },
  { id: 3, title: 'Product Manager', company: 'Amazon' },
  { id: 4, title: 'Frontend Developer', company: 'Flipkart' },
];

const SENT_RECOMMENDATIONS = [
  { id: 1, student: 'Priya Sharma', role: 'SDE', company: 'Google', reason: 'Top performer in algorithms. Excellent project portfolio.', date: '2025-01-20', status: 'Accepted' },
  { id: 2, student: 'Deepa Menon', role: 'Frontend Developer', company: 'Flipkart', reason: 'Outstanding UI/UX skills and React expertise.', date: '2025-01-22', status: 'Pending' },
];

export default function FacultyRecommendations() {
  const [recommendations, setRecommendations] = useState(SENT_RECOMMENDATIONS);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ studentId: '', jobId: '', reason: '', rating: 5 });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.studentId || !form.jobId || !form.reason) return toast.error('Please fill all fields');
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));

    const student = STUDENTS.find((s) => s.id === parseInt(form.studentId));
    const job = JOBS.find((j) => j.id === parseInt(form.jobId));

    setRecommendations((prev) => [{
      id: Date.now(),
      student: student?.name,
      role: job?.title,
      company: job?.company,
      reason: form.reason,
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
    }, ...prev]);

    toast.success(`Recommendation sent for ${student?.name}!`);
    setShowModal(false);
    setForm({ studentId: '', jobId: '', reason: '', rating: 5 });
    setSaving(false);
  };

  return (
    <DashboardLayout title="Student Recommendations">
      <div className="space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Sent', value: recommendations.length, color: 'text-blue-electric' },
            { label: 'Accepted', value: recommendations.filter(r => r.status === 'Accepted').length, color: 'text-green-400' },
            { label: 'Pending', value: recommendations.filter(r => r.status === 'Pending').length, color: 'text-gold' },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <p className={`font-heading font-bold text-2xl ${s.color}`}>{s.value}</p>
              <p className="text-white/40 text-xs font-body mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex justify-between items-center">
          <p className="section-title">Recommendations Sent</p>
          <button onClick={() => setShowModal(true)} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
            <Plus size={14} /> New Recommendation
          </button>
        </div>

        {/* List */}
        <div className="space-y-3">
          {recommendations.map((rec, i) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card p-5 border border-white/5"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-semibold">{rec.student}</p>
                    <span className="text-white/30">→</span>
                    <p className="text-blue-electric font-body text-sm">{rec.role} at {rec.company}</p>
                  </div>
                  <p className="text-white/50 text-sm font-body italic">"{rec.reason}"</p>
                  <p className="text-white/30 text-xs font-body mt-2">{rec.date}</p>
                </div>
                <span className={rec.status === 'Accepted' ? 'badge-green' : 'badge-gold'}>
                  {rec.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-lg p-6 border border-white/10"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title">Recommend a Student</h2>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Select Student *</label>
                <select value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                  className="input-field text-sm appearance-none" required>
                  <option value="">Choose a student</option>
                  {STUDENTS.map((s) => (
                    <option key={s.id} value={s.id} className="bg-dark-700">
                      {s.name} — CGPA {s.cgpa}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Job Role *</label>
                <select value={form.jobId} onChange={(e) => setForm({ ...form, jobId: e.target.value })}
                  className="input-field text-sm appearance-none" required>
                  <option value="">Choose a role</option>
                  {JOBS.map((j) => (
                    <option key={j.id} value={j.id} className="bg-dark-700">
                      {j.title} — {j.company}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button key={r} type="button" onClick={() => setForm({ ...form, rating: r })}>
                      <Star size={22} className={r <= form.rating ? 'text-gold fill-gold' : 'text-white/20'} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Reason for Recommendation *</label>
                <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="input-field text-sm resize-none" rows={4}
                  placeholder="Why do you recommend this student for this role? Mention specific strengths, achievements, projects..."
                  required />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1 text-sm py-2.5">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send size={14} /> Send Recommendation</>}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}