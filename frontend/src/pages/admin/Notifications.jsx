// src/pages/admin/Notifications.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Send, Users, Briefcase, GraduationCap, BookOpen } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';
import { sendNotification, getNotifications } from '../../services/api';

const TARGET_ICONS = { student: GraduationCap, recruiter: Briefcase, faculty: BookOpen, all: Users, admin: Users };
const TARGET_OPTIONS = [
  { value: 'student', label: 'Students', count: '320' },
  { value: 'recruiter', label: 'Recruiters', count: '18' },
  { value: 'faculty', label: 'Faculty', count: '12' },
  { value: 'all', label: 'Everyone', count: 'All' },
];

export default function AdminNotifications() {
  const [form, setForm] = useState({ message: '', targetRole: 'student', type: 'in-app' });
  const [sending, setSending] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getNotifications();
        setNotifications((data.notifications || []).filter((n) => n.sentByRole === 'admin'));
      } catch {
        setNotifications([]);
      }
    };
    load();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) return toast.error('Message is required');

    setSending(true);
    try {
      const { data } = await sendNotification(form);
      setNotifications((prev) => [data, ...prev]);
      toast.success('Notification sent!');
      setForm({ message: '', targetRole: 'student', type: 'in-app' });
    } catch {
      toast.error('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <DashboardLayout title="Notifications">
      <div className="grid lg:grid-cols-3 gap-5">
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
                    {TARGET_OPTIONS.map((t) => (
                      <button key={t.value} type="button" onClick={() => setForm({ ...form, targetRole: t.value })}
                      className={`p-2 rounded-xl border text-xs font-body transition-all flex items-center justify-between gap-2 ${
                          form.targetRole === t.value
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

        <div className="lg:col-span-2 space-y-4">
          <p className="section-title">Notification History</p>
          {notifications.map((n, i) => {
            const Icon = TARGET_ICONS[n.target] || Users;
            const readPct = Math.round(((Number(n.read || 0)) / (Number(n.total || 1))) * 100);
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
                      <span className="badge-blue capitalize">{n.targetRole || 'all'}</span>
                      <span className="text-white/30 text-xs font-body">{String(n.sentAt || '').replace('T', ' ').slice(0, 16)}</span>
                    </div>
                    <div className="mt-3">
                      <p className="text-white/40 text-xs font-body">
                        {Array.isArray(n.read) ? `${n.read.length} read` : 'Unread tracking unavailable'}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {!notifications.length && (
            <div className="glass-card p-5 border border-white/5 text-white/40 text-sm font-body">
              No notifications sent yet.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}