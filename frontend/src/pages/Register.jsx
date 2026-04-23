// src/pages/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Zap, Chrome, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { validateForm, validators } from '../utils/validation';

const ROLES = [
  { value: 'student', label: 'Student', desc: 'Looking for placement opportunities' },
  { value: 'admin', label: 'Placement Officer', desc: 'Manage campus placement drives' },
  { value: 'recruiter', label: 'Recruiter', desc: 'Hire talented candidates' },
  { value: 'faculty', label: 'Faculty / Coordinator', desc: 'Monitor department placements' },
];

const DEPARTMENTS = ['Computer Science', 'Information Technology', 'Electronics & Communication', 'Mechanical', 'Civil', 'Electrical', 'Chemical', 'Other'];

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', department: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const getRoleRedirect = (role) => {
    const map = { admin: '/admin/dashboard', student: '/student/dashboard', recruiter: '/recruiter/dashboard', faculty: '/faculty/dashboard' };
    return map[role] || '/dashboard';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm(
      form,
      {
        name: validators.required,
        email: [validators.required, validators.email],
        password: [validators.required, validators.minLength(6)],
        department: (value) => ((form.role === 'student' || form.role === 'faculty') ? validators.required(value) : null),
      }
    );
    if (Object.keys(errors).length) return toast.error(Object.values(errors)[0]);
    setLoading(true);
    try {
      const { profile } = await register(form);
      toast.success('Account created successfully!');
      navigate(getRoleRedirect(profile?.role));
    } catch (err) {
      toast.error(err.message?.replace('Firebase: ', '') || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      const { profile } = await loginWithGoogle(form.role);
      toast.success('Account created with Google!');
      navigate(getRoleRedirect(profile?.role));
    } catch (err) {
      toast.error('Google sign-up failed');
    }
  };

  return (
    <div className="min-h-screen mesh-bg grid-overlay flex items-center justify-center px-4 py-12">
      <div className="fixed top-1/3 right-1/4 w-72 h-72 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #F5A623, transparent)' }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-blue-electric/20 border border-blue-electric/40 flex items-center justify-center">
              <Zap size={18} className="text-blue-electric" />
            </div>
            <span className="font-heading font-bold text-xl text-white">
              Place<span className="text-blue-electric">Cloud</span>
            </span>
          </Link>
          <h1 className="font-heading font-bold text-3xl text-white mb-2">Create your account</h1>
          <p className="text-white/40 font-body text-sm">Join thousands of students & recruiters</p>
        </div>

        <div className="glass-card p-8 border border-white/10">
          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-3 font-body">I am a...</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setForm({ ...form, role: r.value })}
                  className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                    form.role === r.value
                      ? 'border-blue-electric/50 bg-blue-electric/10 text-white'
                      : 'border-white/10 bg-white/3 text-white/50 hover:border-white/20'
                  }`}
                >
                  <p className="font-semibold text-sm font-body">{r.label}</p>
                  <p className="text-xs opacity-60 mt-0.5 font-body">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all duration-200 mb-6 font-body text-sm font-medium"
          >
            <Chrome size={16} />
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs font-body">or with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 font-body">Full Name *</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="John Doe"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 font-body">Email *</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            {(form.role === 'student' || form.role === 'faculty') && (
              <div>
                <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 font-body">Department</label>
                <div className="relative">
                  <BookOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="input-field pl-10 appearance-none"
                  >
                    <option value="" className="bg-dark-700">Select Department</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d} className="bg-dark-700">{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 font-body">Password *</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min. 6 characters"
                  className="input-field pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-white/40 text-sm font-body mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-electric hover:text-blue-glow transition-colors font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
