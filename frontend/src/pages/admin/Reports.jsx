// src/pages/admin/Reports.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';

const OFFER_STATUSES = new Set(['selected', 'offered', 'offer', 'placed']);

const normalize = (value) => String(value || '').trim().toLowerCase();

const branchLabel = (value) => {
  const raw = String(value || 'Unknown').trim();
  const key = normalize(raw);
  if (!raw) return 'Unknown';
  if (['computer science', 'computer science and engineering', 'cs', 'cse'].includes(key)) return 'CS';
  if (['information technology', 'it'].includes(key)) return 'IT';
  if (['electronics', 'electronics and communication', 'ece'].includes(key)) return 'ECE';
  if (['mechanical', 'mechanical engineering', 'mech'].includes(key)) return 'Mech';
  if (['civil', 'civil engineering'].includes(key)) return 'Civil';
  if (['electrical', 'electrical and electronics', 'ee', 'eee'].includes(key)) return 'EE';
  return raw;
};

const toDate = (value) => {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') {
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  if (value instanceof Date) return value;
  return null;
};

const parseCtcToLpa = (value) => {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  const text = String(value).toLowerCase().trim();
  if (!text) return null;

  const numberMatch = text.match(/(\d+(?:\.\d+)?)/);
  if (!numberMatch) return null;
  const n = Number(numberMatch[1]);
  if (Number.isNaN(n)) return null;

  if (text.includes('cr')) return n * 100;
  if (text.includes('k/month') || text.includes('k per month')) return (n * 12) / 100;
  if (text.includes('lpa') || text.includes('lac') || text.includes('lakh')) return n;
  if (text.includes('/month') || text.includes('per month')) return (n * 12) / 100000;
  if (text.includes('/year') || text.includes('per year') || text.includes('pa')) return n / 100000;
  return n;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 border border-white/10 text-xs font-body bg-dark-800/95 shadow-lg rounded-lg">
      <p className="text-white font-semibold mb-2">{label}</p>
      {payload.map((p) => {
        const displayColor = p.color === '#00A3FF' ? '#00D9FF' : p.color === '#F5A623' ? '#FFB84D' : '#22C55E';
        return (
          <p key={p.name} style={{ color: displayColor }} className="font-medium">
            {p.name}: <span className="font-bold">{p.value}</span>
          </p>
        );
      })}
    </div>
  );
};

