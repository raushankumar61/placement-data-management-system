const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { logActivity } = require('../utils/activityLogger');

const normalize = (value) => String(value || '').trim().toLowerCase();

// GET /api/v1/faculty/verifications
router.get('/verifications', verifyToken, requireRole('admin', 'faculty'), async (req, res) => {
  try {
    if (!db) return res.json({ verifications: [], total: 0 });
    const snap = await db.collection('verifications').orderBy('submittedAt', 'desc').get();
    const verifications = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    res.json({ verifications, total: verifications.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/faculty/verifications/:id
router.put(
  '/verifications/:id',
  verifyToken,
  requireRole('admin', 'faculty'),
  [
    body('status').isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status'),
    body('comment').optional().isString(),
  ],
  validate,
  async (req, res) => {
    try {
      if (!db) return res.json({ id: req.params.id, ...req.body });

      const ref = db.collection('verifications').doc(req.params.id);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: 'Verification not found' });

      const payload = {
        status: req.body.status,
        comment: req.body.comment || '',
        reviewedAt: new Date().toISOString(),
        reviewedBy: req.user.uid,
      };

      await ref.update(payload);

      const current = snap.data() || {};
      if (current.studentId) {
        const studentRef = db.collection('students').doc(current.studentId);
        const studentSnap = await studentRef.get();
        if (studentSnap.exists) {
          const student = studentSnap.data() || {};
          const updates = {};
          const currentSkills = normalize(current.field) === 'skills';
          const currentBranch = normalize(current.field) === 'branch';
          const currentCgpa = normalize(current.field) === 'cgpa';
          if (payload.status === 'approved') {
            if (currentSkills && current.newValue) updates.skills = current.newValue;
            if (currentBranch && current.newValue) updates.branch = current.newValue;
            if (currentCgpa && current.newValue) updates.cgpa = current.newValue;
          }
          if (Object.keys(updates).length) {
            await studentRef.set({ ...student, ...updates, updatedAt: new Date().toISOString(), updatedBy: req.user.uid }, { merge: true });
          }
        }
      }

      logActivity('verification_reviewed', { verificationId: req.params.id, status: payload.status }, req.user.uid);
      res.json({ id: req.params.id, ...payload });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/v1/faculty/placement-activities
router.get('/placement-activities', verifyToken, requireRole('admin', 'faculty'), async (req, res) => {
  try {
    if (!db) return res.json({ activities: [], total: 0 });
    const snap = await db.collection('placementActivities').orderBy('createdAt', 'desc').get();
    const activities = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    res.json({ activities, total: activities.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/faculty/placement-activities
router.post(
  '/placement-activities',
  verifyToken,
  requireRole('admin', 'faculty'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('skill').trim().notEmpty().withMessage('Skill is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const payload = {
        title: req.body.title,
        skill: req.body.skill,
        branch: req.body.branch || 'all',
        description: req.body.description || '',
        dueDate: req.body.dueDate || '',
        minCGPA: Number(req.body.minCGPA || 0),
        warningAfter: Number(req.body.warningAfter || 2),
        blockAfter: Number(req.body.blockAfter || 3),
        assignedStudentIds: Array.isArray(req.body.assignedStudentIds) ? req.body.assignedStudentIds : [],
        attendance: req.body.attendance || {},
        status: req.body.status || 'active',
        postedBy: req.user.name || req.user.email || req.user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (!db) return res.status(201).json({ id: uuidv4(), ...payload });
      const ref = await db.collection('placementActivities').add(payload);
      logActivity('placement_activity_created', { activityId: ref.id, title: payload.title }, req.user.uid);
      res.status(201).json({ id: ref.id, ...payload });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/v1/faculty/placement-activities/:id
router.put('/placement-activities/:id', verifyToken, requireRole('admin', 'faculty'), async (req, res) => {
  try {
    if (!db) return res.json({ id: req.params.id, ...req.body });
    const ref = db.collection('placementActivities').doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'Placement activity not found' });
    const payload = { ...req.body, updatedAt: new Date().toISOString(), updatedBy: req.user.uid };
    await ref.update(payload);
    res.json({ id: req.params.id, ...payload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;