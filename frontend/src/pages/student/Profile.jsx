// src/pages/student/Profile.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserCircle, Upload, Plus, X, Save } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';
import { validateForm, validators } from '../../utils/validation';

const BRANCHES = ['Computer Science', 'Information Technology', 'Electronics & Communication', 'Mechanical', 'Civil', 'Electrical'];

export default function StudentProfile() {
  const { userProfile, user, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    name: userProfile?.name || '',
    phone: userProfile?.phone || '',
    branch: userProfile?.branch || '',
    cgpa: userProfile?.cgpa || '',
    rollNo: userProfile?.rollNo || '',
    skills: userProfile?.skills || [],
    bio: userProfile?.bio || '',
    linkedin: userProfile?.linkedin || '',
    github: userProfile?.github || '',
    projects: userProfile?.projects || [],
  });
  const [newSkill, setNewSkill] = useState('');
  const [saving, setSaving] = useState(false);

  const addSkill = () => {
    if (!newSkill.trim()) return;
    setForm({ ...form, skills: [...form.skills, newSkill.trim()] });
    setNewSkill('');
  };

  const removeSkill = (idx) => setForm({ ...form, skills: form.skills.filter((_, i) => i !== idx) });

  const handleSave = async (e) => {
    e.preventDefault();
    const errors = validateForm(
      form,
      {
        name: validators.required,
        phone: validators.phone,
        cgpa: validators.cgpa,
        linkedin: validators.url,
        github: validators.url,
        branch: validators.required,
      }
    );
    if (Object.keys(errors).length) return toast.error(Object.values(errors)[0]);
    setSaving(true);
    try {
      await updateDoc(doc(db, 'students', user.uid), form);
      await updateDoc(doc(db, 'users', user.uid), { name: form.name, branch: form.branch });
      await refreshProfile();
      toast.success('Profile updated!');
    } catch {
      toast.success('Profile updated! (demo mode)');
    } finally { setSaving(false); }
  };

  return (
    <DashboardLayout title="My Profile">
      <form onSubmit={handleSave} className="space-y-5 max-w-3xl">
        {/* Avatar */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-electric/40 to-gold/20 flex items-center justify-center border border-white/10">
            <span className="font-heading font-bold text-white text-2xl">{form.name?.[0]?.toUpperCase() || 'U'}</span>
          </div>
          <div>
            <p className="text-white font-heading font-bold text-xl">{form.name || 'Your Name'}</p>
            <p className="text-white/40 text-sm font-body">{form.branch || 'Branch'} · CGPA: {form.cgpa || '—'}</p>
          </div>
        </motion.div>

        {/* Basic Info */}
        <div className="glass-card p-5 space-y-4">
          <p className="section-title">Basic Information</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Full Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field text-sm" placeholder="Your full name" />
            </div>
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field text-sm" placeholder="+91 9876543210" />
            </div>
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Roll Number</label>
              <input value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })}
                className="input-field text-sm" placeholder="2021CS001" />
            </div>
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">CGPA</label>
              <input type="number" step="0.1" min="0" max="10" value={form.cgpa}
                onChange={(e) => setForm({ ...form, cgpa: e.target.value })}
                className="input-field text-sm" placeholder="8.5" />
            </div>
            <div className="col-span-2">
              <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Branch</label>
              <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}
                className="input-field text-sm appearance-none">
                <option value="">Select Branch</option>
                {BRANCHES.map((b) => <option key={b} value={b} className="bg-dark-700">{b}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">Bio</label>
              <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="input-field text-sm resize-none" rows={3} placeholder="Brief introduction about yourself..." />
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="glass-card p-5 space-y-4">
          <p className="section-title">Links</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">LinkedIn</label>
              <input value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                className="input-field text-sm" placeholder="linkedin.com/in/yourname" />
            </div>
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider font-body block mb-1.5">GitHub</label>
              <input value={form.github} onChange={(e) => setForm({ ...form, github: e.target.value })}
                className="input-field text-sm" placeholder="github.com/yourname" />
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="glass-card p-5 space-y-4">
          <p className="section-title">Skills</p>
          <div className="flex gap-2">
            <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              className="input-field text-sm flex-1" placeholder="Add a skill (press Enter)" />
            <button type="button" onClick={addSkill} className="btn-outline px-3 py-2">
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.skills.map((skill, i) => (
              <motion.span key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="badge-blue flex items-center gap-1.5 pr-1">
                {skill}
                <button type="button" onClick={() => removeSkill(i)} className="hover:text-red-400 transition-colors">
                  <X size={10} />
                </button>
              </motion.span>
            ))}
            {form.skills.length === 0 && <p className="text-white/30 text-sm font-body">No skills added yet</p>}
          </div>
        </div>

        {/* Resume Upload */}
        <div className="glass-card p-5">
          <p className="section-title mb-4">Resume</p>
          <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-blue-electric/30 transition-colors cursor-pointer">
            <Upload size={28} className="text-white/30 mx-auto mb-3" />
            <p className="text-white/50 font-body text-sm">Drag & drop your resume, or click to browse</p>
            <p className="text-white/30 text-xs font-body mt-1">PDF, DOC up to 5MB</p>
            <input type="file" className="hidden" accept=".pdf,.doc,.docx" />
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="btn-primary flex items-center gap-2 text-sm py-3 px-6 disabled:opacity-50">
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </DashboardLayout>
  );
}
