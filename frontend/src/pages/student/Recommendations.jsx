// src/pages/student/Recommendations.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Star, Briefcase, Zap, MapPin, DollarSign, TrendingUp, BookOpen } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getJobRecommendations } from '../../services/api';
import toast from 'react-hot-toast';

export default function StudentRecommendations() {
  const { user } = useAuth();

  // Faculty-sent recommendations
  const [facultyRecs, setFacultyRecs] = useState([]);
  // AI-powered job recommendations
  const [aiRecs, setAiRecs] = useState([]);
  const [loadingAi, setLoadingAi] = useState(true);
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'faculty'

  // Real-time faculty recommendations
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'recommendations'), where('studentId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setFacultyRecs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => setFacultyRecs([]));
    return unsub;
  }, [user?.uid]);

  // AI recommendations from backend
  useEffect(() => {
    const load = async () => {
      setLoadingAi(true);
      try {
        const { data } = await getJobRecommendations();
        setAiRecs(data.recommendations || []);
      } catch {
        toast.error('Could not load AI recommendations');
        setAiRecs([]);
      } finally {
        setLoadingAi(false);
      }
    };
    load();
  }, []);

  const TABS = [
    { key: 'ai', label: 'AI Picks', icon: Zap },
    { key: 'faculty', label: 'From Faculty', icon: BookOpen, count: facultyRecs.length },
  ];

  return (
    <DashboardLayout title="Recommendations">
      <div className="space-y-5 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 border border-blue-electric/20"
          style={{ background: 'linear-gradient(135deg, rgba(0,163,255,0.08), rgba(245,166,35,0.05))' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-electric/10 border border-blue-electric/20 flex items-center justify-center">
              <TrendingUp size={18} className="text-blue-electric" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-white text-lg">Your Recommendations</h2>
              <p className="text-white/40 text-sm font-body">AI-curated jobs + faculty endorsements tailored for you</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-body transition-all border ${
                activeTab === tab.key
                  ? 'bg-blue-electric/20 border-blue-electric/40 text-blue-electric'
                  : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.count != null && (
                <span className="w-4 h-4 rounded-full bg-blue-electric/20 text-blue-electric text-xs flex items-center justify-center">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* AI Picks */}
        {activeTab === 'ai' && (
          <div className="space-y-3">
            {loadingAi ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-5 animate-pulse">
                  <div className="h-5 bg-white/5 rounded w-1/2 mb-2" />
                  <div className="h-4 bg-white/5 rounded w-1/3" />
                </div>
              ))
            ) : aiRecs.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Zap size={36} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/50 font-body">No AI recommendations right now. Complete your profile with skills to get personalized picks.</p>
              </div>
            ) : (
              aiRecs.map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="glass-card p-5 border border-white/5 hover:border-blue-electric/30 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-electric/20 to-gold/10 flex items-center justify-center border border-white/10 flex-shrink-0">
                      <span className="font-heading font-bold text-white">{(job.company || '?')[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-white font-semibold">{job.title}</p>
                          <p className="text-blue-electric text-sm font-body">{job.company}</p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-lg">
                          <Zap size={11} className="text-green-400" />
                          <span className="text-green-400 text-xs font-body font-semibold">{job.matchScore}% match</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2">
                        {job.location && (
                          <div className="flex items-center gap-1 text-white/40 text-xs font-body">
                            <MapPin size={11} />{job.location}
                          </div>
                        )}
                        {job.ctc && (
                          <div className="flex items-center gap-1 text-white/40 text-xs font-body">
                            <DollarSign size={11} />{job.ctc}
                          </div>
                        )}
                        {job.type && (
                          <span className="badge-gray text-xs">{job.type}</span>
                        )}
                      </div>
                      {job.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {(Array.isArray(job.skills) ? job.skills : String(job.skills).split(',').map(s => s.trim())).slice(0, 5).map((s) => (
                            <span key={s} className="badge-blue text-xs">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* Faculty Recommendations */}
        {activeTab === 'faculty' && (
          <div className="space-y-3">
            {facultyRecs.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <BookOpen size={36} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/50 font-body">No faculty recommendations yet. Your placement coordinator will recommend you for suitable roles.</p>
              </div>
            ) : (
              facultyRecs.map((rec, i) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="glass-card p-5 border border-purple-500/20"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <Star size={16} className="text-purple-400" />
                      </div>
                      <div>
                        <p className="text-white font-semibold">{rec.role} <span className="text-white/40">at</span> {rec.company}</p>
                        <p className="text-white/50 text-sm font-body italic mt-0.5">"{rec.reason}"</p>
                        <div className="flex items-center gap-3 mt-2">
                          {rec.rating && (
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((r) => (
                                <Star key={r} size={12} className={r <= rec.rating ? 'text-gold fill-gold' : 'text-white/20'} />
                              ))}
                            </div>
                          )}
                          <p className="text-white/30 text-xs font-body">{rec.date}</p>
                        </div>
                      </div>
                    </div>
                    <span className={rec.status === 'Accepted' ? 'badge-green' : rec.status === 'Rejected' ? 'badge-red' : 'badge-gold'}>
                      {rec.status || 'Pending'}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
