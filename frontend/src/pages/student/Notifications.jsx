// src/pages/student/Notifications.jsx - Enhanced with real-time listeners
import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, BriefcaseIcon, Calendar, Info, Megaphone, Check, X } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  handleNotificationAction,
} from '../../services/api';
import { db } from '../../services/firebase';
import { collection, query, onSnapshot, orderBy, limit, where } from 'firebase/firestore';
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
  try {
    const d = new Date(val);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  } catch {
    return val;
  }
};

export default function StudentNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [actioningNotif, setActioningNotif] = useState(null);

  // Real-time listener for notifications
  useEffect(() => {
    if (!user?.uid) return;

    let active = true;

    // Set up real-time listener
    const q = query(
      collection(db, 'notifications'),
      where('targetRole', 'in', ['all', 'student']),
      orderBy('sentAt', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        if (!active) return;
        
        const notifs = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((n) => {
            // Show if for all roles OR specifically for this user OR no targetUid specified
            if (n.targetUid && n.targetUid !== user.uid) return false;
            return true;
          })
          .map((n) => ({
            ...n,
            isRead: Array.isArray(n.read) ? n.read.includes(user.uid) : false,
          }));

        setNotifications(notifs);
        setLoading(false);
      },
      (error) => {
        console.error('Notification listener error:', error);
        if (active) {
          // Fallback to API call on error
          const loadNotifications = async () => {
            try {
              const { data } = await getNotifications();
              if (active) setNotifications(data.notifications || []);
            } catch {
              if (active) setNotifications([]);
            } finally {
              if (active) setLoading(false);
            }
          };
          loadNotifications();
        }
      }
    );

    return () => {
      active = false;
      unsub();
    };
  }, [user?.uid]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  const markRead = async (notifId) => {
    if (!user?.uid) return;
    try {
      await markNotificationRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllRead = async () => {
    setMarking(true);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('All marked as read');
    } catch (err) {
      toast.error('Failed to mark all read');
    } finally {
      setMarking(false);
    }
  };

  const handleAction = async (notifId, action) => {
    setActioningNotif(notifId);
    try {
      await handleNotificationAction(notifId, action);
      
      // Show success message based on action
      const messages = {
        shortlist: 'You have been shortlisted!',
        reject: 'Application declined',
        review: 'Marked as reviewed',
      };
      toast.success(messages[action] || 'Action completed');
      
      // Mark notification as read after action
      await markRead(notifId);
    } catch (err) {
      toast.error(`Failed to ${action}: ${err?.response?.data?.error || err.message}`);
    } finally {
      setActioningNotif(null);
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
              const hasActions = n.actionable && Array.isArray(n.actions) && n.actions.length > 0;

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
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-white/30 text-xs font-body">{formatDate(n.sentAt)}</span>
                      {n.isRead && <span className="text-white/20 text-xs">✓ Read</span>}
                    </div>

                    {/* Action Buttons */}
                    {hasActions && !n.actionedAt && (
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {n.actions.includes('shortlist') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(n.id, 'shortlist');
                            }}
                            disabled={actioningNotif === n.id}
                            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Check size={12} />
                            {actioningNotif === n.id ? 'Processing...' : 'Shortlist'}
                          </button>
                        )}
                        {n.actions.includes('reject') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(n.id, 'reject');
                            }}
                            disabled={actioningNotif === n.id}
                            className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <X size={12} />
                            {actioningNotif === n.id ? 'Processing...' : 'Reject'}
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
