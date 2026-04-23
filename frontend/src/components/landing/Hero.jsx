// src/components/landing/Hero.jsx
import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Sparkles, TrendingUp, Users, Briefcase } from 'lucide-react';

const WORDS = ['Smarter', 'Placements.', 'Powered', 'by', 'the', 'Cloud.'];

function FloatingCard({ delay, className, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6 }}
      className={`glass-card p-3 absolute ${className}`}
      style={{ animation: `float ${3 + delay}s ease-in-out infinite` }}
    >
      {children}
    </motion.div>
  );
}

export default function Hero() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        color: Math.random() > 0.5 ? '0,163,255' : '245,166,35',
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
        ctx.fill();
      });
      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,163,255,${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden mesh-bg grid-overlay">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ opacity: 0.4 }} />

      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(circle, #00A3FF, transparent)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-8 blur-3xl"
        style={{ background: 'radial-gradient(circle, #F5A623, transparent)' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-6"
            >
              <Sparkles size={14} className="text-gold" />
              <span className="text-white/70 text-sm font-body">AI-Powered Placement Platform</span>
            </motion.div>

            <h1 className="font-heading font-extrabold text-4xl md:text-5xl lg:text-6xl text-white leading-tight mb-6">
              {WORDS.map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
                  className={`inline-block mr-3 ${word === 'Cloud.' ? 'gradient-text' : ''}`}
                >
                  {word}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="text-white/50 text-lg font-body leading-relaxed mb-8 max-w-lg"
            >
              A unified cloud platform connecting students, placement officers, and recruiters.
              Real-time tracking, smart matching, and data-driven insights — all in one place.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.5 }}
              className="flex flex-wrap gap-4"
            >
              <Link to="/register">
                <button className="btn-primary flex items-center gap-2">
                  Get Started Free
                  <ArrowRight size={16} />
                </button>
              </Link>
              <a href="#how-it-works">
                <button className="btn-outline flex items-center gap-2">
                  <Play size={14} className="text-blue-electric" />
                  See How It Works
                </button>
              </a>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="mt-10 flex items-center gap-6 flex-wrap"
            >
              {[
                { icon: Users, label: '10,000+ Students' },
                { icon: Briefcase, label: '500+ Companies' },
                { icon: TrendingUp, label: '95% Placement Rate' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-white/40">
                  <Icon size={14} className="text-blue-electric" />
                  <span className="text-sm font-body">{label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.7, ease: 'easeOut' }}
            className="relative hidden lg:block"
          >
            {/* Main dashboard card */}
            <div className="glass-card p-5 animate-float">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-white/40 text-xs font-body">Placement Overview</p>
                  <p className="text-white font-heading font-bold text-lg">2024–25</p>
                </div>
                <div className="badge-green">Live</div>
              </div>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Placed', value: '847', color: 'text-green-400' },
                  { label: 'Drives', value: '62', color: 'text-blue-electric' },
                  { label: 'Avg CTC', value: '8.4L', color: 'text-gold' },
                ].map((s) => (
                  <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
                    <p className={`font-heading font-bold text-xl ${s.color}`}>{s.value}</p>
                    <p className="text-white/40 text-xs mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
              {/* Bar chart mock */}
              <div className="mb-3">
                <p className="text-white/40 text-xs mb-2 font-body">Branch-wise Placements</p>
                <div className="space-y-2">
                  {[
                    { label: 'CS/IT', pct: 92 },
                    { label: 'ECE', pct: 78 },
                    { label: 'Mech', pct: 65 },
                    { label: 'Civil', pct: 52 },
                  ].map((b) => (
                    <div key={b.label} className="flex items-center gap-3">
                      <span className="text-white/40 text-xs w-12 font-body">{b.label}</span>
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${b.pct}%` }}
                          transition={{ delay: 1, duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ background: 'linear-gradient(90deg, #00A3FF, #0077CC)' }}
                        />
                      </div>
                      <span className="text-white/60 text-xs w-8 font-mono">{b.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating mini cards */}
            <FloatingCard delay={1.0} className="-top-4 -right-4 w-40">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <TrendingUp size={12} className="text-green-400" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">New Offer</p>
                  <p className="text-white/40 text-xs">Google — 24 LPA</p>
                </div>
              </div>
            </FloatingCard>

            <FloatingCard delay={1.2} className="-bottom-4 -left-4 w-44">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-electric/20 flex items-center justify-center">
                  <Users size={12} className="text-blue-electric" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">12 Applied</p>
                  <p className="text-white/40 text-xs">Amazon — SDE Role</p>
                </div>
              </div>
            </FloatingCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
