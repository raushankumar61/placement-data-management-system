// src/pages/Login.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Zap, Chrome, Search, User, X, Briefcase, BookOpen, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { validateForm, validators } from '../utils/validation';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import { searchStudents } from '../services/api';

const ROLES = [
  { id: 'student', label: 'Student', icon: User, demoEmail: '' },
  { id: 'recruiter', label: 'Recruiter', icon: Briefcase, demoEmail: 'recruiter@demo.com' },
  { id: 'faculty', label: 'Faculty', icon: BookOpen, demoEmail: 'faculty@demo.com' },
  { id: 'admin', label: 'Admin', icon: Shield, demoEmail: 'admin@demo.com' }
];

export default function Login() {
  const [activeRole, setActiveRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Student Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const searchDebounceRef = useRef(null);

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  // Reset password states
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Handle Role Switching
  useEffect(() => {
    const roleConfig = ROLES.find(r => r.id === activeRole);
    if (activeRole !== 'student') {
      setEmail(roleConfig.demoEmail);
      setPassword('password123'); // Demo password
    } else {
      setEmail('');
      setPassword('');
      setSelectedStudent(null);
      setSearchQuery('');
    }
    setResetOpen(false);
  }, [activeRole]);

  // Handle Student Search
  useEffect(() => {
    if (activeRole !== 'student' || selectedStudent) return;
    
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const { data } = await searchStudents(searchQuery.trim());
        setSearchResults(data.students || []);
      } catch (err) {
        console.error('Failed to search students', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(searchDebounceRef.current);
  }, [searchQuery, activeRole, selectedStudent]);

  const getRoleRedirect = (role) => {
    const map = { admin: '/admin/dashboard', student: '/student/dashboard', recruiter: '/recruiter/dashboard', faculty: '/faculty/dashboard' };
    return map[role] || '/dashboard';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    const loginEmail = activeRole === 'student' && selectedStudent ? selectedStudent.email : email;
    
    if (activeRole === 'student' && !selectedStudent) {
      return toast.error('Please search and select your student account first');
    }

    const errors = validateForm(
      { email: loginEmail, password },
      {
        email: [validators.required, validators.email],
        password: [validators.required],
      }
    );
    if (Object.keys(errors).length) {
      return toast.error(Object.values(errors)[0]);
    }
    
    setLoading(true);
    try {
      const { profile } = await login(loginEmail, password);
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

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    const loginEmail = activeRole === 'student' && selectedStudent ? selectedStudent.email : email;
    const emailValue = resetEmail.trim() || loginEmail.trim();
    if (!emailValue) {
      return toast.error('Enter your email first');
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, emailValue);
      toast.success('Password reset email sent');
      setResetOpen(false);
    } catch (err) {
      toast.error(err.message?.replace('Firebase: ', '') || 'Could not send reset email');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-bg grid-overlay flex items-center justify-center px-4 py-12 overflow-y-auto">
      {/* Glow orbs */}
      <div className="fixed top-1/3 left-1/4 w-72 h-72 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #00A3FF, transparent)' }} />
      <div className="fixed bottom-1/3 right-1/4 w-72 h-72 rounded-full opacity-8 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #F5A623, transparent)' }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md my-auto relative z-10"
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
          <p className="text-white/40 font-body text-sm">Select your role to sign in</p>
        </div>

        <div className="glass-card p-6 border border-white/10 shadow-2xl">
          
          {/* Role Tabs */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5 mb-8">
            {ROLES.map(role => (
              <button
                key={role.id}
                type="button"
                onClick={() => setActiveRole(role.id)}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex flex-col items-center gap-1 transition-all ${
                  activeRole === role.id 
                    ? 'bg-blue-electric text-white shadow-lg shadow-blue-electric/20' 
                    : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <role.icon size={14} />
                {role.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Student Flow */}
            {activeRole === 'student' && (
              <>
                {!selectedStudent ? (
                  <div className="relative">
                    <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 font-body">Find Your Account</label>
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search Name, USN, or Email..."
                        className="input-field pl-10"
                        autoComplete="off"
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      )}
                    </div>
                    
                    {/* Autocomplete Results */}
                    {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
                      <div className="absolute top-full mt-2 w-full glass-card border border-white/10 max-h-60 overflow-y-auto z-50 p-2 shadow-2xl">
                        {searchResults.map(student => (
                          <div 
                            key={student.id}
                            onClick={() => {
                              setSelectedStudent(student);
                              setPassword('password123'); // Demo auto-fill password
                              setSearchQuery('');
                              setSearchResults([]);
                            }}
                            className="p-3 hover:bg-white/5 cursor-pointer rounded-lg transition-colors border border-transparent hover:border-white/5"
                          >
                            <div className="font-semibold text-white text-sm">{student.name}</div>
                            <div className="flex gap-2 mt-1">
                              {student.rollNo && <span className="badge-blue text-[10px] py-0">{student.rollNo}</span>}
                              <span className="text-white/40 text-xs font-body">{student.email}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {searchQuery.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
                      <div className="absolute top-full mt-2 w-full glass-card border border-white/10 p-4 text-center z-50">
                        <p className="text-white/40 text-xs font-body">No students found matching "{searchQuery}"</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="glass-card p-4 border border-blue-electric/30 bg-blue-electric/5 relative">
                    <button 
                      type="button" 
                      onClick={() => setSelectedStudent(null)}
                      className="absolute top-3 right-3 text-white/40 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-electric/20 flex items-center justify-center text-blue-electric font-bold text-lg">
                        {selectedStudent.name[0]}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{selectedStudent.name}</p>
                        <p className="text-white/60 text-xs font-body">{selectedStudent.rollNo || selectedStudent.email}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Non-Student Flow (Email Input) */}
            {activeRole !== 'student' && (
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
            )}

            {/* Password Input (Shown for non-students OR selected students) */}
            {(activeRole !== 'student' || selectedStudent) && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <label className="block text-white/60 text-xs font-semibold uppercase tracking-wider mb-2 font-body mt-4">Password</label>
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
              </motion.div>
            )}

            {(activeRole !== 'student' || selectedStudent) && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const loginEmail = activeRole === 'student' && selectedStudent ? selectedStudent.email : email;
                    setResetEmail(loginEmail);
                    setResetOpen((prev) => !prev);
                  }}
                  className="text-blue-electric text-xs font-body hover:text-blue-glow transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {resetOpen && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                <p className="text-white/60 text-xs font-body">
                  We’ll send a password reset link to the email address below.
                </p>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field text-sm"
                />
                <div className="flex items-center gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setResetOpen(false)}
                    className="text-white/40 text-xs font-body hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={resetLoading}
                    className="btn-outline py-2 px-3 text-xs disabled:opacity-50"
                  >
                    {resetLoading ? 'Sending...' : 'Send reset link'}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (activeRole === 'student' && !selectedStudent)}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Sign In'}
            </button>
          </form>

          {/* Social Sign In */}
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/30 text-xs font-body">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all duration-200 font-body text-sm font-medium disabled:opacity-50"
            >
              {googleLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Chrome size={16} />
              )}
              Continue with Google
            </button>
          </div>

          <p className="text-center text-white/40 text-sm font-body mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-electric hover:text-blue-glow transition-colors font-medium">
              Create one
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