export default function AdminReports() {
  const [generating, setGenerating] = useState(false);
  const [students, setStudents] = useState([]);
  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const studentsUnsub = onSnapshot(collection(db, 'students'), (snap) => {
      setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => setStudents([]));

    const applicationsUnsub = onSnapshot(collection(db, 'applications'), (snap) => {
      setApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => setApplications([]));

    const jobsUnsub = onSnapshot(collection(db, 'jobs'), (snap) => {
      setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => setJobs([]));

    return () => {
      studentsUnsub();
      applicationsUnsub();
      jobsUnsub();
    };
  }, []);

  const analytics = useMemo(() => {
    const jobById = new Map(jobs.map((job) => [job.id, job]));
    const studentOfferMap = new Map();
    const companiesVisited = new Set();
    const companyStats = new Map();
    const yearlyStats = new Map();

    jobs.forEach((job) => {
      if (job.company) companiesVisited.add(String(job.company));
    });

    applications.forEach((app) => {
      const status = normalize(app.status);
      const job = jobById.get(app.jobId) || {};
      const company = job.company || app.company || 'N/A';
      if (company && company !== 'N/A') companiesVisited.add(String(company));

      if (!OFFER_STATUSES.has(status)) return;

      const studentId = app.studentId || app.studentUid || app.email || app.studentEmail;
      if (!studentId) return;

      const ctcLpa = parseCtcToLpa(job.ctc || app.ctc);
      const offerRecord = {
        company,
        ctcLpa,
        date: toDate(app.updatedAt || app.appliedAt || app.createdAt) || new Date(),
      };

      if (!studentOfferMap.has(studentId)) studentOfferMap.set(studentId, []);
      studentOfferMap.get(studentId).push(offerRecord);

      if (!companyStats.has(company)) {
        companyStats.set(company, { company, offers: 0, packageTotal: 0, packageCount: 0 });
      }
      const currentCompany = companyStats.get(company);
      currentCompany.offers += 1;
      if (ctcLpa != null) {
        currentCompany.packageTotal += ctcLpa;
        currentCompany.packageCount += 1;
      }

      const year = String(offerRecord.date.getFullYear());
      if (!yearlyStats.has(year)) {
        yearlyStats.set(year, { year, placed: 0, packageTotal: 0, packageCount: 0 });
      }
      const currentYear = yearlyStats.get(year);
      currentYear.placed += 1;
      if (ctcLpa != null) {
        currentYear.packageTotal += ctcLpa;
        currentYear.packageCount += 1;
      }
    });

    const branchMap = new Map();
    let placedStudents = 0;
    let packageTotal = 0;
    let packageCount = 0;
    let highestPackage = 0;

    students.forEach((student) => {
      const studentKey = student.id || student.uid || student.email;
      const offers = studentOfferMap.get(studentKey) || [];
      const explicitPlaced = normalize(student.placementStatus) === 'placed';
      const isPlaced = explicitPlaced || offers.length > 0;
      const branch = branchLabel(student.branch || student.department || 'Unknown');

      if (!branchMap.has(branch)) {
        branchMap.set(branch, { branch, placed: 0, total: 0, packageTotal: 0, packageCount: 0 });
      }
      const branchRecord = branchMap.get(branch);
      branchRecord.total += 1;
      if (isPlaced) {
        branchRecord.placed += 1;
        placedStudents += 1;
      }

      const packageCandidates = [];
      offers.forEach((offer) => {
        if (offer.ctcLpa != null) packageCandidates.push(offer.ctcLpa);
      });
      const directPackage = parseCtcToLpa(student.package || student.ctc || student.highestPackage);
      if (directPackage != null) packageCandidates.push(directPackage);

      const bestPackage = packageCandidates.length ? Math.max(...packageCandidates) : null;
      if (bestPackage != null && isPlaced) {
        packageTotal += bestPackage;
        packageCount += 1;
        highestPackage = Math.max(highestPackage, bestPackage);
        branchRecord.packageTotal += bestPackage;
        branchRecord.packageCount += 1;
      }
    });

    const branchData = Array.from(branchMap.values())
      .map((b) => ({
        branch: b.branch,
        placed: b.placed,
        total: b.total,
        avg: b.packageCount ? Number((b.packageTotal / b.packageCount).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const yearlyTrend = Array.from(yearlyStats.values())
      .map((y) => ({
        year: y.year,
        placed: y.placed,
        avg: y.packageCount ? Number((y.packageTotal / y.packageCount).toFixed(1)) : 0,
      }))
      .sort((a, b) => Number(a.year) - Number(b.year));

    if (!yearlyTrend.length) {
      yearlyTrend.push({ year: String(new Date().getFullYear()), placed: placedStudents, avg: packageCount ? Number((packageTotal / packageCount).toFixed(1)) : 0 });
    }

    const topCompanies = Array.from(companyStats.values())
      .map((c) => ({
        company: c.company,
        offers: c.offers,
        avg: c.packageCount ? Number((c.packageTotal / c.packageCount).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.offers - a.offers)
      .slice(0, 10);

    const overallPlacementPct = students.length ? Number(((placedStudents / students.length) * 100).toFixed(1)) : 0;
    const avgCtc = packageCount ? Number((packageTotal / packageCount).toFixed(1)) : 0;

    return {
      branchData,
      yearlyTrend,
      topCompanies,
      kpis: {
        overallPlacementPct,
        avgCtc,
        highestCtc: Number(highestPackage.toFixed(1)),
        companiesVisited: companiesVisited.size,
      },
    };
  }, [applications, jobs, students]);

  const exportPDF = () => {
    setGenerating(true);
    try {
      const pdf = new jsPDF();
      pdf.setFontSize(20);
      pdf.setTextColor(0, 163, 255);
      pdf.text('PlaceCloud - Placement Report', 15, 20);
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 30);
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Branch-wise Summary', 15, 45);
      pdf.setFontSize(10);
      analytics.branchData.forEach((b, i) => {
        pdf.text(`${b.branch}: ${b.placed}/${b.total} placed | Avg CTC: ${b.avg} LPA`, 15, 55 + i * 8);
      });
      const yearlyY = 65 + analytics.branchData.length * 8;
      pdf.setFontSize(14);
      pdf.text('Yearly Trend', 15, yearlyY);
      pdf.setFontSize(10);
      analytics.yearlyTrend.forEach((y, i) => {
        pdf.text(`${y.year}: ${y.placed} placed | Avg: ${y.avg} LPA`, 15, yearlyY + 10 + i * 8);
      });
      pdf.save('placement_report_live.pdf');
      toast.success('PDF report downloaded!');
    } catch {
      toast.error('Error generating PDF');
    } finally {
      setGenerating(false);
    }
  };

  const exportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(analytics.branchData.map((b) => ({
        Branch: b.branch,
        Placed: b.placed,
        Total: b.total,
        'Placement %': `${b.total ? Math.round((b.placed / b.total) * 100) : 0}%`,
        'Avg CTC (LPA)': b.avg,
      })));
      XLSX.utils.book_append_sheet(wb, ws1, 'Branch Report');
      const ws2 = XLSX.utils.json_to_sheet(analytics.topCompanies);
      XLSX.utils.book_append_sheet(wb, ws2, 'Top Companies');
      const ws3 = XLSX.utils.json_to_sheet(analytics.yearlyTrend);
      XLSX.utils.book_append_sheet(wb, ws3, 'Yearly Trend');
      XLSX.writeFile(wb, 'placement_report_live.xlsx');
      toast.success('Excel report downloaded!');
    } catch {
      toast.error('Error generating Excel');
    }
  };

  return (
    <DashboardLayout title="Reports & Analytics">
      <div className="space-y-6">
        <div className="flex gap-3">
          <button onClick={exportPDF} disabled={generating}
            className="btn-primary flex items-center gap-2 text-sm py-2.5 px-5 disabled:opacity-50">
            <FileText size={15} /> {generating ? 'Generating...' : 'Export PDF'}
          </button>
          <button onClick={exportExcel}
            className="btn-outline flex items-center gap-2 text-sm py-2.5 px-5">
            <Download size={15} /> Export Excel
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Overall Placement %', value: `${analytics.kpis.overallPlacementPct}%`, color: 'text-green-400' },
            { label: 'Avg CTC', value: `Rs ${analytics.kpis.avgCtc} LPA`, color: 'text-gold' },
            { label: 'Highest CTC', value: `Rs ${analytics.kpis.highestCtc} LPA`, color: 'text-blue-electric' },
            { label: 'Companies Visited', value: analytics.kpis.companiesVisited, color: 'text-purple-400' },
          ].map((k) => (
            <div key={k.label} className="glass-card p-4">
              <p className="text-white/40 text-xs font-body mb-1">{k.label}</p>
              <p className={`font-heading font-bold text-2xl ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="glass-card p-5">
            <p className="section-title mb-1">Branch-wise Placement %</p>
            <p className="text-white/40 text-xs font-body mb-5">Percentage of students placed per branch</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.branchData.map((b) => ({ ...b, pct: b.total ? Math.round((b.placed / b.total) * 100) : 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="branch" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pct" name="Placement %" fill="#00A3FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card p-5">
            <p className="section-title mb-1">Avg CTC Trend</p>
            <p className="text-white/40 text-xs font-body mb-5">Year-on-year average package growth</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={analytics.yearlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" L" />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="avg" name="Avg CTC (LPA)" stroke="#F5A623" strokeWidth={2.5} dot={{ fill: '#F5A623', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="p-5 border-b border-white/5">
            <p className="section-title">Top Recruiting Companies</p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Company', 'Offers Made', 'Avg CTC (LPA)', 'Status'].map((h) => (
                  <th key={h} className="table-header text-left px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analytics.topCompanies.map((c, i) => (
                <motion.tr key={c.company} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }} className="table-row">
                  <td className="px-5 py-3 text-white font-semibold text-sm">{c.company}</td>
                  <td className="px-5 py-3 font-mono text-blue-electric">{c.offers}</td>
                  <td className="px-5 py-3">
                    <span className={`font-mono font-bold ${c.avg >= 15 ? 'text-green-400' : c.avg >= 10 ? 'text-gold' : 'text-white/60'}`}>
                      Rs {c.avg} L
                    </span>
                  </td>
                  <td className="px-5 py-3"><span className="badge-green">Active Partner</span></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {!analytics.topCompanies.length && (
            <div className="px-5 py-6 text-white/40 text-sm font-body">No offer data available yet.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}