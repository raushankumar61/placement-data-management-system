// src/pages/admin/Notifications.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Send, Users, Briefcase, GraduationCap, BookOpen } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';

const SENT_NOTIFICATIONS = [
  { id: 1, message: 'Amazon drive registration deadline is tomorrow. Apply now!', target: 'students', sentAt: '2025-01-22 10:30', read: 145, total: 320 },
  { id: 2, message: 'New recruiter Infosys has been approved and posted 3 jobs.', target: 'all', sentAt: '2025-01-21 14:15', read: 89, total: 200 },
  { id: 3, message: 'Placement season officially begins. Update your profiles!', target: 'students', sentAt: '2025-01-20 09:00', read: 290, total: 320 },
  { id: 4, message: 'Faculty: Please verify pending student data submissions.', target: 'faculty', sentAt: '2025-01-19 16:45', read: 12, total: 18 },
];

const TARGET_ICONS = { students: GraduationCap, recruiters: Briefcase, faculty: BookOpen, all: Users };

export default function AdminNotifications() {
  const [form, setForm] = useState({ message: '', target: 'students', type: 'in-app' });
  const [sending, setSending] = useState(false);
  const [notifications, setNotifications] = useState(SENT_NOTIFICATIONS);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) return toast.error('Message is required');
    setSending(true);
    await new Promise((r) => setTimeout(r, 1000));
    setNotifications([{ id: Date.now(), message: form.message, target: form.target, sentAt: new Date().toLocaleString(), read: 0, total: 100 }, ...notifications]);
    toast.success('Notification sent!');
    setForm({ ...form, message: '' });
    setSending(false);
  };

  return (
    <DashboardLayout title="Notifications">
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Compose */}
        <div className="lg:col-span-1">
          <div className="glass-card p-5 border border-white/10">
            <div className="flex items-center gap-2 mb-5">
              <Bell size={16} className="text-blue-electric" />
              <p className="section-title">Send Notification</p>
            </div>
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Target Audience</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'students', label: 'Students', count: '320' },
                    { value: 'recruiters', label: 'Recruiters', count: '18' },
                    { value: 'faculty', label: 'Faculty', count: '12' },
                    { value: 'all', label: 'Everyone', count: 'All' },
                  ].map((t) => (
                    <button key={t.value} type="button" onClick={() => setForm({ ...form, target: t.value })}
                      className={`p-2 rounded-xl border text-xs font-body transition-all flex items-center justify-between gap-2 ${
                        form.target === t.value
                          ? 'border-blue-electric/50 bg-blue-electric/10 text-blue-electric'
                          : 'border-white/10 text-white/40 hover:border-white/20'
                      }`}>
                      <span>{t.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${form.target === t.value ? 'bg-white/15 text-white' : 'bg-white/8 text-white/60'}`}>
                        {t.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Channel</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="input-field text-sm appearance-none">
                  <option value="in-app" className="bg-dark-700">In-App</option>
                  <option value="email" className="bg-dark-700">Email</option>
                  <option value="both" className="bg-dark-700">Both</option>
                </select>
              </div>

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Message *</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="input-field text-sm resize-none"
                  rows={5}
                  placeholder="Write your notification message here..."
                  required
                />
                <p className="text-white/30 text-xs font-body mt-1">{form.message.length}/500 characters</p>
              </div>

              <button type="submit" disabled={sending}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-3 disabled:opacity-50">
                {sending ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><Send size={14} /> Send Notification</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* History */}
        <div className="lg:col-span-2 space-y-4">
          <p className="section-title">Notification History</p>
          {notifications.map((n, i) => {
            const Icon = TARGET_ICONS[n.target] || Users;
            const readPct = Math.round((n.read / n.total) * 100);
            return (
              <motion.div key={n.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }} className="glass-card p-4 border border-white/5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-electric/10 border border-blue-electric/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={14} className="text-blue-electric" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 text-sm font-body leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="badge-blue capitalize">{n.target}</span>
                      <span className="text-white/30 text-xs font-body">{n.sentAt}</span>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs font-body mb-1">
                        <span className="text-white/40">Read rate</span>
                        <span className="text-white/60">{n.read}/{n.total} ({readPct}%)</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${readPct}%` }}
                          transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                          className="h-full rounded-full bg-blue-electric" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
