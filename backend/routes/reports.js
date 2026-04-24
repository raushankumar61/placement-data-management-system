// backend/routes/reports.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/v1/reports/placement  — admin and faculty only
router.get('/placement', verifyToken, requireRole('admin', 'faculty'), async (req, res) => {
  try {
    if (!db) {
      return res.json({
        summary: { total: 1247, placed: 847, placementRate: 67.9, avgCTC: 10.8, highestCTC: 52 },
        byBranch: [
          { branch: 'CS', total: 350, placed: 320, avgCTC: 14.2, rate: 91.4 },
          { branch: 'IT', total: 210, placed: 180, avgCTC: 12.8, rate: 85.7 },
          { branch: 'ECE', total: 200, placed: 155, avgCTC: 10.5, rate: 77.5 },
        ],
        topCompanies: [
          { company: 'Google', offers: 12, avgCTC: 28 },
          { company: 'Microsoft', offers: 18, avgCTC: 22 },
          { company: 'Amazon', offers: 25, avgCTC: 20 },
        ],
        totalApplications: 3800,
      });
    }

    const [studentsSnap, appsSnap, jobsSnap] = await Promise.all([
      db.collection('students').get(),
      db.collection('applications').get(),
      db.collection('jobs').get(),
    ]);

    const students = studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const applications = appsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const jobs = jobsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const jobsById = new Map(jobs.map((j) => [j.id, j]));

    const selectedApps = applications.filter((a) => (a.status || '').toLowerCase() === 'selected');
    const placedCount = students.filter((s) => (s.placementStatus || '').toLowerCase() === 'placed').length;

    // Branch-wise aggregation
    const byBranch = {};
    students.forEach((s) => {
      const b = s.branch || 'Unknown';
      if (!byBranch[b]) byBranch[b] = { branch: b, total: 0, placed: 0, cgpaSum: 0, packages: [] };
      byBranch[b].total++;
      byBranch[b].cgpaSum += parseFloat(s.cgpa) || 0;
      if ((s.placementStatus || '').toLowerCase() === 'placed') byBranch[b].placed++;
    });

    // Add package data per branch from selected applications
    selectedApps.forEach((a) => {
      const job = jobsById.get(a.jobId) || {};
      const ctcStr = a.offeredCTC || job.ctc || '';
      const ctcNum = parseFloat(String(ctcStr).match(/\d+(?:\.\d+)?/)?.[0] || 0);
      const studentBranch = a.branch || students.find((s) => s.id === a.studentId)?.branch || 'Unknown';
      if (byBranch[studentBranch] && ctcNum) {
        byBranch[studentBranch].packages.push(ctcNum);
      }
    });

    const byBranchArr = Object.values(byBranch).map((b) => {
      const avgCTC = b.packages.length ? parseFloat((b.packages.reduce((s, v) => s + v, 0) / b.packages.length).toFixed(2)) : 0;
      const avgCgpa = b.total ? parseFloat((b.cgpaSum / b.total).toFixed(2)) : 0;
      return {
        branch: b.branch,
        total: b.total,
        placed: b.placed,
        avgCTC,
        avgCgpa,
        rate: b.total > 0 ? parseFloat(((b.placed / b.total) * 100).toFixed(1)) : 0,
      };
    }).sort((a, b) => b.placed - a.placed);

    // Top companies
    const companyMap = {};
    selectedApps.forEach((a) => {
      const company = a.company || jobsById.get(a.jobId)?.company || 'Unknown';
      if (!companyMap[company]) companyMap[company] = { company, offers: 0, packages: [] };
      companyMap[company].offers++;
      const job = jobsById.get(a.jobId) || {};
      const ctcStr = a.offeredCTC || job.ctc || '';
      const ctcNum = parseFloat(String(ctcStr).match(/\d+(?:\.\d+)?/)?.[0] || 0);
      if (ctcNum) companyMap[company].packages.push(ctcNum);
    });

    const topCompanies = Object.values(companyMap)
      .map((c) => ({
        company: c.company,
        offers: c.offers,
        avgCTC: c.packages.length ? parseFloat((c.packages.reduce((s, v) => s + v, 0) / c.packages.length).toFixed(1)) : 0,
        highestCTC: c.packages.length ? Math.max(...c.packages) : 0,
      }))
      .sort((a, b) => b.offers - a.offers)
      .slice(0, 15);

    // Global averages
    const allPackages = selectedApps.flatMap((a) => {
      const job = jobsById.get(a.jobId) || {};
      const ctcStr = a.offeredCTC || job.ctc || '';
      const ctcNum = parseFloat(String(ctcStr).match(/\d+(?:\.\d+)?/)?.[0] || 0);
      return ctcNum ? [ctcNum] : [];
    });
    const avgCTC = allPackages.length ? parseFloat((allPackages.reduce((s, v) => s + v, 0) / allPackages.length).toFixed(2)) : 0;
    const highestCTC = allPackages.length ? Math.max(...allPackages) : 0;

    res.json({
      summary: {
        total: students.length,
        placed: placedCount,
        placementRate: students.length > 0 ? parseFloat(((placedCount / students.length) * 100).toFixed(1)) : 0,
        avgCTC,
        highestCTC,
        totalApplications: applications.length,
        selectedApplications: selectedApps.length,
      },
      byBranch: byBranchArr,
      topCompanies,
      totalApplications: applications.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
