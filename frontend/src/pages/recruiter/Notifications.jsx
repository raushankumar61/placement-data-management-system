import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Check, X, Info, Briefcase, Calendar } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';
import { getNotifications, handleNotificationAction, markAllNotificationsRead, markNotificationRead } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';

const TYPE_ICON = {
  interview: Calendar,
  job: Briefcase,
  announcement: Info,
  default: Bell,
};

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
};

export default function RecruiterNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [actioningNotif, setActioningNotif] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;

    let active = true;

    const q = query(
      collection(db, 'notifications'),
      where('targetRole', 'in', ['all', 'recruiter']),
      orderBy('sentAt', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!active) return;
        const notifs = snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((notification) => {
            if (notification.targetUid && notification.targetUid !== user.uid) return false;
            return true;
          })
          .map((notification) => ({
            ...notification,
            isRead: Array.isArray(notification.read) ? notification.read.includes(user.uid) : false,
          }));

        setNotifications(notifs);
        setLoading(false);
      },
      async () => {
        if (!active) return;
        try {
          const { data } = await getNotifications();
          if (active) setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
        } catch {
          if (active) setNotifications([]);
        } finally {
          if (active) setLoading(false);
        }
      }
    );

    return () => {
      active = false;
      unsub();
    };
  }, [user?.uid]);

  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.isRead).length, [notifications]);

  const markRead = async (notifId) => {
    try {
      await markNotificationRead(notifId);
      setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n)));
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to mark as read');
    }
  };

  const markAllRead = async () => {
    setMarking(true);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All notifications marked read');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to mark all read');
    } finally {
      setMarking(false);
    }
  };

  const handleAction = async (notifId, action) => {
    setActioningNotif(notifId);
    try {
      await handleNotificationAction(notifId, action);
      const messages = {
        shortlist: 'Application shortlisted',
        reject: 'Application rejected',
        review: 'Marked as reviewed',
      };
      toast.success(messages[action] || 'Action completed');
      await markRead(notifId);
    } catch (err) {
      toast.error(err?.response?.data?.error || `Failed to ${action}`);
    } finally {
      setActioningNotif(null);
    }
  };

  const getIconKey = (notification) => {
    if (notification.interviewId || notification.type === 'interview') return 'interview';
    if (notification.applicationId || notification.type === 'job') return 'job';
    if (notification.type === 'announcement') return 'announcement';
    return 'default';
  };

  return (
    <DashboardLayout title="Recruiter Notifications">
      <div className="max-w-3xl space-y-4">
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
            {notifications.map((notification, index) => {
              const iconKey = getIconKey(notification);
              const Icon = TYPE_ICON[iconKey] || Bell;
              const hasActions = notification.actionable && Array.isArray(notification.actions) && notification.actions.length > 0;

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={() => !notification.isRead && markRead(notification.id)}
                  className={`glass-card p-4 flex items-start gap-4 cursor-pointer transition-all border ${
                    notification.isRead ? 'border-white/5 opacity-60' : 'border-blue-electric/20 hover:border-blue-electric/40'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-blue-electric bg-blue-electric/10">
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-body leading-relaxed ${notification.isRead ? 'text-white/50' : 'text-white/80'}`}>
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-white/30 text-xs font-body">{formatDate(notification.sentAt)}</span>
                      {notification.isRead && <span className="text-white/20 text-xs">✓ Read</span>}
                    </div>

                    {hasActions && !notification.actionedAt && (
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {notification.actions.includes('shortlist') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(notification.id, 'shortlist');
                            }}
                            disabled={actioningNotif === notification.id}
                            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Check size={12} />
                            {actioningNotif === notification.id ? 'Processing...' : 'Shortlist'}
                          </button>
                        )}
                        {notification.actions.includes('reject') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(notification.id, 'reject');
                            }}
                            disabled={actioningNotif === notification.id}
                            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <X size={12} />
                            {actioningNotif === notification.id ? 'Processing...' : 'Reject'}
                          </button>
                        )}
                        {notification.actions.includes('review') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(notification.id, 'review');
                            }}
                            disabled={actioningNotif === notification.id}
                            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Info size={12} />
                            {actioningNotif === notification.id ? 'Processing...' : 'Review'}
                          </button>
                        )}
                      </div>
                    )}
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