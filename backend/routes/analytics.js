// backend/routes/analytics.js
const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const { rankStudents, recommendJobsForStudent } = require('../utils/aiScoring');

// GET /api/v1/analytics/admin  — admin only, full system metrics
router.get('/admin', verifyToken, requireRole('admin'), async (req, res) => {
  try {
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
      const ctcNum = parseFloat(String(job.ctc || '').match(/\d+/)?.[0] || 0);
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
          ? (relatedJobs.reduce((s, j) => s + (parseFloat(String(j.ctc || '').match(/\d+/)?.[0] || 0)), 0) / relatedJobs.length).toFixed(1)
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
    const placementTrend = Object.values(trendMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-8);

    // Recent system activity
    const recentActivity = activitySnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const placedCount = students.filter((s) => (s.placementStatus || '').toLowerCase() === 'placed').length;

    res.json({
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
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/analytics/recruiter  — recruiter sees their own metrics
router.get('/recruiter', verifyToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    if (!db) return res.json({ stats: {}, applicationFunnel: [], topCandidates: [] });

    const uid = req.user.uid;
    const [jobsSnap, appsSnap] = await Promise.all([
      db.collection('jobs').where('postedBy', '==', uid).get(),
      db.collection('applications').get(),
    ]);

    const jobs = jobsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const jobIds = new Set(jobs.map((j) => j.id));
    const myApps = appsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => jobIds.has(a.jobId));

    // Funnel
    const funnelStages = ['Applied', 'Shortlisted', 'In Process', 'Selected', 'Rejected'];
    const funnel = funnelStages.map((stage) => ({
      stage,
      count: myApps.filter((a) => (a.status || '').toLowerCase() === stage.toLowerCase()).length,
    }));

    // Applications per job
    const perJob = jobs.map((job) => ({
      title: job.title,
      company: job.company,
      applicants: myApps.filter((a) => a.jobId === job.id).length,
      shortlisted: myApps.filter((a) => a.jobId === job.id && ['shortlisted', 'selected'].includes((a.status || '').toLowerCase())).length,
    })).sort((a, b) => b.applicants - a.applicants);

    res.json({
      stats: {
        totalJobs: jobs.length,
        activeJobs: jobs.filter((j) => (j.status || '').toLowerCase() === 'active').length,
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
