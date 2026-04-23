// src/pages/admin/Applications.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';

const DEMO_APPS = [
  { id: 1, student: 'Priya Sharma', rollNo: '2021CS001', company: 'Google', role: 'SDE', branch: 'CS', status: 'Selected', appliedAt: '2025-01-15', cgpa: 9.1 },
  { id: 2, student: 'Rahul Kumar', rollNo: '2021CS042', company: 'Amazon', role: 'SDE-2', branch: 'CS', status: 'Shortlisted', appliedAt: '2025-01-18', cgpa: 8.7 },
  { id: 3, student: 'Anjali Singh', rollNo: '2021EC015', company: 'Microsoft', role: 'Data Scientist', branch: 'ECE', status: 'Applied', appliedAt: '2025-01-20', cgpa: 8.3 },
  { id: 4, student: 'Amit Patel', rollNo: '2021IT008', company: 'Flipkart', role: 'Frontend Dev', branch: 'IT', status: 'Rejected', appliedAt: '2025-01-10', cgpa: 7.8 },
  { id: 5, student: 'Sneha Reddy', rollNo: '2021CS067', company: 'Infosys', role: 'Systems Analyst', branch: 'CS', status: 'Selected', appliedAt: '2025-01-12', cgpa: 8.0 },
  { id: 6, student: 'Vikram Nair', rollNo: '2021ME030', company: 'Wipro', role: 'Engineer', branch: 'Mech', status: 'Applied', appliedAt: '2025-01-22', cgpa: 7.5 },
  { id: 7, student: 'Deepa Menon', rollNo: '2021CS099', company: 'Adobe', role: 'UI Engineer', branch: 'CS', status: 'Shortlisted', appliedAt: '2025-01-19', cgpa: 9.0 },
];

const STATUS_CLASS = { Selected: 'badge-green', Shortlisted: 'badge-blue', Applied: 'badge-gray', Rejected: 'badge-red' };

export default function AdminApplications() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [applications, setApplications] = useState(DEMO_APPS);

  const filtered = applications.filter((a) => {
    const matchSearch = !search || a.student.toLowerCase().includes(search.toLowerCase()) || a.company.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const updateStatus = (id, status) => {
    setApplications((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
  };

  return (
    <DashboardLayout title="Application Tracker">
      <div className="space-y-5">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {['Applied', 'Shortlisted', 'Selected', 'Rejected'].map((s) => (
            <div key={s} className="glass-card p-4 text-center cursor-pointer hover:border-white/20 transition-colors border border-white/5"
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}>
              <p className={`font-heading font-bold text-xl ${
                s === 'Selected' ? 'text-green-400' : s === 'Rejected' ? 'text-red-400' :
                s === 'Shortlisted' ? 'text-blue-electric' : 'text-white/70'
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
            {['Applied', 'Shortlisted', 'Selected', 'Rejected'].map((s) => (
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
                  {['Student', 'Roll No', 'Company', 'Role', 'Branch', 'CGPA', 'Applied', 'Status', 'Action'].map((h) => (
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
                    <td className="px-4 py-3 text-white/60 text-xs font-body">{app.branch}</td>
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
