// src/pages/student/Notifications.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, BriefcaseIcon, Calendar, Info, Megaphone, Trash2 } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import {
  collection, query, where, onSnapshot, orderBy,
  doc, updateDoc, arrayUnion,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { markAllNotificationsRead } from '../../services/api';
import toast from 'react-hot-toast';

const TYPE_ICON = {
  interview: Calendar,
  job: BriefcaseIcon,
  announcement: Megaphone,
  default: Info,
};

const TYPE_COLOR = {
  interview: 'text-gold bg-gold/10',
  job: 'text-blue-electric bg-blue-electric/10',
  announcement: 'text-purple-400 bg-purple-500/10',
  default: 'text-white/60 bg-white/5',
};

const formatDate = (val) => {
  if (!val) return '';
  try { return new Date(val).toLocaleString(); } catch { return val; }
};

export default function StudentNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    // Listen to notifications targeting 'student' role or 'all' roles
    const q = query(
      collection(db, 'notifications'),
      orderBy('sentAt', 'desc'),
    );

    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Filter: target is 'all' | 'student', or specifically targeted to this uid
      const relevant = all.filter((n) => {
        const target = n.targetRole || 'all';
        const forMe = !n.targetUid || n.targetUid === user.uid;
        return forMe && (target === 'all' || target === 'student');
      }).map((n) => ({
        ...n,
        isRead: Array.isArray(n.read) ? n.read.includes(user.uid) : false,
      }));
      setNotifications(relevant);
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [user?.uid]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  const markRead = async (notifId) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'notifications', notifId), {
        read: arrayUnion(user.uid),
      });
    } catch (err) {
      console.warn('Mark read failed:', err.message);
    }
  };

  const markAllRead = async () => {
    setMarking(true);
    try {
      await markAllNotificationsRead();
      toast.success('All notifications marked as read');
    } catch {
      // Fallback: mark each individually
      for (const n of notifications.filter((x) => !x.isRead)) {
        await markRead(n.id);
      }
      toast.success('All notifications marked as read');
    } finally {
      setMarking(false);
    }
  };

  const getIcon = (n) => {
    if (n.interviewId || n.type === 'interview') return 'interview';
    if (n.applicationId || n.type === 'job') return 'job';
    if (n.type === 'announcement') return 'announcement';
    return 'default';
  };

  return (
    <DashboardLayout title="Notifications">
      <div className="max-w-3xl space-y-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 flex items-center justify-between flex-wrap gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-electric/10 border border-blue-electric/20 flex items-center justify-center relative">
              <Bell size={18} className="text-blue-electric" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-electric text-white text-xs flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <p className="text-white font-semibold">All Notifications</p>
              <p className="text-white/40 text-xs font-body">{unreadCount} unread · {notifications.length} total</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={marking}
              className="btn-outline text-xs py-2 px-3 flex items-center gap-2"
            >
              <CheckCheck size={14} />
              {marking ? 'Marking...' : 'Mark all read'}
            </button>
          )}
        </motion.div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-5 animate-pulse">
                <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
                <div className="h-3 bg-white/5 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-12 text-center">
            <Bell size={36} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/50 font-body">No notifications yet. Check back later.</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {notifications.map((n, i) => {
              const typeKey = getIcon(n);
              const Icon = TYPE_ICON[typeKey] || Info;
              const colorClass = TYPE_COLOR[typeKey] || TYPE_COLOR.default;

              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => !n.isRead && markRead(n.id)}
                  className={`glass-card p-4 flex items-start gap-4 cursor-pointer transition-all border ${
                    n.isRead
                      ? 'border-white/5 opacity-60'
                      : 'border-blue-electric/20 hover:border-blue-electric/40'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-body leading-relaxed ${n.isRead ? 'text-white/50' : 'text-white/80'}`}>
                      {n.message}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <p className="text-white/30 text-xs font-body">{formatDate(n.sentAt)}</p>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-electric flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </DashboardLayout>
  );
}
