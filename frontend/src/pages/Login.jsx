// src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Zap, Chrome } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { validateForm, validators } from '../utils/validation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const getRoleRedirect = (role) => {
    const map = { admin: '/admin/dashboard', student: '/student/dashboard', recruiter: '/recruiter/dashboard', faculty: '/faculty/dashboard' };
    return map[role] || '/dashboard';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const errors = validateForm(
      { email, password },
      {
        email: [validators.required, validators.email],
        password: [validators.required],
      }
    );
    if (Object.keys(errors).length) return toast.error(Object.values(errors)[0]);
    setLoading(true);
    try {
      const { profile } = await login(email, password);
      toast.success('Welcome back!');
      navigate(getRoleRedirect(profile?.role));
    } catch (err) {
      toast.error(err.message?.replace('Firebase: ', '') || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { profile } = await loginWithGoogle();
      toast.success('Signed in with Google!');
      navigate(getRoleRedirect(profile?.role));
    } catch (err) {
      toast.error('Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-bg grid-overlay flex items-center justify-center px-4">
      {/* Glow orbs */}
      <div className="fixed top-1/3 left-1/4 w-72 h-72 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #00A3FF, transparent)' }} />
      <div className="fixed bottom-1/3 right-1/4 w-72 h-72 rounded-full opacity-8 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #F5A623, transparent)' }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-blue-electric/20 border border-blue-electric/40 flex items-center justify-center">
              <Zap size={18} className="text-blue-electric" />
            </div>
            <span className="font-heading font-bold text-xl text-white">
              Place<span className="text-blue-electric">Cloud</span>
            </span>
          </Link>
          <h1 className="font-heading font-bold text-3xl text-white mb-2">Welcome back</h1>
          <p className="text-white/40 font-body text-sm">Sign in to your account to continue</p>
        </div>

        <div className="glass-card p-8 border border-white/10">
          {/* Google Button */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all duration-200 mb-6 font-body text-sm font-medium disabled:opacity-50"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Chrome size={16} />
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs font-body">or with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 font-body">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 font-body">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <a href="#" className="text-blue-electric text-xs font-body hover:text-blue-glow transition-colors">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-white/40 text-sm font-body mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-electric hover:text-blue-glow transition-colors font-medium">
              Create one
            </Link>
          </p>
        </div>

        {/* Demo accounts hint — only visible in development mode */}
        {import.meta.env.DEV && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 glass-card p-4 border border-gold/20"
          >
            <p className="text-gold text-xs font-semibold mb-2 font-body">Demo Accounts (dev only)</p>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-white/40">
              <span>admin@demo.com</span><span>student@demo.com</span>
              <span>recruiter@demo.com</span><span>faculty@demo.com</span>
              <span className="col-span-2 text-white/30">password: demo1234</span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
