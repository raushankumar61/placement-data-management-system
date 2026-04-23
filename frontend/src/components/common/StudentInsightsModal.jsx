import React from 'react';
import { motion } from 'framer-motion';
import { X, User, GraduationCap, Briefcase, Building2, MessageSquare, TrendingUp } from 'lucide-react';

function MetricCard({ label, value, color = 'text-white' }) {
  return (
    <div className="glass-card p-3 border border-white/10">
      <p className="text-white/40 text-xs font-body mb-1">{label}</p>
      <p className={`font-heading font-bold text-lg ${color}`}>{value}</p>
    </div>
  );
}

export default function StudentInsightsModal({ open, onClose, student, insights }) {
  if (!open || !student) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="glass-card w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 border border-white/10"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider font-body">Student Profile Insights</p>
            <h2 className="section-title mt-1">{student.name || 'Student'}</h2>
            <p className="text-white/50 text-sm font-body mt-1">
              {student.rollNo || 'N/A'} · {student.branch || 'N/A'} · CGPA {Number(student.cgpa || 0).toFixed(1)}
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-3 mb-5">
          <MetricCard label="Placement Status" value={student.placementStatus || 'unplaced'} color="text-blue-electric" />
          <MetricCard label="No. of Placements" value={insights.placementsCount} color="text-green-400" />
          <MetricCard label="No. of Offers" value={insights.offersCount} color="text-gold" />
        </div>

        <div className="grid md:grid-cols-4 gap-3 mb-5">
          <MetricCard label="Activities Participated" value={insights.activityParticipationCount || 0} color="text-green-400" />
          <MetricCard label="Activities Missed" value={insights.activityMissedCount || 0} color="text-red-400" />
          <MetricCard label="Warnings" value={insights.activityWarningsCount || 0} color="text-gold" />
          <MetricCard
            label="Placement Activity Access"
            value={insights.placementActivityBlocked ? 'Blocked' : 'Open'}
            color={insights.placementActivityBlocked ? 'text-red-400' : 'text-blue-electric'}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-4">
            <div className="glass-card p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <User size={16} className="text-blue-electric" />
                <p className="text-white font-semibold text-sm">Basic Details</p>
              </div>
              <div className="space-y-2 text-sm font-body">
                <p className="text-white/70"><span className="text-white/40">Email:</span> {student.email || 'N/A'}</p>
                <p className="text-white/70"><span className="text-white/40">Phone:</span> {student.phone || 'N/A'}</p>
                <p className="text-white/70"><span className="text-white/40">Skills:</span> {insights.skillsText}</p>
              </div>
            </div>

            <div className="glass-card p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={16} className="text-green-400" />
                <p className="text-white font-semibold text-sm">Company / Package Details</p>
              </div>
              <div className="space-y-2 text-sm font-body">
                <p className="text-white/70">
                  <span className="text-white/40">Placed In:</span> {insights.companyText}
                </p>
                <p className="text-white/70">
                  <span className="text-white/40">Packages:</span> {insights.packageText}
                </p>
                <p className="text-white/70">
                  <span className="text-white/40">Applications:</span> {insights.applicationsCount}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="glass-card p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={16} className="text-gold" />
                <p className="text-white font-semibold text-sm">Interview Experience</p>
              </div>
              <p className="text-white/70 text-sm font-body leading-relaxed">{insights.interviewExperience}</p>
              <p className="text-white/40 text-xs font-body mt-3">Interviews tracked: {insights.interviewCount}</p>
            </div>

            <div className="glass-card p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-blue-electric" />
                <p className="text-white font-semibold text-sm">Suggestions For Improvement</p>
              </div>
              <ul className="space-y-2">
                {insights.suggestions.map((item) => (
                  <li key={item} className="text-white/70 text-sm font-body leading-relaxed">
                    - {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-card p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap size={16} className="text-purple-400" />
                <p className="text-white font-semibold text-sm">Offer Summary</p>
              </div>
              <p className="text-white/70 text-sm font-body">{insights.offerSummary}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
