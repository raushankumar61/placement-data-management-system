// src/pages/faculty/Notifications.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Send, Users, X } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';
import { sendNotification, getNotifications } from '../../services/api';

const TARGET_ROLES = [
  { value: 'student', label: 'All Students' },
  { value: 'all', label: 'Everyone (All Roles)' },
];

export default function FacultyNotifications() {
  const [form, setForm] = useState({ message: '', targetRole: 'student' });
  const [sending, setSending] = useState(false);
  const [sentList, setSentList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await getNotifications();
        // Show only notifications sent by faculty
        setSentList((data.notifications || []).filter((n) => n.sentByRole === 'faculty'));
      } catch {
        setSentList([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) return toast.error('Message cannot be empty');
    setSending(true);
    try {
      const { data } = await sendNotification(form);
      setSentList((prev) => [data, ...prev]);
      toast.success('Notification sent!');
      setForm({ message: '', targetRole: 'student' });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (val) => {
    if (!val) return '';
    try { return new Date(val).toLocaleString(); } catch { return val; }
  };

  return (
    <DashboardLayout title="Send Notifications">
      <div className="space-y-5 max-w-3xl">

        {/* Compose */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 border border-blue-electric/20">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-electric/10 border border-blue-electric/20 flex items-center justify-center">
              <Bell size={18} className="text-blue-electric" />
            </div>
            <div>
              <h2 className="section-title">Compose Notification</h2>
              <p className="text-white/40 text-xs font-body">Notify students or all system users instantly</p>
            </div>
          </div>

          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Target Audience</label>
              <div className="flex gap-2 flex-wrap">
                {TARGET_ROLES.map((r) => (
                  <button key={r.value} type="button" onClick={() => setForm({ ...form, targetRole: r.value })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-body border transition-all ${
                      form.targetRole === r.value
                        ? 'bg-blue-electric/20 border-blue-electric/40 text-blue-electric'
                        : 'border-white/10 text-white/40 hover:border-white/25'
                    }`}>
                    <Users size={13} />{r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">
                Message <span className="text-white/30">({form.message.length}/500)</span>
              </label>
              <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="input-field text-sm resize-none" rows={4} maxLength={500}
                placeholder="e.g. Placement drive for Google is scheduled on 5th May. All eligible CS/IT students please register..." required />
            </div>

            <button type="submit" disabled={sending}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm">
              {sending
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Send size={14} />}
              {sending ? 'Sending...' : 'Send Notification'}
            </button>
          </form>
        </motion.div>

        {/* Sent History */}
        <div>
          <p className="section-title mb-3">Sent by You</p>
          {loading ? (
            <div className="space-y-3">{[1, 2].map((i) => (
              <div key={i} className="glass-card p-4 animate-pulse">
                <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
                <div className="h-3 bg-white/5 rounded w-1/3" />
              </div>
            ))}</div>
          ) : sentList.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <Bell size={28} className="text-white/20 mx-auto mb-3" />
              <p className="text-white/40 font-body text-sm">You haven't sent any notifications yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sentList.map((n, i) => (
                <motion.div key={n.id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-4 border border-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-sm font-body leading-relaxed">{n.message}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="badge-blue text-xs">{n.targetRole === 'all' ? 'Everyone' : 'Students'}</span>
                        <span className="text-white/30 text-xs font-body">{formatDate(n.sentAt)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
