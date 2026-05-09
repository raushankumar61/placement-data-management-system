// backend/routes/jobs.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createJobDefaults } = require('../utils/marketplaceFactory');
const { logActivity } = require('../utils/activityLogger');
const { branchMatches, normalizeJobBranches } = require('../utils/branchEligibility');
const { isOwnedByRecruiter, resolveRecruiterScope } = require('../utils/recruiterOwnership');

const sanitizeJobBranches = (branches) => {
  const normalized = normalizeJobBranches(branches);
  return normalized.length ? normalized : ['All'];
};

// GET /api/v1/jobs  — all authenticated users can browse jobs
router.get('/', verifyToken, async (req, res) => {
  try {
    if (!db) {
      return res.json({
        jobs: [
          createJobDefaults({ id: '1', title: 'SDE II', company: 'Google', ctc: '32 LPA', type: 'Full-time', status: 'active', deadline: '2025-03-01', minCGPA: 7.0, openings: 10, location: 'Bengaluru (BLR)' }, 'job-1'),
          createJobDefaults({ id: '2', title: 'Data Scientist', company: 'Microsoft', ctc: '28 LPA', type: 'Full-time', status: 'active', deadline: '2025-03-10', minCGPA: 7.5, openings: 5, location: 'Hyderabad (HYD)' }, 'job-2'),
          createJobDefaults({ id: '3', title: 'Senior Backend Engineer', company: 'Amazon', ctc: '36 LPA', type: 'Full-time', status: 'active', deadline: '2025-03-18', minCGPA: 7.2, openings: 8, location: 'Bengaluru (BLR)' }, 'job-3'),
          createJobDefaults({ id: '4', title: 'Cloud Platform Engineer', company: 'Oracle', ctc: '30 LPA', type: 'Full-time', status: 'active', deadline: '2025-03-22', minCGPA: 7.0, openings: 6, location: 'Delhi NCR' }, 'job-4'),
          createJobDefaults({ id: '5', title: 'ML Engineer', company: 'Swiggy', ctc: '34 LPA', type: 'Full-time', status: 'active', deadline: '2025-04-05', minCGPA: 7.8, openings: 4, location: 'Gurugram' }, 'job-5'),
        ],
        total: 5,
      });
    }

    let query = db.collection('jobs');
    const { status, type, branch, mine, limit: lim = 200, offset = 0 } = req.query;

    if (status) query = query.where('status', '==', status);
    if (type) query = query.where('type', '==', type);

    // Apply limit at Firestore level
    const snap = await query.limit(Number(lim) + Number(offset)).get();
    let jobs = snap.docs.map((d) => ({ id: d.id, ...createJobDefaults(d.data() || {}, d.id) }));

    if (String(mine).toLowerCase() === 'true' && req.user.role === 'recruiter') {
      const recruiterScope = await resolveRecruiterScope(db, req.user);
      jobs = jobs.filter((job) => isOwnedByRecruiter(job, recruiterScope));
    }

    if (branch) jobs = jobs.filter((j) => branchMatches(j.branches, branch));

    // Apply pagination
    const paginated = jobs.slice(Number(offset), Number(offset) + Number(lim));
    res.json({ jobs: paginated, total: jobs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/jobs/:id  — all authenticated users
router.get('/:id', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(404).json({ error: 'Not found' });
    const snap = await db.collection('jobs').doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Job not found' });
    res.json({ id: snap.id, ...snap.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/jobs  — admin or verified recruiter can post jobs
router.post(
  '/',
  verifyToken,
  requireRole('admin', 'recruiter'),
  [
    body('title').trim().notEmpty().withMessage('Job title is required').isLength({ max: 200 }),
    body('description').trim().notEmpty().withMessage('Job description is required').isLength({ max: 5000 }),
    body('type').optional().isIn(['Full-time', 'Internship', 'PPO', 'Contract']).withMessage('Invalid job type'),
    body('minCGPA').optional().isFloat({ min: 0, max: 10 }).withMessage('CGPA must be between 0 and 10'),
    body('openings').optional().isInt({ min: 1 }).withMessage('Openings must be a positive number'),
  ],
  validate,
  async (req, res) => {
    try {
      const recruiterScope = await resolveRecruiterScope(db, req.user);

      // Check recruiter is verified
      if (req.user.role === 'recruiter' && db) {
        const recruiterSnap = await db.collection('recruiters').doc(req.user.uid).get();
        if (recruiterSnap.exists && recruiterSnap.data().verified === false) {
          return res.status(403).json({
            error: 'Your recruiter account is pending verification. Please contact the placement admin.',
          });
        }
      }

      const recruiterId = recruiterScope.primaryRecruiterId || req.user.uid;
      const payload = createJobDefaults({
        ...req.body,
        branches: sanitizeJobBranches(req.body.branches),
        recruiterId,
        postedBy: recruiterId,
        postedByUid: req.user.uid,
        postedByName: req.user.name || req.user.displayName || '',
        recruiterEmail: req.user.email || '',
        recruiterName: req.user.name || req.user.displayName || req.body.company || '',
        status: req.body.status || 'active',
        applicants: Number(req.body.applicants || 0),
        createdAt: new Date().toISOString(),
      }, req.body.title || req.body.company || uuidv4());

      if (!db) return res.status(201).json({ id: uuidv4(), ...payload });

      const ref = await db.collection('jobs').add(payload);

      // Auto-notify students and admin about new job posting
      await db.collection('notifications').add({
        message: `New job posted: ${payload.title} at ${payload.company}. Apply now!`,
        targetRole: 'student',
        type: 'in-app',
        sentAt: new Date().toISOString(),
        sentBy: 'system',
        read: [],
        jobId: ref.id,
        actionable: true,
        actions: ['view'],
      });

      // Notify admin
      await db.collection('notifications').add({
        message: `New job posted: ${payload.title} at ${payload.company} by ${payload.recruiterName}`,
        targetRole: 'admin',
        type: 'in-app',
        sentAt: new Date().toISOString(),
        sentBy: req.user.uid,
        read: [],
        jobId: ref.id,
        actionable: true,
        actions: ['review'],
      });

      logActivity('job_posted', { jobId: ref.id, title: payload.title, company: payload.company }, req.user.uid);

      res.status(201).json({ id: ref.id, ...payload });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/v1/jobs/:id  — admin or the recruiter who posted it
router.put(
  '/:id',
  verifyToken,
  requireRole('admin', 'recruiter'),
  [
    body('type').optional().isIn(['Full-time', 'Internship', 'PPO', 'Contract']).withMessage('Invalid job type'),
    body('minCGPA').optional().isFloat({ min: 0, max: 10 }).withMessage('CGPA must be between 0 and 10'),
  ],
  validate,
  async (req, res) => {
    try {
      const recruiterScope = await resolveRecruiterScope(db, req.user);
      const currentSnap = db ? await db.collection('jobs').doc(req.params.id).get() : null;
      const current = currentSnap?.exists ? currentSnap.data() : {};
      const nextBranches = Object.prototype.hasOwnProperty.call(req.body, 'branches')
        ? sanitizeJobBranches(req.body.branches)
        : current.branches;

      // Recruiters can only edit their own jobs
      if (req.user.role === 'recruiter' && !isOwnedByRecruiter(current, recruiterScope)) {
        return res.status(403).json({ error: 'You can only edit your own job postings' });
      }

      const recruiterId = current.recruiterId || current.postedBy || current.postedByUid || recruiterScope.primaryRecruiterId || req.user.uid;

      const payload = createJobDefaults({
        ...current,
        ...req.body,
        branches: nextBranches,
        recruiterId,
        postedBy: current.postedBy || recruiterId,
        postedByUid: current.postedByUid || req.user.uid,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.uid,
      }, req.params.id);

      if (db) await db.collection('jobs').doc(req.params.id).update(payload);
      res.json({ id: req.params.id, ...payload });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/v1/jobs/:id/close  — admin or job owner can close it
router.put('/:id/close', verifyToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const recruiterScope = await resolveRecruiterScope(db, req.user);
    const snap = db ? await db.collection('jobs').doc(req.params.id).get() : null;
    const current = snap?.exists ? snap.data() : {};

    if (req.user.role === 'recruiter' && !isOwnedByRecruiter(current, recruiterScope)) {
      return res.status(403).json({ error: 'You can only close your own job postings' });
    }

    if (db) {
      await db.collection('jobs').doc(req.params.id).update({
        status: 'closed',
        closedAt: new Date().toISOString(),
        closedBy: req.user.uid,
      });
    }
    res.json({ id: req.params.id, status: 'closed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/jobs/:id  — admin only
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (db) await db.collection('jobs').doc(req.params.id).delete();
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
