// src/components/landing/Features.jsx
import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Users, Search, Activity, Building2, BarChart3, Shield } from 'lucide-react';

const features = [
  { icon: Users, title: 'Centralized Student Profiles', desc: 'Complete student records with skills, projects, CGPA, resumes, and placement history in one unified system.', color: 'text-blue-electric', bg: 'bg-blue-electric/10', border: 'border-blue-electric/20' },
  { icon: Search, title: 'Smart Job Matching', desc: 'AI-powered eligibility filtering automatically shows relevant opportunities based on branch, CGPA, and skills.', color: 'text-gold', bg: 'bg-gold/10', border: 'border-gold/20' },
  { icon: Activity, title: 'Real-time Tracking', desc: 'Live application status updates with Firestore real-time listeners — no refresh needed.', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  { icon: Building2, title: 'Recruiter Portal', desc: 'Dedicated portal for companies to post jobs, filter candidates, and manage the full hiring pipeline.', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Visual insights on placement trends, branch-wise stats, package distributions, and more.', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  { icon: Shield, title: 'Cloud-Secured & Scalable', desc: 'Firebase Auth with OAuth/SSO, role-based access control, and auto-scaling cloud infrastructure.', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
];

export function Features() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="features" className="py-24 px-6 relative" ref={ref}>
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-blue-electric text-sm font-semibold uppercase tracking-widest mb-3 font-body">Platform Features</p>
          <h2 className="font-heading font-bold text-4xl text-white mb-4">
            Everything You Need, <span className="gradient-text">All in One Place</span>
          </h2>
          <p className="text-white/50 max-w-2xl mx-auto font-body">
            A complete ecosystem for managing campus placements — from student registration to final offer letters.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className={`glass-card-hover p-6 border ${f.border}`}
            >
              <div className={`w-12 h-12 rounded-xl ${f.bg} border ${f.border} flex items-center justify-center mb-4`}>
                <f.icon size={22} className={f.color} />
              </div>
              <h3 className="font-heading font-semibold text-white text-lg mb-2">{f.title}</h3>
              <p className="text-white/50 font-body text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ────────────────────────────────────────────────────────────

const steps = [
  { num: '01', title: 'Register & Profile', desc: 'Students create profiles with academic details, skills, and resume. Recruiters register their company.' },
  { num: '02', title: 'Apply & Match', desc: 'Browse filtered job listings. Apply with one click. Smart matching surfaces the best opportunities.' },
  { num: '03', title: 'Track & Get Placed', desc: 'Real-time status updates. Attend scheduled interviews. Receive and accept your offer letter.' },
];

export function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="how-it-works" className="py-24 px-6 relative" ref={ref}>
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <div className="w-[600px] h-[600px] rounded-full border border-blue-electric/30" />
      </div>
      <div className="max-w-5xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-16"
        >
          <p className="text-gold text-sm font-semibold uppercase tracking-widest mb-3 font-body">Process</p>
          <h2 className="font-heading font-bold text-4xl text-white">
            Three Steps to <span className="gradient-text">Success</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,163,255,0.5), rgba(245,166,35,0.5), transparent)' }} />

          {steps.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.2, duration: 0.6 }}
              className="text-center"
            >
              <div className="relative inline-flex">
                <div className="w-20 h-20 rounded-full glass-card flex items-center justify-center mx-auto mb-6 relative z-10 border border-blue-electric/20">
                  <span className="font-heading font-extrabold text-2xl gradient-text">{s.num}</span>
                </div>
                <div className="absolute inset-0 rounded-full blur-xl opacity-20"
                  style={{ background: 'radial-gradient(circle, #00A3FF, transparent)' }} />
              </div>
              <h3 className="font-heading font-bold text-white text-xl mb-3">{s.title}</h3>
              <p className="text-white/50 font-body text-sm leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Stats Counter ───────────────────────────────────────────────────────────

function AnimatedCounter({ target, suffix = '', prefix = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref} className="font-heading font-extrabold text-4xl gradient-text">
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

const stats = [
  { label: 'Students Placed', value: 10432, suffix: '+' },
  { label: 'Partner Companies', value: 520, suffix: '+' },
  { label: 'Avg Package (LPA)', value: 8, suffix: 'L', prefix: '₹' },
  { label: 'Institutes Using', value: 45, suffix: '+' },
];

export function Stats() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <section id="stats" className="py-20 px-6 relative" ref={ref}>
      <div className="max-w-6xl mx-auto">
        <div className="glass-card p-10 border border-blue-electric/10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <AnimatedCounter target={s.value} suffix={s.suffix} prefix={s.prefix} />
                <p className="text-white/50 font-body text-sm mt-2">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ───────────────────────────────────────────────────────────

const testimonials = [
  { name: 'Priya Sharma', role: 'CS Student, NIT Trichy', quote: 'PlaceCloud made the entire placement process seamless. I could track my applications in real-time and never missed a deadline.' },
  { name: 'Rahul Mehta', role: 'Placement Officer, VIT', quote: 'Managing 3000+ students used to be a nightmare. Now everything is centralized and analytics give us instant insights.' },
  { name: 'Sarah Chen', role: 'HR Manager, Microsoft', quote: 'The candidate filtering and profile system saved us hours. We could shortlist the right candidates in minutes.' },
  { name: 'Arjun Kumar', role: 'ECE Student, BITS Pilani', quote: 'The AI job matching is incredible — it only showed me relevant opportunities. Got placed at my dream company!' },
];

export function Testimonials() {
  return (
    <section className="py-24 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-blue-electric text-sm font-semibold uppercase tracking-widest mb-3 font-body">Testimonials</p>
          <h2 className="font-heading font-bold text-4xl text-white">
            Loved by <span className="gradient-text">Everyone</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6 border border-white/5 hover:border-blue-electric/20 transition-colors"
            >
              <p className="text-white/70 font-body italic leading-relaxed mb-4">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-electric/40 to-gold/30 flex items-center justify-center">
                  <span className="font-heading font-bold text-white text-sm">{t.name[0]}</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-white/40 text-xs font-body">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────

export function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-blue-electric/20 border border-blue-electric/40 flex items-center justify-center">
                <span className="text-blue-electric font-bold text-xs">P</span>
              </div>
              <span className="font-heading font-bold text-white">Place<span className="text-blue-electric">Cloud</span></span>
            </div>
            <p className="text-white/40 text-sm font-body leading-relaxed">
              The complete cloud platform for campus placement management.
            </p>
          </div>
          {[
            { title: 'Platform', links: ['Features', 'How It Works', 'Pricing', 'Security'] },
            { title: 'Roles', links: ['Students', 'Recruiters', 'Placement Officers', 'Faculty'] },
            { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
          ].map((col) => (
            <div key={col.title}>
              <p className="font-heading font-semibold text-white text-sm mb-4">{col.title}</p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-white/40 hover:text-white text-sm font-body transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="glow-divider mb-6" />
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-sm font-body">© 2025 PlaceCloud. All rights reserved.</p>
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((l) => (
              <a key={l} href="#" className="text-white/30 hover:text-white/60 text-sm font-body transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
