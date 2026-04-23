// src/pages/student/Interviews.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, Monitor, MessageSquare,
  Star, ChevronDown, ChevronUp, CheckCircle
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';

function StarRating({ rating }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          className={s <= rating ? 'text-gold fill-gold' : 'text-white/20'}
        />
      ))}
    </div>
  );
}

function InterviewCard({ interview }) {
  const [expanded, setExpanded] = useState(false);
  const isUpcoming = String(interview.status || '').toLowerCase() !== 'completed';
  const isPast = !isUpcoming;

  const daysLeft = () => {
    if (!interview.date) return null;
    const diff = new Date(interview.date) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (Number.isNaN(days) || days < 0) return null;
    if (days === 0) return 'Today!';
    if (days === 1) return 'Tomorrow';
    return `${days} days away`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card border transition-colors ${
        isUpcoming ? 'border-blue-electric/20' : 'border-white/5'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-electric/20 to-gold/10 flex items-center justify-center border border-white/10 flex-shrink-0">
              <span className="font-heading font-bold text-white">{(interview.company || '?')[0]}</span>
            </div>
            <div>
              <p className="text-white font-heading font-semibold">{interview.company}</p>
              <p className="text-white/50 text-sm font-body">{interview.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`badge ${isUpcoming ? 'badge-blue' : 'badge-green'}`}>
              {interview.round}
            </span>
            {isUpcoming && daysLeft() && (
              <span className="badge-gold">{daysLeft()}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          <div className="flex items-center gap-2 text-white/50">
            <Calendar size={13} className="text-white/30" />
            <span className="text-xs font-body">{interview.date}</span>
          </div>
          <div className="flex items-center gap-2 text-white/50">
            <Clock size={13} className="text-white/30" />
            <span className="text-xs font-body">{interview.time}</span>
          </div>
          <div className="flex items-center gap-2 text-white/50">
            <Monitor size={13} className="text-white/30" />
            <span className="text-xs font-body">{interview.mode} · {interview.platform}</span>
          </div>
        </div>

        {isUpcoming && interview.instructions && (
          <div className="mt-4 p-3 rounded-xl bg-blue-electric/5 border border-blue-electric/20">
            <p className="text-blue-electric text-xs font-semibold mb-1 font-body">📌 Instructions</p>
            <p className="text-white/60 text-xs font-body leading-relaxed">{interview.instructions}</p>
          </div>
        )}

        {isPast && interview.feedback && (
          <div className="mt-4">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-sm text-blue-electric font-body hover:underline"
            >
              <MessageSquare size={14} />
              {expanded ? 'Hide Feedback' : 'View Feedback'}
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        )}

        {isPast && !interview.feedback && (
          <div className="mt-4 p-3 rounded-xl bg-white/3 border border-white/5">
            <p className="text-white/30 text-xs font-body">No feedback available yet</p>
          </div>
        )}
      </div>

      {expanded && interview.feedback && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-white/5 p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-white font-heading font-semibold">Interview Feedback</p>
            <StarRating rating={interview.feedback.rating} />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20">
              <p className="text-green-400 text-xs font-semibold mb-2 font-body">✅ Strengths</p>
              <p className="text-white/60 text-sm font-body leading-relaxed">
                {interview.feedback.strengths}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-gold/5 border border-gold/20">
              <p className="text-gold text-xs font-semibold mb-2 font-body">💡 Areas to Improve</p>
              <p className="text-white/60 text-sm font-body leading-relaxed">
                {interview.feedback.improvements}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div>
              <p className="text-white/40 text-xs font-body">Result</p>
              <p className={`font-semibold text-sm mt-0.5 ${
                String(interview.feedback.result || '').includes('Selected') ? 'text-green-400' : 'text-blue-electric'
              }`}>
                {interview.feedback.result}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-xs font-body">Feedback by</p>
              <p className="text-white/60 text-xs mt-0.5 font-body">{interview.feedback.givenBy}</p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default function StudentInterviews() {
  const { user } = useAuth();
  const [tab, setTab] = useState('upcoming');
  const [interviews, setInterviews] = useState([]);

  useEffect(() => {
    if (!user?.uid) return undefined;

    const interviewsQuery = query(collection(db, 'interviews'), where('studentId', '==', user.uid));
    const unsub = onSnapshot(interviewsQuery, (snap) => {
      setInterviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => setInterviews([]));

    return unsub;
  }, [user?.uid]);

  const upcoming = useMemo(() => interviews.filter((interview) => String(interview.status || 'upcoming').toLowerCase() !== 'completed'), [interviews]);
  const completed = useMemo(() => interviews.filter((interview) => String(interview.status || '').toLowerCase() === 'completed'), [interviews]);
  const displayed = tab === 'upcoming' ? upcoming : completed;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Upcoming', value: upcoming.length, color: 'text-blue-electric' },
          { label: 'Completed', value: completed.length, color: 'text-green-400' },
          { label: 'With Feedback', value: completed.filter((interview) => interview.feedback).length, color: 'text-gold' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className={`font-heading font-bold text-2xl ${s.color}`}>{s.value}</p>
            <p className="text-white/40 text-xs font-body mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {['upcoming', 'completed'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`tab-chip capitalize flex items-center gap-2 ${tab === t ? 'active' : ''}`}
          >
            {t} ({t === 'upcoming' ? upcoming.length : completed.length})
            <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tab === t ? 'bg-white/15 text-white' : 'bg-white/8 text-white/60'}`}>
              {t === 'upcoming' ? upcoming.length : completed.length}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {displayed.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Calendar size={32} className="text-white/20 mx-auto mb-3" />
            <p className="text-white/40 font-body">
              No {tab} interviews
            </p>
          </div>
        ) : (
          displayed.map((interview, i) => (
            <motion.div
              key={interview.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <InterviewCard interview={interview} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}