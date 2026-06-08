// backend/routes/analytics.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const { rankStudents, recommendJobsForStudent } = require('../utils/aiScoring');
const { isOwnedByRecruiter, resolveRecruiterScope } = require('../utils/recruiterOwnership');

const parseNumber = (value, fallback = 0) => {
  const normalized = String(value ?? '').replace(/,/g, '').replace(/₹/g, '');
  const match = normalized.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : fallback;
};

const parsePackageToLpa = (value) => {
  const text = String(value || '').toLowerCase();
  const amount = parseNumber(text, NaN);
  if (Number.isNaN(amount)) return 0;
  if (text.includes('crore') || text.includes('cr')) return amount * 100;
  if (text.includes('lpa') || text.includes('lac')) return amount;
  if (text.includes('k/month') || text.includes('/month') || text.includes('per month')) return (amount * 12) / 100;
  if (text.includes('/year') || text.includes('per year') || text.includes('pa') || text.includes('per annum') || text.includes('annum')) return amount / 100000;
  if (amount >= 100000) return amount / 100000;
  return amount;
};

// Simple in-memory cache for admin analytics to save Firestore reads
let adminAnalyticsCache = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL_MS = 60000; // 60 seconds

// GET /api/v1/analytics/admin  — admin only, full system metrics
router.get('/admin', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    // Check cache
    if (adminAnalyticsCache.data && (Date.now() - adminAnalyticsCache.timestamp < CACHE_TTL_MS)) {
      return res.json(adminAnalyticsCache.data);
    }
    if (!db) {
      return res.json({
        stats: { students: 1247, placed: 847, jobs: 62, companies: 134, applications: 3800 },
        placementTrend: [],
        byBranch: [],
        packageDist: [],
        recentActivity: [],
        topCompanies: [],
      });
    }

    const [studentsSnap, jobsSnap, appsSnap, recruitersSnap, activitySnap] = await Promise.all([
      db.collection('students').get(),
      db.collection('jobs').get(),
      db.collection('applications').get(),
      db.collection('recruiters').get(),
      db.collection('systemActivity').orderBy('createdAt', 'desc').limit(20).get(),
    ]);

    const students = studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const jobs = jobsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const applications = appsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Branch-wise aggregation
    const byBranch = {};
    students.forEach((s) => {
      const b = s.branch || 'Unknown';
      if (!byBranch[b]) byBranch[b] = { branch: b, total: 0, placed: 0, avgCgpa: 0, cgpaSum: 0 };
      byBranch[b].total++;
      byBranch[b].cgpaSum += parseFloat(s.cgpa) || 0;
      if ((s.placementStatus || '').toLowerCase() === 'placed') byBranch[b].placed++;
    });
    const byBranchArr = Object.values(byBranch).map((b) => ({
      ...b,
      avgCgpa: b.total > 0 ? parseFloat((b.cgpaSum / b.total).toFixed(2)) : 0,
      rate: b.total > 0 ? parseFloat(((b.placed / b.total) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.placed - a.placed);

    // Package distribution from placed students' applications
    const selectedApps = applications.filter((a) => (a.status || '').toLowerCase() === 'selected');
    const packageBuckets = { '<5': 0, '5-10': 0, '10-20': 0, '>20': 0 };
    jobs.forEach((job) => {
      const ctcNum = parsePackageToLpa(job.ctc || '');
      if (!ctcNum) return;
      if (ctcNum < 5) packageBuckets['<5']++;
      else if (ctcNum < 10) packageBuckets['5-10']++;
      else if (ctcNum < 20) packageBuckets['10-20']++;
      else packageBuckets['>20']++;
    });
    const packageDist = Object.entries(packageBuckets).map(([name, value]) => ({
      name: name === '<5' ? '< 5 LPA' : name === '>20' ? '> 20 LPA' : `${name} LPA`,
      value,
    }));

    // Top companies by placements
    const companyPlaced = {};
    selectedApps.forEach((a) => {
      const c = a.company || 'Unknown';
      companyPlaced[c] = (companyPlaced[c] || 0) + 1;
    });
    const topCompanies = Object.entries(companyPlaced)
      .map(([company, offers]) => {
        const relatedJobs = jobs.filter((j) => (j.company || '').toLowerCase() === company.toLowerCase());
        const avgCtc = relatedJobs.length
          ? (relatedJobs.reduce((s, j) => s + parsePackageToLpa(j.ctc || ''), 0) / relatedJobs.length).toFixed(1)
          : 0;
        return { company, offers, avgCtc: Number(avgCtc) };
      })
      .sort((a, b) => b.offers - a.offers)
      .slice(0, 10);

    // Placement trend — group by month of appliedAt
    const trendMap = {};
    applications.forEach((a) => {
      const date = a.appliedAt || a.createdAt;
      if (!date) return;
      const month = String(date).slice(0, 7); // "YYYY-MM"
      if (!trendMap[month]) trendMap[month] = { month, applications: 0, placed: 0 };
      trendMap[month].applications++;
      if ((a.status || '').toLowerCase() === 'selected') trendMap[month].placed++;
    });
    
    // Fill in missing months with 0 data for last 8 months
    const now = new Date();
    const last8Months = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0, 7); // "YYYY-MM"
      if (!trendMap[monthStr]) {
        trendMap[monthStr] = { month: monthStr, applications: 0, placed: 0 };
      }
      last8Months.push(trendMap[monthStr]);
    }
    const placementTrend = last8Months.sort((a, b) => a.month.localeCompare(b.month));

    // Recent system activity
    const recentActivity = activitySnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const placedCount = students.filter((s) => (s.placementStatus || '').toLowerCase() === 'placed').length;

    const responseData = {
      stats: {
        students: students.length,
        placed: placedCount,
        jobs: jobs.length,
        companies: recruitersSnap.size,
        applications: applications.length,
        placementRate: students.length > 0 ? parseFloat(((placedCount / students.length) * 100).toFixed(1)) : 0,
      },
      placementTrend,
      byBranch: byBranchArr,
      packageDist,
      topCompanies,
      recentActivity,
    };

    // Update cache
    adminAnalyticsCache = {
      data: responseData,
      timestamp: Date.now(),
    };

    res.json(responseData);
  } catch (err) {
    console.error('Analytics Error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/v1/analytics/recruiter  — recruiter sees their own metrics
router.get('/recruiter', verifyToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    if (!db) return res.json({ stats: {}, applicationFunnel: [], topCandidates: [] });

    const recruiterScope = await resolveRecruiterScope(db, req.user);
    const [jobsSnap, appsSnap] = await Promise.all([
      db.collection('jobs').get(),
      db.collection('applications').get(),
    ]);

    const jobs = jobsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const applications = appsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const myJobs = jobs.filter((job) => isOwnedByRecruiter(job, recruiterScope));
    const jobIds = new Set(myJobs.map((job) => job.id));
    const myApps = applications.filter((application) => jobIds.has(application.jobId) || isOwnedByRecruiter(application, recruiterScope));

    // Funnel
    const funnelStages = ['Applied', 'Shortlisted', 'In Process', 'Selected', 'Rejected'];
    const funnel = funnelStages.map((stage) => ({
      stage,
      count: myApps.filter((a) => (a.status || '').toLowerCase() === stage.toLowerCase()).length,
    }));

    // Applications per job
    const perJob = myJobs.map((job) => ({
      title: job.title,
      company: job.company,
      applicants: myApps.filter((a) => a.jobId === job.id).length,
      shortlisted: myApps.filter((a) => a.jobId === job.id && ['shortlisted', 'selected'].includes((a.status || '').toLowerCase())).length,
    })).sort((a, b) => b.applicants - a.applicants);

    res.json({
      stats: {
        totalJobs: myJobs.length,
        activeJobs: myJobs.filter((j) => (j.status || '').toLowerCase() === 'active').length,
        totalApplications: myApps.length,
        shortlisted: myApps.filter((a) => ['shortlisted', 'selected'].includes((a.status || '').toLowerCase())).length,
        selected: myApps.filter((a) => (a.status || '').toLowerCase() === 'selected').length,
      },
      applicationFunnel: funnel,
      perJobStats: perJob,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/analytics/candidates/ranked  — AI-ranked candidates for a job
router.get('/candidates/ranked', verifyToken, requireRole('admin', 'recruiter', 'faculty'), async (req, res) => {
  try {
    if (!db) return res.json({ candidates: [] });

    const { jobId } = req.query;
    const [studentsSnap, jobSnap] = await Promise.all([
      db.collection('students').get(),
      jobId ? db.collection('jobs').doc(jobId).get() : Promise.resolve(null),
    ]);

    const students = studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const job = jobSnap?.exists ? { id: jobSnap.id, ...jobSnap.data() } : null;

    if (req.user.role === 'recruiter') {
      const recruiterScope = await resolveRecruiterScope(db, req.user);
      if (!job || !isOwnedByRecruiter(job, recruiterScope)) {
        return res.status(403).json({ error: 'You can only rank candidates for your own jobs' });
      }
    }

    const ranked = rankStudents(students, job);

    res.json({
      candidates: ranked.map(({ student, score, rank }) => ({
        id: student.id,
        name: student.name,
        branch: student.branch,
        cgpa: student.cgpa,
        skills: student.skills,
        placementStatus: student.placementStatus,
        email: student.email,
        rollNo: student.rollNo,
        aiScore: score,
        rank,
      })),
      total: ranked.length,
      jobId: jobId || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/analytics/recommendations  — AI job recommendations for a student
router.get('/recommendations', verifyToken, requireRole('student'), async (req, res) => {
  try {
    if (!db) return res.json({ recommendations: [] });

    const [studentSnap, jobsSnap] = await Promise.all([
      db.collection('students').doc(req.user.uid).get(),
      db.collection('jobs').get(),
    ]);

    const student = studentSnap.exists ? { id: studentSnap.id, ...studentSnap.data() } : {};
    const jobs = jobsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const recommendations = recommendJobsForStudent(student, jobs).slice(0, 10);

    res.json({
      recommendations: recommendations.map(({ job, score }) => ({
        ...job,
        matchScore: score,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
