// src/pages/admin/Reports.jsx
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { getApplications, getJobs, getStudents } from '../../services/api';

const OFFER_STATUSES = new Set(['selected', 'offered', 'offer', 'placed']);

const normalize = (value) => String(value || '').trim().toLowerCase();

const branchLabel = (value) => {
  const raw = String(value || 'Unknown').trim();
  const key = normalize(raw);
  if (!raw) return 'Unknown';
  if (['computer science', 'computer science and engineering', 'cs', 'cse'].includes(key)) return 'Computer Science';
  if (['information technology', 'it'].includes(key)) return 'Information Technology';
  if (['electronics', 'electronics and communication', 'ece'].includes(key)) return 'Electronics & Communication';
  if (['mechanical', 'mechanical engineering', 'mech'].includes(key)) return 'Mechanical';
  if (['civil', 'civil engineering'].includes(key)) return 'Civil';
  if (['electrical', 'electrical and electronics', 'ee', 'eee'].includes(key)) return 'Electrical';
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
    let active = true;
    const load = async () => {
      try {
        const [studentsRes, applicationsRes, jobsRes] = await Promise.all([
          getStudents(),
          getApplications(),
          getJobs(),
        ]);
        if (!active) return;
        setStudents(studentsRes.data?.students || []);
        setApplications(applicationsRes.data?.applications || []);
        setJobs(jobsRes.data?.jobs || []);
      } catch {
        if (!active) return;
        setStudents([]);
        setApplications([]);
        setJobs([]);
      }
    };

    load();
    return () => { active = false; };
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

      const yearVal = offerRecord.date.getFullYear();
      const monthVal = offerRecord.date.getMonth(); // 0-11
      const yearMonthKey = `${yearVal}-${String(monthVal + 1).padStart(2, '0')}`;
      
      if (!yearlyStats.has(yearMonthKey)) {
        yearlyStats.set(yearMonthKey, { 
          key: yearMonthKey, 
          yearVal, 
          monthVal,
          placed: 0, 
          packageTotal: 0, 
          packageCount: 0 
        });
      }
      const currentPeriod = yearlyStats.get(yearMonthKey);
      currentPeriod.placed += 1;
      if (ctcLpa != null) {
        currentPeriod.packageTotal += ctcLpa;
        currentPeriod.packageCount += 1;
      }
    });

    const branchMap = new Map();
    let placedStudents = 0;
    let packageTotal = 0;
    let packageCount = 0;
    let highestPackage = 0;
    const allCtcs = [];

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
        allCtcs.push(bestPackage);
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

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const yearlyTrend = Array.from(yearlyStats.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((p) => ({
        year: `${monthNames[p.monthVal]} '${String(p.yearVal).slice(-2)}`,
        placed: p.placed,
        avg: p.packageCount ? Number((p.packageTotal / p.packageCount).toFixed(1)) : 0,
      }));

    if (!yearlyTrend.length) {
      const d = new Date();
      yearlyTrend.push({ year: `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`, placed: placedStudents, avg: packageCount ? Number((packageTotal / packageCount).toFixed(1)) : 0 });
    }

    const topCompanies = Array.from(companyStats.values())
      .map((c) => ({
        company: c.company,
        offers: c.offers,
        avg: c.packageCount ? Number((c.packageTotal / c.packageCount).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.offers - a.offers)
      .slice(0, 10);

    const TIER_1 = new Set(['Google', 'Amazon', 'Microsoft', 'Apple', 'Meta', 'Netflix', 'NVIDIA', 'Atlassian']);
    const TIER_2 = new Set(['Deloitte', 'PwC', 'KPMG', 'EY', 'Paytm', 'Razorpay', 'Swiggy', 'Zomato', 'Flipkart', 'Cred']);
    const TIER_3 = new Set(['TCS', 'Infosys', 'Wipro', 'Cognizant', 'Accenture', 'Tech Mahindra', 'Capgemini']);

    let tier1Count = 0;
    let tier2Count = 0;
    let tier3Count = 0;
    let othersCount = 0;

    Array.from(companyStats.values()).forEach(c => {
      if (TIER_1.has(c.company)) tier1Count += c.offers;
      else if (TIER_2.has(c.company)) tier2Count += c.offers;
      else if (TIER_3.has(c.company)) tier3Count += c.offers;
      else othersCount += c.offers;
    });

    const tierDistribution = [
      { name: 'Tier 1 (Product/FAANG)', value: tier1Count, fill: '#00A3FF' },
      { name: 'Tier 2 (Startups/Big 4)', value: tier2Count, fill: '#A855F7' },
      { name: 'Tier 3 (Service based)', value: tier3Count, fill: '#F5A623' },
    ].filter(t => t.value > 0);
    if (othersCount > 0) tierDistribution.push({ name: 'Others', value: othersCount, fill: '#22C55E' });

    const overallPlacementPct = students.length ? Number(((placedStudents / students.length) * 100).toFixed(1)) : 0;
    const avgCtc = packageCount ? Number((packageTotal / packageCount).toFixed(1)) : 0;

    allCtcs.sort((a, b) => a - b);
    let medianCtc = 0;
    let top10AvgCtc = 0;
    
    if (allCtcs.length > 0) {
      const mid = Math.floor(allCtcs.length / 2);
      medianCtc = allCtcs.length % 2 !== 0 ? allCtcs[mid] : (allCtcs[mid - 1] + allCtcs[mid]) / 2;
      
      const top10Count = Math.max(1, Math.floor(allCtcs.length * 0.1));
      const top10Sum = allCtcs.slice(-top10Count).reduce((a, b) => a + b, 0);
      top10AvgCtc = top10Sum / top10Count;
    }

    return {
      branchData,
      yearlyTrend,
      topCompanies,
      tierDistribution,
      kpis: {
        overallPlacementPct,
        avgCtc,
        medianCtc: Number(medianCtc.toFixed(1)),
        top10AvgCtc: Number(top10AvgCtc.toFixed(1)),
        highestCtc: Number(highestPackage.toFixed(1)),
        companiesVisited: companiesVisited.size,
      },
    };
  }, [applications, jobs, students]);

  const exportPDF = async () => {
    setGenerating(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const collegeName = "Dayananda Sagar College of Engineering (DSCE)";
      const reportTitle = "Placement Analytics Report";
      const dateStr = `Generated On: ${new Date().toLocaleDateString()}`;
      
      pdf.setFontSize(18);
      pdf.setTextColor(0, 51, 102);
      pdf.text(collegeName, 105, 20, { align: 'center' });
      
      pdf.setFontSize(14);
      pdf.setTextColor(100, 100, 100);
      pdf.text(reportTitle, 105, 28, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.text(dateStr, 195, 35, { align: 'right' });
      pdf.text(`Academic Year: 2024-25`, 15, 35);
      
      pdf.setDrawColor(200, 200, 200);
      pdf.line(15, 38, 195, 38);
      
      let currentY = 45;

      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Key Performance Indicators", 15, currentY);
      currentY += 6;
      
      autoTable(pdf, {
        startY: currentY,
        head: [['Metric', 'Value']],
        body: [
          ['Overall Placement %', `${analytics.kpis.overallPlacementPct}%`],
          ['Highest CTC', `₹${analytics.kpis.highestCtc} LPA`],
          ['Average CTC', `₹${analytics.kpis.avgCtc} LPA`],
          ['Median CTC', `₹${analytics.kpis.medianCtc} LPA`],
          ['Top 10% Average CTC', `₹${analytics.kpis.top10AvgCtc} LPA`],
          ['Companies Visited', analytics.kpis.companiesVisited]
        ],
        theme: 'grid',
        headStyles: { fillColor: [0, 163, 255] },
        margin: { left: 15, right: 15 }
      });
      
      currentY = pdf.lastAutoTable.finalY + 15;

      const captureChart = async (id, title) => {
        const el = document.getElementById(id);
        if (!el) return;
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#0A0F1C' });
        const imgData = canvas.toDataURL('image/png');
        
        if (currentY + 100 > 280) {
          pdf.addPage();
          currentY = 20;
        }
        
        pdf.setFontSize(12);
        pdf.text(title, 15, currentY);
        pdf.addImage(imgData, 'PNG', 15, currentY + 5, 180, 90);
        currentY += 105;
      };

      await captureChart('chart-branch', 'Branch-wise Placement %');
      await captureChart('chart-trend', 'Avg CTC Trend (Monthly)');
      await captureChart('chart-tier', 'Company Tier Distribution');

      if (currentY + 50 > 280) {
        pdf.addPage();
        currentY = 20;
      }
      pdf.setFontSize(12);
      pdf.text("Top Recruiting Companies", 15, currentY);
      currentY += 6;
      
      autoTable(pdf, {
        startY: currentY,
        head: [['Company', 'Offers Made', 'Avg CTC (LPA)']],
        body: analytics.topCompanies.map(c => [c.company, c.offers, `₹${c.avg}L`]),
        theme: 'striped',
        headStyles: { fillColor: [245, 166, 35] },
        margin: { left: 15, right: 15 }
      });

      pdf.save('DSCE_Placement_Report.pdf');
      toast.success('PDF report downloaded!');
    } catch (err) {
      console.error(err);
      toast.error('Error generating PDF');
    } finally {
      setGenerating(false);
    }
  };

  const exportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const collegeHeader = [
        ["Dayananda Sagar College of Engineering (DSCE)"],
        ["Placement Analytics Report"],
        [`Generated On: ${new Date().toLocaleDateString()}`, `Academic Year: 2024-25`],
        []
      ];

      const getSheetData = (dataArray) => {
        if (!dataArray || !dataArray.length) return [...collegeHeader, ["No Data"]];
        const headers = Object.keys(dataArray[0]);
        const rows = dataArray.map(obj => headers.map(key => obj[key]));
        return [...collegeHeader, headers, ...rows];
      };

      const branchData = analytics.branchData.map((b) => ({
        Branch: b.branch,
        Placed: b.placed,
        Total: b.total,
        'Placement %': `${b.total ? Math.round((b.placed / b.total) * 100) : 0}%`,
        'Avg CTC (LPA)': b.avg,
      }));
      
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(getSheetData(branchData)), 'Branch Report');
      
      if (analytics.topCompanies.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(getSheetData(analytics.topCompanies)), 'Top Companies');
      }
      
      if (analytics.yearlyTrend.length) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(getSheetData(analytics.yearlyTrend)), 'Yearly Trend');
      }

      XLSX.writeFile(wb, 'DSCE_Placement_Report.xlsx');
      toast.success('Excel report downloaded!');
    } catch (err) {
      console.error(err);
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

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Placement %', value: `${analytics.kpis.overallPlacementPct}%`, color: 'text-green-400' },
            { label: 'Highest CTC', value: `₹${analytics.kpis.highestCtc}L`, color: 'text-blue-electric' },
            { label: 'Avg CTC', value: `₹${analytics.kpis.avgCtc}L`, color: 'text-gold' },
            { label: 'Median CTC', value: `₹${analytics.kpis.medianCtc}L`, color: 'text-purple-400' },
            { label: 'Top 10% Avg', value: `₹${analytics.kpis.top10AvgCtc}L`, color: 'text-pink-400' },
            { label: 'Companies', value: analytics.kpis.companiesVisited, color: 'text-white' },
          ].map((k) => (
            <div key={k.label} className="glass-card p-4 flex flex-col justify-between">
              <p className="text-white/40 text-xs font-body mb-2">{k.label}</p>
              <p className={`font-heading font-bold text-xl md:text-2xl ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="glass-card p-5" id="chart-branch">
            <p className="section-title mb-1">Branch-wise Placement %</p>
            <p className="text-white/40 text-xs font-body mb-5">Percentage of students placed per branch</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.branchData.map((b) => ({ ...b, pct: b.total ? Math.round((b.placed / b.total) * 100) : 0 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="branch" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Branch', position: 'insideBottom', offset: -10, fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} unit="%" width={50} label={{ value: 'Placement %', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.4)', fontSize: 11, offset: 0 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pct" name="Placement %" fill="#00A3FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card p-5" id="chart-trend">
            <p className="section-title mb-1">Avg CTC Trend</p>
            <p className="text-white/40 text-xs font-body mb-5">Monthly average package growth</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={analytics.yearlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Month', position: 'insideBottom', offset: -10, fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" L" width={50} label={{ value: 'Avg CTC (LPA)', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.4)', fontSize: 11, offset: 0 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="avg" name="Avg CTC (LPA)" stroke="#F5A623" strokeWidth={3} dot={{ fill: '#F5A623', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#00A3FF', stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5">
          <div className="glass-card p-5 relative" id="chart-tier">
            <p className="section-title mb-1">Company Tier Distribution</p>
            <p className="text-white/40 text-xs font-body mb-5">Offers by company category</p>
            <div className="relative h-[220px]">
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-heading font-bold text-white">
                  {analytics.tierDistribution.reduce((sum, t) => sum + t.value, 0)}
                </span>
                <span className="text-white/40 text-[10px] uppercase tracking-wider">Total Offers</span>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.tierDistribution} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={4} dataKey="value" stroke="none">
                    {analytics.tierDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {analytics.tierDistribution.map((t) => (
                <div key={t.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.fill }} />
                  <span className="text-white/60 text-[10px] uppercase tracking-wide">{t.name.split(' ')[0]} {t.name.split(' ')[1]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5">
            <p className="section-title mb-1">Branch Performance</p>
            <p className="text-white/40 text-xs font-body mb-5">Placement vs Avg CTC</p>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart cx="50%" cy="50%" outerRadius={80} data={analytics.branchData.map(b => ({ ...b, pct: b.total ? Math.round((b.placed/b.total)*100) : 0 }))}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="branch" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Placement %" dataKey="pct" stroke="#00A3FF" fill="#00A3FF" fillOpacity={0.3} />
                <Radar name="Avg CTC" dataKey="avg" stroke="#F5A623" fill="#F5A623" fillOpacity={0.3} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
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