// src/pages/student/Applications.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, Circle, ChevronRight } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';

const STAGE_ICONS = {
  done: CheckCircle,
  active: Clock,
  pending: Circle,
};

const STAGE_COLORS = {
  done: 'text-green-400',
  active: 'text-blue-electric',
  pending: 'text-white/20',
};

const normalize = (value) => String(value || '').trim().toLowerCase();

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value === 'string') return new Date(value).getTime() || 0;
  if (value?.toDate) return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return 0;
};

const formatDate = (value) => {
  if (!value) return 'TBD';
  if (typeof value === 'string') return value.slice(0, 10);
  if (value?.toDate) return value.toDate().toLocaleDateString();
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
};

const buildTimeline = (status, appliedAt) => {
  const normalized = normalize(status);
  const appliedLabel = formatDate(appliedAt);
  const stages = [{ stage: 'Applied', date: appliedLabel, status: 'done' }];

  if (normalized === 'rejected') {
    stages.push({ stage: 'Rejected', date: 'Latest update', status: 'done' });
    return stages;
  }

  if (normalized !== 'applied') {
    stages.push({ stage: 'Shortlisted', date: 'Latest update', status: 'done' });
  }

  if (['selected', 'placed', 'offer'].includes(normalized)) {
    stages.push({ stage: 'Offer', date: 'Latest update', status: 'done' });
  } else {
    stages.push({ stage: 'Technical Round 1', date: 'Latest update', status: normalized === 'shortlisted' ? 'active' : 'pending' });
    stages.push({ stage: 'Offer', date: 'TBD', status: 'pending' });
  }

  return stages;
};

const buildOverallStatus = (status) => {
  const normalized = normalize(status);
  if (['selected', 'placed', 'offer'].includes(normalized)) return 'Selected';
  if (normalized === 'shortlisted') return 'Shortlisted';
  if (normalized === 'rejected') return 'Rejected';
  return 'Applied';
};

export default function StudentApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!user?.uid) return undefined;

    const appsUnsub = onSnapshot(query(collection(db, 'applications'), where('studentId', '==', user.uid)), (snap) => {
      setApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => setApplications([]));

    const jobsUnsub = onSnapshot(collection(db, 'jobs'), (snap) => {
      setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => setJobs([]));

    return () => {
      appsUnsub();
      jobsUnsub();
    };
  }, [user?.uid]);

  const records = useMemo(() => applications.map((app) => {
    const job = jobs.find((item) => item.id === app.jobId) || {};
    return {
      id: app.id,
      company: job.company || app.company || 'N/A',
      role: job.title || app.role || 'N/A',
      appliedAt: formatDate(app.appliedAt || app.createdAt),
      ctc: job.ctc || app.ctc || 'N/A',
      timeline: buildTimeline(app.status, app.appliedAt || app.createdAt),
      overallStatus: buildOverallStatus(app.status),
    };
  }).sort((a, b) => toMillis(b.appliedAt) - toMillis(a.appliedAt)), [applications, jobs]);

  const selected = records.find((app) => app.id === selectedId) || records[0] || null;

  useEffect(() => {
    if (!selectedId && records.length) {
      setSelectedId(records[0].id);
    }
  }, [records, selectedId]);

  return (
    <DashboardLayout title="My Applications">
      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 space-y-3">
          <p className="text-white/40 text-xs font-body">{records.length} applications</p>
          {records.map((app, i) => (
            <motion.div key={app.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setSelectedId(app.id)}
              className={`glass-card p-4 cursor-pointer border transition-all ${
                selected?.id === app.id ? 'border-blue-electric/50 bg-blue-electric/5' : 'border-white/5 hover:border-white/15'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold text-sm">{app.company}</p>
                  <p className="text-white/50 text-xs font-body">{app.role}</p>
                  <p className="text-white/30 text-xs font-body mt-1">{app.appliedAt}</p>
                </div>
                <div className="text-right">
                  <p className="text-gold font-mono text-sm">{app.ctc}</p>
                  <p className="text-white/40 text-xs font-body mt-1">{app.overallStatus}</p>
                  <ChevronRight size={14} className="text-white/30 mt-1 ml-auto" />
                </div>
              </div>
            </motion.div>
          ))}
          {!records.length && (
            <div className="glass-card p-8 text-center border border-white/5 text-white/40 text-sm font-body">
              No applications found yet.
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          {selected ? (
            <motion.div key={selected.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 border border-white/10">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-heading font-bold text-white text-xl">{selected.company}</h3>
                  <span className="text-gold font-mono">{selected.ctc}</span>
                </div>
                <p className="text-white/50 font-body">{selected.role}</p>
                <p className="text-white/30 text-xs font-body mt-1">Applied {selected.appliedAt}</p>
              </div>

              <div className="glow-divider mb-6" />

              <p className="text-white/50 text-xs uppercase tracking-wider mb-5 font-body">Application Timeline</p>

              <div className="space-y-4">
                {selected.timeline.map((stage, i) => {
                  const Icon = STAGE_ICONS[stage.status];
                  return (
                    <motion.div key={stage.stage} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <Icon size={18} className={STAGE_COLORS[stage.status]} />
                        {i < selected.timeline.length - 1 && (
                          <div className={`w-px flex-1 mt-2 ${stage.status === 'done' ? 'bg-green-500/30' : 'bg-white/10'}`}
                            style={{ minHeight: '20px' }} />
                        )}
                      </div>
                      <div className="pb-4 flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`font-body font-semibold text-sm ${
                            stage.status === 'done' ? 'text-white' :
                            stage.status === 'active' ? 'text-blue-electric' : 'text-white/30'
                          }`}>{stage.stage}</p>
                          <span className="text-white/30 text-xs font-body">{stage.date}</span>
                        </div>
                        {stage.status === 'active' && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="mt-1 text-xs text-blue-electric/70 font-body flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-electric animate-pulse" />
                            In progress
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {selected.overallStatus === 'Selected' && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="mt-5 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
                  <CheckCircle size={28} className="text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 font-heading font-bold">Congratulations!</p>
                  <p className="text-white/60 text-sm font-body mt-1">You've been selected at {selected.company}</p>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <div className="glass-card p-10 border border-white/5 text-center text-white/40 text-sm font-body">
              No application details to show.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}