// src/pages/admin/Reports.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, BarChart3, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import DashboardLayout from '../../components/common/DashboardLayout';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const branchData = [
  { branch: 'CS', placed: 320, total: 350, avg: 14.2 },
  { branch: 'IT', placed: 180, total: 210, avg: 12.8 },
  { branch: 'ECE', placed: 155, total: 200, avg: 10.5 },
  { branch: 'Mech', placed: 92, total: 160, avg: 8.2 },
  { branch: 'Civil', placed: 58, total: 110, avg: 7.5 },
  { branch: 'EE', placed: 67, total: 95, avg: 9.1 },
];

const yearlyTrend = [
  { year: '2021', placed: 520, avg: 7.2 },
  { year: '2022', placed: 680, avg: 8.1 },
  { year: '2023', placed: 750, avg: 9.4 },
  { year: '2024', placed: 847, avg: 10.8 },
];

const topCompanies = [
  { company: 'Google', offers: 12, avg: 28 },
  { company: 'Microsoft', offers: 18, avg: 22 },
  { company: 'Amazon', offers: 25, avg: 20 },
  { company: 'Meta', offers: 8, avg: 35 },
  { company: 'Infosys', offers: 120, avg: 5.5 },
  { company: 'TCS', offers: 95, avg: 4.8 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-3 border border-white/10 text-xs font-body">
      <p className="text-white/60 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function AdminReports() {
  const [generating, setGenerating] = useState(false);

  const exportPDF = () => {
    setGenerating(true);
    try {
      const pdf = new jsPDF();
      pdf.setFontSize(20);
      pdf.setTextColor(0, 163, 255);
      pdf.text('PlaceCloud — Placement Report 2024-25', 15, 20);
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 30);
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Branch-wise Summary', 15, 45);
      pdf.setFontSize(10);
      branchData.forEach((b, i) => {
        pdf.text(`${b.branch}: ${b.placed}/${b.total} placed | Avg CTC: ${b.avg} LPA`, 15, 55 + i * 10);
      });
      pdf.text('Yearly Trend', 15, 125);
      yearlyTrend.forEach((y, i) => {
        pdf.text(`${y.year}: ${y.placed} placed | Avg: ${y.avg} LPA`, 15, 135 + i * 10);
      });
      pdf.save('placement_report_2024-25.pdf');
      toast.success('PDF report downloaded!');
    } catch { toast.error('Error generating PDF'); }
    finally { setGenerating(false); }
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(branchData.map((b) => ({
      Branch: b.branch, Placed: b.placed, Total: b.total,
      'Placement %': `${Math.round(b.placed / b.total * 100)}%`, 'Avg CTC (LPA)': b.avg,
    })));
    XLSX.utils.book_append_sheet(wb, ws1, 'Branch Report');
    const ws2 = XLSX.utils.json_to_sheet(topCompanies);
    XLSX.utils.book_append_sheet(wb, ws2, 'Top Companies');
    const ws3 = XLSX.utils.json_to_sheet(yearlyTrend);
    XLSX.utils.book_append_sheet(wb, ws3, 'Yearly Trend');
    XLSX.writeFile(wb, 'placement_report.xlsx');
    toast.success('Excel report downloaded!');
  };

  return (
    <DashboardLayout title="Reports & Analytics">
      <div className="space-y-6">
        {/* Export Actions */}
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

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Overall Placement %', value: '84.7%', color: 'text-green-400' },
            { label: 'Avg CTC', value: '₹10.8 LPA', color: 'text-gold' },
            { label: 'Highest CTC', value: '₹52 LPA', color: 'text-blue-electric' },
            { label: 'Companies Visited', value: '134', color: 'text-purple-400' },
          ].map((k) => (
            <div key={k.label} className="glass-card p-4">
              <p className="text-white/40 text-xs font-body mb-1">{k.label}</p>
              <p className={`font-heading font-bold text-2xl ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="glass-card p-5">
            <p className="section-title mb-1">Branch-wise Placement %</p>
            <p className="text-white/40 text-xs font-body mb-5">Percentage of students placed per branch</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={branchData.map((b) => ({ ...b, pct: Math.round(b.placed / b.total * 100) }))}>
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
              <LineChart data={yearlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="year" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} unit=" L" />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="avg" name="Avg CTC (LPA)" stroke="#F5A623" strokeWidth={2.5} dot={{ fill: '#F5A623', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Companies Table */}
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
              {topCompanies.map((c, i) => (
                <motion.tr key={c.company} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }} className="table-row">
                  <td className="px-5 py-3 text-white font-semibold text-sm">{c.company}</td>
                  <td className="px-5 py-3 font-mono text-blue-electric">{c.offers}</td>
                  <td className="px-5 py-3">
                    <span className={`font-mono font-bold ${c.avg >= 15 ? 'text-green-400' : c.avg >= 10 ? 'text-gold' : 'text-white/60'}`}>
                      ₹{c.avg} L
                    </span>
                  </td>
                  <td className="px-5 py-3"><span className="badge-green">Active Partner</span></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
