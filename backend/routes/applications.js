// backend/routes/applications.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET /api/v1/applications  — all authenticated users (scoped by role in query)
// Students only see their own; admin/recruiter/faculty can filter freely
router.get('/', verifyToken, async (req, res) => {
  try {
    if (!db) return res.json({ applications: [], total: 0 });

    let query = db.collection('applications');
    const { studentId, jobId, status } = req.query;

    // Students only see their own applications
    if (req.user.role === 'student') {
      query = query.where('studentId', '==', req.user.uid);
    } else {
      if (studentId) query = query.where('studentId', '==', studentId);
      if (jobId) query = query.where('jobId', '==', jobId);
    }
    if (status) query = query.where('status', '==', status);

    const snap = await query.get();
    const applications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ applications, total: applications.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/applications  — students only can apply
router.post('/', verifyToken, requireRole('student'), async (req, res) => {
  try {
    const { jobId } = req.body;
    const studentId = req.user.uid;

    const payload = {
      studentId,
      jobId,
      status: 'Applied',
      appliedAt: new Date().toISOString(),
    };

    if (!db) return res.status(201).json({ id: uuidv4(), ...payload });

    // Check for duplicate
    const existing = await db.collection('applications')
      .where('studentId', '==', studentId)
      .where('jobId', '==', jobId)
      .get();

    if (!existing.empty) {
      return res.status(409).json({ error: 'Already applied to this job' });
    }

    const ref = await db.collection('applications').add(payload);

    // Increment applicant count on job
    const jobRef = db.collection('jobs').doc(jobId);
    const jobSnap = await jobRef.get();
    if (jobSnap.exists) {
      await jobRef.update({ applicants: (jobSnap.data().applicants || 0) + 1 });
    }

    res.status(201).json({ id: ref.id, ...payload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/applications/:id/status  — admin or recruiter can update status
router.put('/:id/status', verifyToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Applied', 'Shortlisted', 'Selected', 'Rejected', 'In Process'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const payload = { status, updatedAt: new Date().toISOString(), updatedBy: req.user.uid };
    if (db) await db.collection('applications').doc(req.params.id).update(payload);

    res.json({ id: req.params.id, ...payload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
