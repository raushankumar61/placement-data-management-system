// src/pages/Landing.jsx
import React from 'react';
import Navbar from '../components/common/Navbar';
import Hero from '../components/landing/Hero';
import { Features, HowItWorks, Stats, Testimonials, Footer } from '../components/landing/Sections';

export default function Landing() {
  return (
    <div className="min-h-screen mesh-bg">
      <Navbar />
      <Hero />
      <div className="glow-divider" />
      <Features />
      <div className="glow-divider" />
      <HowItWorks />
      <Stats />
      <div className="glow-divider" />
      <Testimonials />
      <Footer />
    </div>
  );
}
