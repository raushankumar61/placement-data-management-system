// src/pages/student/Profile.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Save, Upload, FileText, Sparkles } from 'lucide-react';
import DashboardLayout from '../../components/common/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../services/firebase';
import toast from 'react-hot-toast';
import { validateForm, validators } from '../../utils/validation';
import { fillStudentDefaults } from '../../utils/studentDefaults';
import { parseResume } from '../../services/api';

const BRANCHES = ['Computer Science', 'Information Technology', 'Electronics & Communication', 'Mechanical', 'Civil', 'Electrical', 'Artificial Intelligence & Machine Learning', 'Data Science'];

const DEFAULT_FORM = {
  name: '',
  email: '',
  phone: '',
  rollNo: '',
  usn: '',
  branch: '',
  cgpa: '',
  graduationYear: '',
  tenthPercentage: '',
  twelfthPercentage: '',
  backlogCount: 0,
  placementStatus: 'unplaced',
  placementReadinessScore: 0,
  companyPlaced: '',
  currentPackage: '',
  highestPackage: '',
  offersCount: 0,
  offerCompanies: [],
  skills: [],
  bio: '',
  linkedin: '',
  github: '',
  projects: [],
  certificationLinks: [],
  interviewExperience: '',
  improvementSuggestions: [],
  resumeURL: '',
  address: '',
  dateOfBirth: '',
  gender: '',
};

const normalizeList = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
};

