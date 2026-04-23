// src/pages/recruiter/Dashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, Users, CheckCircle, ArrowRight, Star } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function RecruiterDashboard() {
  const { userProfile } = useAuth();
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'students'));
        const data = snap.docs.map((d) => {
          const v = d.data();
          const skills = Array.isArray(v.skills)
            ? v.skills
            : String(v.skills || '').split(',').map((s) => s.trim()).filter(Boolean);
          return {
            id: d.id,
            name: v.name || 'Student',
            branch: v.branch || 'Unknown',
            cgpa: Number(v.cgpa || 0),
            skills,
            placementStatus: (v.placementStatus || 'unplaced').toLowerCase(),
          };
        });
        setStudents(data);
      } catch {
        setStudents([]);
      }
    };

    load();
  }, []);

  const recentCandidates = useMemo(
    () => [...students]
      .filter((s) => s.placementStatus !== 'placed')
      .sort((a, b) => b.cgpa - a.cgpa)
      .slice(0, 5)
      .map((s) => ({ ...s, status: 'Under Review' })),
    [students]
  );

  return (
    <DashboardLayout title="Recruiter Dashboard">
      <div className="space-y-5">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass-card p-5 border border-blue-electric/20"
          style={{ background: 'linear-gradient(135deg, rgba(0,163,255,0.08), rgba(245,166,35,0.05))' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-white/60 text-sm font-body">Welcome,</p>
              <h2 className="font-heading font-bold text-2xl text-white">{userProfile?.name || 'Recruiter'}</h2>
              <p className="text-white/40 text-sm font-body mt-1">You have 3 active job postings</p>
            </div>
            <div className="flex gap-3">
              <Link to="/recruiter/post-job">
                <button className="btn-primary text-sm py-2.5 flex items-center gap-2">
                  Post a Job · 3 Live <ArrowRight size={14} />
                </button>
              </Link>
              <Link to="/recruiter/candidates">
                <button className="btn-outline text-sm py-2.5">Browse Candidates · 5 New</button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Jobs Posted', value: 3, color: 'text-blue-electric' },
            { label: 'Total Applicants', value: 187, color: 'text-gold' },
            { label: 'Shortlisted', value: 24, color: 'text-purple-400' },
            { label: 'Offers Made', value: 8, color: 'text-green-400' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }} className="glass-card p-4">
              <p className="text-white/40 text-xs font-body mb-1">{s.label}</p>
              <p className={`font-heading font-bold text-2xl ${s.color}`}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Recent Candidates */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-5">
            <p className="section-title">Recent Candidate Activity</p>
            <Link to="/recruiter/candidates" className="text-blue-electric text-xs font-body hover:underline">
              View all candidates
            </Link>
          </div>
          <div className="space-y-3">
            {recentCandidates.map((c, i) => (
              <motion.div key={c.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-electric/20 to-gold/10 flex items-center justify-center border border-white/10">
                  <span className="font-heading font-bold text-white text-sm">{c.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{c.name}</p>
                  <p className="text-white/40 text-xs font-body">{c.branch} · CGPA {c.cgpa}</p>
                  <div className="flex gap-1 mt-1">
                    {c.skills.map((s) => <span key={s} className="badge-blue text-xs">{s}</span>)}
                  </div>
                </div>
                <span className={c.status === 'Shortlisted' ? 'badge-blue' : 'badge-gray'}>{c.status}</span>
              </motion.div>
            ))}
            {recentCandidates.length === 0 && (
              <p className="text-white/40 text-sm font-body">No candidate activity yet.</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
