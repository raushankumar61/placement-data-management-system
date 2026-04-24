// src/pages/admin/Applications.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { updateApplicationStatus } from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_CLASS = { Selected: 'badge-green', Shortlisted: 'badge-blue', Applied: 'badge-gray', Rejected: 'badge-red', 'In Process': 'badge-gold' };

export default function AdminApplications() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [applications, setApplications] = useState([]);

  const loadApplications = async () => {
    try {
      const [appsSnap, studentsSnap, jobsSnap] = await Promise.all([
        getDocs(collection(db, 'applications')),
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'jobs')),
      ]);

      const studentMap = new Map(studentsSnap.docs.map((d) => [d.id, d.data()]));
      const jobMap = new Map(jobsSnap.docs.map((d) => [d.id, d.data()]));

      const records = appsSnap.docs.map((d) => {
        const a = d.data();
        const s = studentMap.get(a.studentId) || {};
        const j = jobMap.get(a.jobId) || {};
        return {
          id: d.id,
          studentId: a.studentId || '',
          jobId: a.jobId || '',
          student: s.name || 'Student',
          rollNo: s.rollNo || 'N/A',
          company: j.company || 'N/A',
          role: j.title || 'N/A',
          branch: s.branch || 'N/A',
          status: a.status || 'Applied',
          appliedAt: (a.appliedAt || '').slice(0, 10) || 'N/A',
          cgpa: Number(s.cgpa || 0),
          source: a.source || 'Campus Drive',
          round: a.round || 'Screening',
          interviewDate: (a.interviewDate || '').slice(0, 10) || 'N/A',
          recruiterName: j.recruiterName || a.recruiterName || 'N/A',
          expectedCTC: a.expectedCTC || j.ctc || 'N/A',
          feedback: a.feedback || 'Pending',
        };
      });
      setApplications(records);
    } catch {
      setApplications([]);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const filtered = applications.filter((a) => {
    const matchSearch = !search || a.student.toLowerCase().includes(search.toLowerCase()) || a.company.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const updateStatus = async (id, status) => {
    try {
      await updateApplicationStatus(id, status);
      setApplications((prev) => prev.map((record) => (
        record.id === id ? { ...record, status } : record
      )));
      await loadApplications();
      toast.success('Application status updated');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to update application status');
    }
  };

  return (
    <DashboardLayout title="Application Tracker">
      <div className="space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['Applied', 'Shortlisted', 'In Process', 'Selected', 'Rejected'].map((s) => (
            <div key={s} className="glass-card p-4 text-center cursor-pointer hover:border-white/20 transition-colors border border-white/5"
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}>
              <p className={`font-heading font-bold text-xl ${
                s === 'Selected' ? 'text-green-400' : s === 'Rejected' ? 'text-red-400' :
                s === 'Shortlisted' ? 'text-blue-electric' : s === 'In Process' ? 'text-gold' : 'text-white/70'
              }`}>{applications.filter((a) => a.status === s).length}</p>
              <p className="text-white/40 text-xs font-body mt-1">{s}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="text" placeholder="Search..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="input-field pl-9 py-2 text-sm w-52" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field py-2 text-sm w-36 appearance-none">
            <option value="">All Status</option>
            {['Applied', 'Shortlisted', 'In Process', 'Selected', 'Rejected'].map((s) => (
              <option key={s} value={s} className="bg-dark-700">{s}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Student', 'Roll No', 'Company', 'Role', 'Source', 'Round', 'CGPA', 'Applied', 'Status', 'Action'].map((h) => (
                    <th key={h} className="table-header text-left px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((app, i) => (
                  <motion.tr key={app.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }} className="table-row">
                    <td className="px-4 py-3 text-white text-sm font-medium">{app.student}</td>
                    <td className="px-4 py-3 font-mono text-xs text-white/50">{app.rollNo}</td>
                    <td className="px-4 py-3 text-white/70 text-sm font-body">{app.company}</td>
                    <td className="px-4 py-3 text-white/60 text-xs font-body">{app.role}</td>
                    <td className="px-4 py-3 text-white/60 text-xs font-body">{app.source}</td>
                    <td className="px-4 py-3 text-white/60 text-xs font-body">{app.round}</td>
                    <td className="px-4 py-3 font-mono text-sm text-gold">{app.cgpa}</td>
                    <td className="px-4 py-3 text-white/40 text-xs font-body">{app.appliedAt}</td>
                    <td className="px-4 py-3"><span className={STATUS_CLASS[app.status]}>{app.status}</span></td>
                    <td className="px-4 py-3">
                      <select value={app.status} onChange={(e) => updateStatus(app.id, e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/60 text-xs appearance-none">
                        {['Applied', 'Shortlisted', 'Selected', 'Rejected'].map((s) => (
                          <option key={s} value={s} className="bg-dark-700">{s}</option>
                        ))}
                      </select>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