export default function StudentProfile() {
  const { userProfile, user, refreshProfile } = useAuth();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [newSkill, setNewSkill] = useState('');
  const [newOfferCompany, setNewOfferCompany] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    if (!user?.uid) return undefined;
    const studentRef = doc(db, 'students', user.uid);
    const unsub = onSnapshot(studentRef, (snap) => {
      const data = snap.exists() ? snap.data() : {};
      const normalized = fillStudentDefaults({
        ...DEFAULT_FORM,
        ...data,
      }, user.uid);
      setForm({
        ...normalized,
        name: normalized.name || userProfile?.name || '',
        email: normalized.email || userProfile?.email || user?.email || '',
        branch: normalized.branch || userProfile?.branch || userProfile?.department || '',
      });
    }, () => {
      setForm((prev) => ({ ...prev, name: userProfile?.name || '', email: userProfile?.email || user?.email || '' }));
    });

    return unsub;
  }, [user?.uid, user?.email, userProfile?.name, userProfile?.email, userProfile?.branch, userProfile?.department]);

  const addSkill = () => {
    if (!newSkill.trim()) return;
    if (form.skills.includes(newSkill.trim())) return;
    setForm({ ...form, skills: [...form.skills, newSkill.trim()] });
    setNewSkill('');
  };

  const removeSkill = (idx) => setForm({ ...form, skills: form.skills.filter((_, i) => i !== idx) });

  const addOfferCompany = () => {
    if (!newOfferCompany.trim()) return;
    if (form.offerCompanies.includes(newOfferCompany.trim())) return;
    setForm({ ...form, offerCompanies: [...form.offerCompanies, newOfferCompany.trim()] });
    setNewOfferCompany('');
  };

  const removeOfferCompany = (idx) => setForm({ ...form, offerCompanies: form.offerCompanies.filter((_, i) => i !== idx) });

  // ── Resume Upload ───────────────────────────────────────────────────────────
  const handleResumeUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are supported');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5 MB');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    const storageRef = ref(storage, `resumes/${user.uid}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      },
      (err) => {
        toast.error('Upload failed: ' + err.message);
        setUploading(false);
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setForm((prev) => ({ ...prev, resumeURL: url }));
          toast.success('Resume uploaded! Click "Parse Skills" to extract skills automatically.');
        } catch (err) {
          toast.error('Could not get download URL');
        } finally {
          setUploading(false);
          setUploadProgress(0);
        }
      }
    );
  };

  // ── Resume Skill Parsing ─────────────────────────────────────────────────────
  const handleParseSkills = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Please upload a PDF'); return; }
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append('resume', file);
      const { data } = await parseResume(fd);
      const newSkills = (data.skills || []).filter((s) => !form.skills.includes(s));
      setForm((prev) => ({ ...prev, skills: [...prev.skills, ...newSkills] }));
      toast.success(`Extracted ${newSkills.length} skill${newSkills.length !== 1 ? 's' : ''} from your resume!`);
    } catch {
      toast.error('Could not parse resume. Try again.');
    } finally {
      setParsing(false);
    }
  };

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
      const normalized = fillStudentDefaults(form, user.uid);
      const payload = {
        ...normalized,
        cgpa: Number(normalized.cgpa || 0),
        backlogCount: Number(normalized.backlogCount || 0),
        offersCount: Number(normalized.offersCount || 0),
        placementReadinessScore: Number(normalized.placementReadinessScore || 0),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'students', user.uid), payload, { merge: true });
      await setDoc(doc(db, 'users', user.uid), { name: payload.name, branch: payload.branch, phone: payload.phone }, { merge: true });
      await refreshProfile();
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout title="My Profile">
      <form onSubmit={handleSave} className="space-y-5 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-electric/40 to-gold/20 flex items-center justify-center border border-white/10">
            <span className="font-heading font-bold text-white text-2xl">{form.name?.[0]?.toUpperCase() || 'S'}</span>
          </div>
          <div>
            <p className="text-white font-heading font-bold text-xl">{form.name || 'Student Name'}</p>
            <p className="text-white/40 text-sm font-body">{form.branch || 'Branch'} · CGPA: {form.cgpa || '0'} · Status: {form.placementStatus || 'unplaced'}</p>
          </div>
        </motion.div>

        <div className="glass-card p-5 space-y-4">
          <p className="section-title">Academic And Contact Details</p>
          <div className="grid md:grid-cols-3 gap-4">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field text-sm" placeholder="Full name" />
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field text-sm" placeholder="Email" />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field text-sm" placeholder="Phone" />

            <input value={form.rollNo} onChange={(e) => setForm({ ...form, rollNo: e.target.value })} className="input-field text-sm" placeholder="Roll number" />
            <input value={form.usn} onChange={(e) => setForm({ ...form, usn: e.target.value })} className="input-field text-sm" placeholder="USN" />
            <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className="input-field text-sm appearance-none">
              <option value="">Select Branch</option>
              {BRANCHES.map((branch) => <option key={branch} value={branch} className="bg-dark-700">{branch}</option>)}
            </select>

            <input type="number" step="0.1" min="0" max="10" value={form.cgpa} onChange={(e) => setForm({ ...form, cgpa: e.target.value })} className="input-field text-sm" placeholder="CGPA" />
            <input value={form.graduationYear} onChange={(e) => setForm({ ...form, graduationYear: e.target.value })} className="input-field text-sm" placeholder="Graduation year" />
            <input type="number" min="0" value={form.backlogCount} onChange={(e) => setForm({ ...form, backlogCount: e.target.value })} className="input-field text-sm" placeholder="Backlogs" />

            <input value={form.tenthPercentage} onChange={(e) => setForm({ ...form, tenthPercentage: e.target.value })} className="input-field text-sm" placeholder="10th %" />
            <input value={form.twelfthPercentage} onChange={(e) => setForm({ ...form, twelfthPercentage: e.target.value })} className="input-field text-sm" placeholder="12th %" />
            <input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} className="input-field text-sm" />

            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="input-field text-sm appearance-none">
              <option value="">Gender</option>
              <option value="male" className="bg-dark-700">Male</option>
              <option value="female" className="bg-dark-700">Female</option>
              <option value="other" className="bg-dark-700">Other</option>
            </select>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field text-sm resize-none md:col-span-2" rows={2} placeholder="Address" />
          </div>
        </div>

        <div className="glass-card p-5 space-y-4">
          <p className="section-title">Placement Details</p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="input-field text-sm flex items-center justify-between gap-3 opacity-90">
              <span className="text-white/50 text-xs uppercase tracking-wider font-body">Placement Status</span>
              <span className="text-white font-semibold capitalize">{form.placementStatus || 'unplaced'}</span>
            </div>
            <input value={form.companyPlaced} onChange={(e) => setForm({ ...form, companyPlaced: e.target.value })} className="input-field text-sm" placeholder="Company placed in" />
            <input value={form.currentPackage} onChange={(e) => setForm({ ...form, currentPackage: e.target.value })} className="input-field text-sm" placeholder="Current package (LPA)" />

            <input value={form.highestPackage} onChange={(e) => setForm({ ...form, highestPackage: e.target.value })} className="input-field text-sm" placeholder="Highest package (LPA)" />
            <input type="number" min="0" value={form.offersCount} onChange={(e) => setForm({ ...form, offersCount: e.target.value })} className="input-field text-sm" placeholder="Offers count" />
            <input type="number" min="0" max="100" value={form.placementReadinessScore} onChange={(e) => setForm({ ...form, placementReadinessScore: e.target.value })} className="input-field text-sm" placeholder="Readiness score" />
          </div>

          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider font-body mb-1.5">Offer Companies</p>
            <div className="flex gap-2">
              <input value={newOfferCompany} onChange={(e) => setNewOfferCompany(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOfferCompany())} className="input-field text-sm flex-1" placeholder="Add company" />
              <button type="button" onClick={addOfferCompany} className="btn-outline px-3 py-2"><Plus size={16} /></button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {form.offerCompanies.map((company, idx) => (
                <span key={`${company}-${idx}`} className="badge-blue flex items-center gap-1.5 pr-1">
                  {company}
                  <button type="button" onClick={() => removeOfferCompany(idx)} className="hover:text-red-400 transition-colors"><X size={10} /></button>
                </span>
              ))}
            </div>
          </div>

          <textarea value={form.interviewExperience} onChange={(e) => setForm({ ...form, interviewExperience: e.target.value })} className="input-field text-sm resize-none" rows={3} placeholder="Interview experience" />
          <textarea
            value={Array.isArray(form.improvementSuggestions) ? form.improvementSuggestions.join('\n') : String(form.improvementSuggestions || '')}
            onChange={(e) => setForm({ ...form, improvementSuggestions: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
            className="input-field text-sm resize-none"
            rows={4}
            placeholder="Improvement suggestions (one per line)"
          />
        </div>

        <div className="glass-card p-5 space-y-4">
          <p className="section-title">Portfolio Links And Skills</p>
          <div className="grid md:grid-cols-2 gap-4">
            <input value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} className="input-field text-sm" placeholder="LinkedIn URL" />
            <input value={form.github} onChange={(e) => setForm({ ...form, github: e.target.value })} className="input-field text-sm" placeholder="GitHub URL" />

            {/* Resume Upload */}
            <div className="md:col-span-2">
              <p className="text-white/50 text-xs uppercase tracking-wider font-body mb-2">Resume (PDF)</p>
              <div className="flex flex-wrap gap-2 items-center">
                {form.resumeURL && (
                  <a href={form.resumeURL} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 badge-blue text-xs py-1.5 px-3 hover:bg-blue-electric/20 transition-colors">
                    <FileText size={12} /> View Current Resume
                  </a>
                )}
                <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border text-xs font-body transition-all ${
                  uploading ? 'border-blue-electric/50 text-blue-electric' : 'border-white/15 text-white/50 hover:border-white/30 hover:text-white/70'
                }`}>
                  <Upload size={13} />
                  {uploading ? `Uploading ${uploadProgress}%…` : 'Upload PDF'}
                  <input type="file" accept="application/pdf" className="hidden" onChange={handleResumeUpload} disabled={uploading} />
                </label>
                <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border text-xs font-body transition-all ${
                  parsing ? 'border-gold/50 text-gold' : 'border-white/15 text-white/50 hover:border-gold/30 hover:text-gold'
                }`}>
                  <Sparkles size={13} />
                  {parsing ? 'Extracting skills…' : 'Parse Skills from PDF'}
                  <input type="file" accept="application/pdf" className="hidden" onChange={handleParseSkills} disabled={parsing} />
                </label>
              </div>
              {uploading && (
                <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-electric rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
            </div>

            <input
              value={Array.isArray(form.projects) ? form.projects.join(', ') : String(form.projects || '')}
              onChange={(e) => setForm({ ...form, projects: normalizeList(e.target.value) })}
              className="input-field text-sm md:col-span-2"
              placeholder="Projects (comma separated)"
            />
            <input
              value={Array.isArray(form.certificationLinks) ? form.certificationLinks.join(', ') : String(form.certificationLinks || '')}
              onChange={(e) => setForm({ ...form, certificationLinks: normalizeList(e.target.value) })}
              className="input-field text-sm md:col-span-2"
              placeholder="Certification links (comma separated)"
            />
          </div>

          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="input-field text-sm resize-none" rows={3} placeholder="Bio" />

          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider font-body mb-1.5">Skills</p>
            <div className="flex gap-2">
              <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} className="input-field text-sm flex-1" placeholder="Add skill" />
              <button type="button" onClick={addSkill} className="btn-outline px-3 py-2"><Plus size={16} /></button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {form.skills.map((skill, idx) => (
                <motion.span key={`${skill}-${idx}`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="badge-blue flex items-center gap-1.5 pr-1">
                  {skill}
                  <button type="button" onClick={() => removeSkill(idx)} className="hover:text-red-400 transition-colors"><X size={10} /></button>
                </motion.span>
              ))}
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 text-sm py-3 px-6 disabled:opacity-50">
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </DashboardLayout>
  );
}