// src/pages/faculty/DataVerification.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Eye, AlertCircle, Search } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';
import { collection, getDocs, updateDoc, doc, orderBy, query } from 'firebase/firestore';
import { db } from '../../services/firebase';

const FIELD_COLORS = {
  CGPA: 'badge-gold',
  Skills: 'badge-blue',
  Resume: 'badge-gray',
  Branch: 'badge-blue',
  Projects: 'badge-gray',
};

const STATUS_COLORS = {
  pending: 'badge-gold',
  approved: 'badge-green',
  rejected: 'badge-red',
};

export default function FacultyDataVerification() {
  const [verifications, setVerifications] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'verifications'), orderBy('submittedAt', 'desc')));
        const records = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setVerifications(records);
      } catch (error) {
        console.error('Error loading verifications:', error);
        setVerifications([]);
      }
    };
    load();
  }, []);

  const filtered = verifications.filter((v) => {
    const studentName = String(v.student || '').toLowerCase();
    const rollNo = String(v.rollNo || '').toLowerCase();
    const matchSearch = !search ||
      studentName.includes(search.toLowerCase()) ||
      rollNo.includes(search.toLowerCase());
    const matchFilter = filter === 'all' || v.status === filter;
    return matchSearch && matchFilter;
  });

  const handleApprove = async (id) => {
    try {
      await updateDoc(doc(db, 'verifications', id), { status: 'approved', comment, reviewedAt: new Date().toISOString() });
      setVerifications((prev) => prev.map((v) =>
        v.id === id ? { ...v, status: 'approved', comment } : v
      ));
      setSelected(null);
      setComment('');
      toast.success('Data change approved ✅');
    } catch {
      toast.error('Failed to approve');
    }
  };

  const handleReject = async (id) => {
    if (!comment.trim()) return toast.error('Please provide a reason for rejection');
    try {
      await updateDoc(doc(db, 'verifications', id), { status: 'rejected', comment, reviewedAt: new Date().toISOString() });
      setVerifications((prev) => prev.map((v) =>
        v.id === id ? { ...v, status: 'rejected', comment } : v
      ));
      setSelected(null);
      setComment('');
      toast.success('Data change rejected');
    } catch {
      toast.error('Failed to reject');
    }
  };

  const pendingCount = verifications.filter((v) => v.status === 'pending').length;
  const approvedCount = verifications.filter((v) => v.status === 'approved').length;
  const rejectedCount = verifications.filter((v) => v.status === 'rejected').length;

  return (
    <DashboardLayout title="Data Verification">
      <div className="space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pending Review', value: pendingCount, color: 'text-gold' },
            { label: 'Approved', value: approvedCount, color: 'text-green-400' },
            { label: 'Rejected', value: rejectedCount, color: 'text-red-400' },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4 text-center cursor-pointer"
              onClick={() => setFilter(s.label.toLowerCase().split(' ')[0])}>
              <p className={`font-heading font-bold text-2xl ${s.color}`}>{s.value}</p>
              <p className="text-white/40 text-xs font-body mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              placeholder="Search student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 py-2 text-sm w-52"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'approved', 'rejected'].map((f) => {
              const count = f === 'all' ? verifications.length : verifications.filter((v) => v.status === f).length;
              return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`tab-chip text-xs capitalize flex items-center gap-2 ${filter === f ? 'active' : ''}`}
              >
                {f}
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${filter === f ? 'bg-white/15 text-white' : 'bg-white/8 text-white/60'}`}>
                  {count}
                </span>
              </button>
            );})}
          </div>
        </div>

        {/* Pending alert */}
        {pendingCount > 0 && filter !== 'approved' && filter !== 'rejected' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-gold/10 border border-gold/20"
          >
            <AlertCircle size={16} className="text-gold flex-shrink-0" />
            <p className="text-gold/80 text-sm font-body">
              {pendingCount} student data {pendingCount === 1 ? 'change' : 'changes'} waiting for your verification
            </p>
          </motion.div>
        )}

        {/* Verification List */}
        <div className="grid lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 space-y-3">
            {filtered.map((v, i) => (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => { setSelected(v); setComment(''); }}
                className={`glass-card p-4 cursor-pointer border transition-all ${
                  selected?.id === v.id
                    ? 'border-blue-electric/50 bg-blue-electric/5'
                    : 'border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-white font-semibold text-sm">{v.student || 'Student'}</p>
                      <span className="text-white/30 font-mono text-xs">{v.rollNo || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={FIELD_COLORS[v.field] || 'badge-gray'}>{v.field}</span>
                      <span className={STATUS_COLORS[v.status]}>{v.status}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-body">
                      <span className="text-white/30 line-through">{v.oldValue}</span>
                      <span className="text-white/30">→</span>
                      <span className="text-white/70">{v.newValue}</span>
                    </div>
                  </div>
                    <p className="text-white/30 text-xs font-body flex-shrink-0">{v.submittedAt || 'N/A'}</p>
                </div>
              </motion.div>
            ))}

            {filtered.length === 0 && (
              <div className="glass-card p-12 text-center">
                <CheckCircle size={32} className="text-white/20 mx-auto mb-3" />
                <p className="text-white/40 font-body">No verifications found</p>
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-2">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-5 border border-white/10 sticky top-4 space-y-4"
              >
                <div>
                  <p className="section-title mb-1">{selected.student || 'Student'}</p>
                  <p className="text-white/40 text-xs font-body">{selected.rollNo || 'N/A'}</p>
                </div>

                <div className="glow-divider" />

                <div className="space-y-3">
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider font-body mb-1">Field Changed</p>
                    <span className={FIELD_COLORS[selected.field] || 'badge-gray'}>{selected.field}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                      <p className="text-red-400 text-xs font-body mb-1">Before</p>
                      <p className="text-white/60 text-sm font-body">{selected.oldValue}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20">
                      <p className="text-green-400 text-xs font-body mb-1">After</p>
                      <p className="text-white/70 text-sm font-body font-semibold">{selected.newValue}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider font-body mb-1">Evidence Provided</p>
                    <p className="text-white/60 text-sm font-body">{selected.evidence}</p>
                  </div>

                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider font-body mb-1">Submitted</p>
                    <p className="text-white/60 text-sm font-body">{selected.submittedAt}</p>
                  </div>
                </div>

                {selected.status === 'pending' && (
                  <>
                    <div className="glow-divider" />
                    <div>
                      <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">
                        Comment (required for rejection)
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="input-field text-sm resize-none"
                        rows={3}
                        placeholder="Add a comment or reason..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(selected.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-body"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                      <button
                        onClick={() => handleApprove(selected.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors text-sm font-body"
                      >
                        <CheckCircle size={14} /> Approve
                      </button>
                    </div>
                  </>
                )}

                {selected.status !== 'pending' && (
                  <div className={`p-3 rounded-xl text-center ${
                    selected.status === 'approved'
                      ? 'bg-green-500/10 border border-green-500/20'
                      : 'bg-red-500/10 border border-red-500/20'
                  }`}>
                    <p className={`font-semibold text-sm ${
                      selected.status === 'approved' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {selected.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                    </p>
                    {selected.comment && (
                      <p className="text-white/50 text-xs mt-1 font-body">{selected.comment}</p>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="glass-card p-12 text-center border border-white/5">
                <Eye size={28} className="text-white/20 mx-auto mb-3" />
                <p className="text-white/30 text-sm font-body">
                  Click a record to review
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}