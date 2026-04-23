// src/pages/student/Applications.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, XCircle, Circle, ChevronRight } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';

const APPLICATIONS = [
  {
    id: 1, company: 'Google', role: 'SDE', appliedAt: 'Jan 15, 2025', ctc: '28 LPA',
    timeline: [
      { stage: 'Applied', date: 'Jan 15', status: 'done' },
      { stage: 'Shortlisted', date: 'Jan 18', status: 'done' },
      { stage: 'Technical Round 1', date: 'Feb 5', status: 'active' },
      { stage: 'Technical Round 2', date: 'TBD', status: 'pending' },
      { stage: 'HR Round', date: 'TBD', status: 'pending' },
      { stage: 'Offer', date: 'TBD', status: 'pending' },
    ],
  },
  {
    id: 2, company: 'Microsoft', role: 'Data Scientist', appliedAt: 'Jan 22, 2025', ctc: '18 LPA',
    timeline: [
      { stage: 'Applied', date: 'Jan 22', status: 'done' },
      { stage: 'Under Review', date: 'Jan 24', status: 'active' },
      { stage: 'Technical Round', date: 'TBD', status: 'pending' },
      { stage: 'Offer', date: 'TBD', status: 'pending' },
    ],
  },
  {
    id: 3, company: 'Infosys', role: 'Systems Analyst', appliedAt: 'Jan 10, 2025', ctc: '7 LPA',
    timeline: [
      { stage: 'Applied', date: 'Jan 10', status: 'done' },
      { stage: 'Shortlisted', date: 'Jan 12', status: 'done' },
      { stage: 'Online Test', date: 'Jan 16', status: 'done' },
      { stage: 'HR Round', date: 'Jan 20', status: 'done' },
      { stage: 'Selected', date: 'Jan 22', status: 'done' },
    ],
  },
];

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

export default function StudentApplications() {
  const [selected, setSelected] = useState(APPLICATIONS[0]);

  const overallStatus = (app) => {
    const last = [...app.timeline].reverse().find((t) => t.status === 'done');
    if (app.timeline[app.timeline.length - 1].status === 'done') return 'Selected';
    return last?.stage || 'Applied';
  };

  return (
    <DashboardLayout title="My Applications">
      <div className="grid lg:grid-cols-5 gap-5">
        {/* Application List */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-white/40 text-xs font-body">{APPLICATIONS.length} applications</p>
          {APPLICATIONS.map((app, i) => (
            <motion.div key={app.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setSelected(app)}
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
                  <p className="text-white/40 text-xs font-body mt-1">{overallStatus(app)}</p>
                  <ChevronRight size={14} className="text-white/30 mt-1 ml-auto" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Timeline Detail */}
        <div className="lg:col-span-3">
          {selected && (
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

              {overallStatus(selected) === 'Selected' && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="mt-5 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
                  <CheckCircle size={28} className="text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 font-heading font-bold">Congratulations!</p>
                  <p className="text-white/60 text-sm font-body mt-1">You've been selected at {selected.company}</p>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
