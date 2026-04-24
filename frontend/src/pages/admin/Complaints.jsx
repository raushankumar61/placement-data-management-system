// src/pages/admin/Complaints.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, CheckCircle, Clock, AlertTriangle, X, Search, ChevronDown, Trash2 } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';
import { getComplaints, resolveComplaint, deleteComplaint } from '../../services/api';

const STATUS_BADGE = {
  open: 'badge-red',
  resolved: 'badge-green',
  closed: 'badge-gray',
};

const CATEGORY_BADGE = {
  technical: 'badge-blue',
  placement: 'badge-gold',
  recruiter: 'badge-gray',
  admin: 'badge-red',
  other: 'badge-gray',
};

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [resolution, setResolution] = useState('');
  const [resolving, setResolving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    try {
      const { data } = await getComplaints();
      setComplaints(data.complaints || []);
    } catch {
      toast.error('Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => complaints.filter((c) => {
    const matchSearch = !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  }), [complaints, search, statusFilter]);

  const stats = useMemo(() => ({
    total: complaints.length,
    open: complaints.filter((c) => c.status === 'open').length,
    resolved: complaints.filter((c) => c.status === 'resolved').length,
  }), [complaints]);

  const handleResolve = async (e) => {
    e.preventDefault();
    if (!resolution.trim()) return toast.error('Please enter a resolution message');
    setResolving(true);
    try {
      await resolveComplaint(selected.id, { resolution, status: 'resolved' });
      toast.success('Complaint resolved');
      setSelected(null);
      setResolution('');
      await load();
    } catch {
      toast.error('Failed to resolve complaint');
    } finally {
      setResolving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteComplaint(id);
      setComplaints((prev) => prev.filter((c) => c.id !== id));
      toast.success('Complaint deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (val) => {
    if (!val) return 'N/A';
    try { return new Date(val).toLocaleDateString(); } catch { return val; }
  };

  return (
    <DashboardLayout title="Complaints">
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-white', icon: MessageSquare },
            { label: 'Open', value: stats.open, color: 'text-red-400', icon: AlertTriangle },
            { label: 'Resolved', value: stats.resolved, color: 'text-green-400', icon: CheckCircle },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }} className="glass-card p-4 flex items-center gap-3">
              <s.icon size={18} className={s.color} />
              <div>
                <p className={`font-heading font-bold text-2xl ${s.color}`}>{s.value}</p>
                <p className="text-white/40 text-xs font-body">{s.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input placeholder="Search complaints..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 py-2 text-sm w-full" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field py-2 text-sm appearance-none w-36">
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {/* Complaints List */}
        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-5 bg-white/5 rounded w-1/2 mb-2" />
              <div className="h-3 bg-white/5 rounded w-3/4" />
            </div>
          ))}</div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <MessageSquare size={36} className="text-white/20 mx-auto mb-4" />
            <p className="text-white/50 font-body">No complaints found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5 border border-white/5 hover:border-white/15 transition-all">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-white font-semibold text-sm">{c.title}</p>
                      <span className={STATUS_BADGE[c.status] || 'badge-gray'}>{c.status}</span>
                      {c.category && <span className={CATEGORY_BADGE[c.category] || 'badge-gray'}>{c.category}</span>}
                    </div>
                    <p className="text-white/50 text-sm font-body line-clamp-2">{c.description}</p>
                    <p className="text-white/30 text-xs font-body mt-1">
                      By {c.createdByEmail || 'Unknown'} · {formatDate(c.createdAt)}
                    </p>
                    {c.resolution && (
                      <div className="mt-2 p-2 rounded-lg bg-green-500/5 border border-green-500/15">
                        <p className="text-green-400 text-xs font-body"><strong>Resolution:</strong> {c.resolution}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {c.status === 'open' && (
                      <button onClick={() => { setSelected(c); setResolution(''); }}
                        className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
                        <CheckCircle size={12} /> Resolve
                      </button>
                    )}
                    <button onClick={() => handleDelete(c.id)} disabled={deleting === c.id}
                      className="text-white/30 hover:text-red-400 transition-colors p-1.5">
                      {deleting === c.id ? <div className="w-4 h-4 border border-white/20 border-t-white/60 rounded-full animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Resolve Modal */}
        <AnimatePresence>
          {selected && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                className="glass-card w-full max-w-lg p-6 border border-white/10">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="section-title">Resolve Complaint</h2>
                  <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white"><X size={20} /></button>
                </div>
                <div className="mb-4 p-3 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-white font-semibold text-sm">{selected.title}</p>
                  <p className="text-white/50 text-xs font-body mt-1">{selected.description}</p>
                </div>
                <form onSubmit={handleResolve} className="space-y-4">
                  <div>
                    <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Resolution Message *</label>
                    <textarea value={resolution} onChange={(e) => setResolution(e.target.value)}
                      className="input-field text-sm resize-none" rows={4}
                      placeholder="Describe how the issue was resolved..." required />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setSelected(null)} className="btn-outline flex-1 text-sm py-2.5">Cancel</button>
                    <button type="submit" disabled={resolving}
                      className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-2">
                      {resolving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={14} />}
                      {resolving ? 'Resolving...' : 'Mark Resolved'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
