// src/pages/admin/Students.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Upload, Download, Trash2, Edit2, Filter, X, ChevronDown } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import { TableSkeleton } from '../../components/common/SkeletonLoader';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { bulkImportStudents } from '../../services/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const STATUS_COLORS = {
  placed: 'badge-green',
  unplaced: 'badge-gray',
  'in-process': 'badge-blue',
};

const BRANCHES = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical',
  'Civil',
  'Electrical',
  'Artificial Intelligence & Machine Learning',
  'Data Science',
  'Aerospace Engineering',
  'Biotechnology',
  'Robotics and Automation',
];

const INITIAL_FORM = { name: '', email: '', branch: '', cgpa: '', skills: '', placementStatus: 'unplaced', phone: '', rollNo: '' };

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'students'));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setStudents(data);
      setFiltered(data);
    } catch {
      setStudents([]);
      setFiltered([]);
      toast.error('Unable to load students. Check Firebase configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  useEffect(() => {
    let result = students;
    if (search) result = result.filter((s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNo?.toLowerCase().includes(search.toLowerCase())
    );
    if (branchFilter) result = result.filter((s) => s.branch === branchFilter);
    if (statusFilter) result = result.filter((s) => s.placementStatus === statusFilter);
    setFiltered(result);
  }, [search, branchFilter, statusFilter, students]);

  const openModal = (student = null) => {
    setEditStudent(student);
    setForm(student ? { ...student, skills: Array.isArray(student.skills) ? student.skills.join(', ') : student.skills } : INITIAL_FORM);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean), updatedAt: serverTimestamp() };
      if (editStudent?.id) {
        await updateDoc(doc(db, 'students', editStudent.id), payload);
        toast.success('Student updated');
      } else {
        await addDoc(collection(db, 'students'), { ...payload, createdAt: serverTimestamp() });
        toast.success('Student added');
      }
      setShowModal(false);
      fetchStudents();
    } catch {
      toast.error('Failed to save student');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this student?')) return;
    try {
      await deleteDoc(doc(db, 'students', id));
      setStudents((prev) => prev.filter((s) => s.id !== id));
      toast.success('Student deleted');
    } catch {
      toast.error('Failed to delete student');
    }
  };

  const handleExport = () => {
    const data = filtered.map(({ name, email, branch, cgpa, placementStatus, rollNo }) => ({
      Name: name, Email: email, Branch: branch, CGPA: cgpa, Status: placementStatus, 'Roll No': rollNo
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'students_export.xlsx');
    toast.success('Exported to Excel');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const runImport = async () => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await bulkImportStudents(formData);
        toast.success(data?.message || 'Students imported');
        fetchStudents();
      } catch {
        toast.error('Import failed. Ensure you are logged in as admin and file format is valid.');
      }
    };

    runImport();
    e.target.value = '';
  };

  return (
    <DashboardLayout title="Student Management">
      <div className="space-y-5">
        {/* Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-3 items-center justify-between"
        >
          <div className="flex gap-3 flex-wrap flex-1">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9 py-2 text-sm w-52"
              />
            </div>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="input-field py-2 text-sm w-44 appearance-none"
            >
              <option value="">All Branches</option>
              {BRANCHES.map((b) => <option key={b} value={b} className="bg-dark-700">{b}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field py-2 text-sm w-36 appearance-none"
            >
              <option value="">All Status</option>
              <option value="placed" className="bg-dark-700">Placed</option>
              <option value="unplaced" className="bg-dark-700">Unplaced</option>
              <option value="in-process" className="bg-dark-700">In Process</option>
            </select>
            {(search || branchFilter || statusFilter) && (
              <button onClick={() => { setSearch(''); setBranchFilter(''); setStatusFilter(''); }}
                className="text-white/40 hover:text-white text-sm flex items-center gap-1 font-body">
                <X size={14} /> Clear
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <label className="btn-outline text-sm py-2 px-3 cursor-pointer flex items-center gap-2">
              <Upload size={14} />
              Import
              <input type="file" accept=".xlsx,.csv" onChange={handleImport} className="hidden" />
            </label>
            <button onClick={handleExport} className="btn-outline text-sm py-2 px-3 flex items-center gap-2">
              <Download size={14} /> Export
            </button>
            <button onClick={() => openModal()} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
              <Plus size={14} /> Add Student
            </button>
          </div>
        </motion.div>

        {/* Stats bar */}
        <div className="flex gap-4 text-sm font-body text-white/40">
          <span>Total: <span className="text-white">{filtered.length}</span></span>
          <span>Placed: <span className="text-green-400">{filtered.filter(s => s.placementStatus === 'placed').length}</span></span>
          <span>In Process: <span className="text-blue-electric">{filtered.filter(s => s.placementStatus === 'in-process').length}</span></span>
          <span>Unplaced: <span className="text-white/60">{filtered.filter(s => s.placementStatus === 'unplaced').length}</span></span>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card overflow-hidden"
        >
          {loading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Roll No', 'Name', 'Branch', 'CGPA', 'Skills', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="table-header text-left px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((student, i) => (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="table-row"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-white/60">{student.rollNo || '—'}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-white text-sm font-medium">{student.name}</p>
                          <p className="text-white/40 text-xs">{student.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/70 text-sm font-body">{student.branch}</td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-sm font-bold ${
                          parseFloat(student.cgpa) >= 8 ? 'text-green-400' :
                          parseFloat(student.cgpa) >= 6.5 ? 'text-gold' : 'text-red-400'
                        }`}>{student.cgpa}</span>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs max-w-32 truncate font-body">
                        {Array.isArray(student.skills) ? student.skills.join(', ') : student.skills}
                      </td>
                      <td className="px-4 py-3">
                        <span className={STATUS_COLORS[student.placementStatus] || 'badge-gray'}>
                          {student.placementStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openModal(student)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-blue-electric transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(student.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-16 text-center text-white/40 font-body">No students found</div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="glass-card w-full max-w-lg p-6 border border-white/10"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title">{editStudent ? 'Edit Student' : 'Add Student'}</h2>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Full Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input-field text-sm" placeholder="Student Name" required />
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Roll Number</label>
                  <input value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
                    className="input-field text-sm" placeholder="2021CS001" />
                </div>
              </div>
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Email *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field text-sm" placeholder="student@college.edu" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Branch</label>
                  <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}
                    className="input-field text-sm appearance-none">
                    <option value="">Select Branch</option>
                    {BRANCHES.map((b) => <option key={b} value={b} className="bg-dark-700">{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">CGPA</label>
                  <input type="number" step="0.1" min="0" max="10" value={form.cgpa}
                    onChange={(e) => setForm({ ...form, cgpa: e.target.value })}
                    className="input-field text-sm" placeholder="8.5" />
                </div>
              </div>
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Skills (comma-separated)</label>
                <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })}
                  className="input-field text-sm" placeholder="React, Node.js, Python" />
              </div>
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Placement Status</label>
                <select value={form.placementStatus} onChange={(e) => setForm({ ...form, placementStatus: e.target.value })}
                  className="input-field text-sm appearance-none">
                  <option value="unplaced" className="bg-dark-700">Unplaced</option>
                  <option value="in-process" className="bg-dark-700">In Process</option>
                  <option value="placed" className="bg-dark-700">Placed</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1 text-sm py-2.5">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (editStudent ? 'Update' : 'Add Student')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}
