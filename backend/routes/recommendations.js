const express = require('express');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { logActivity } = require('../utils/activityLogger');

// GET /api/v1/recommendations - role-scoped recommendations list
router.get('/', verifyToken, async (req, res) => {
  try {
    if (!db) return res.json({ recommendations: [], total: 0 });

    let query = db.collection('recommendations');

    if (req.user.role === 'student') {
      query = query.where('studentId', '==', req.user.uid);
    } else if (req.user.role === 'faculty') {
      query = query.where('createdBy', '==', req.user.uid);
    }

    const snap = await query.get();
    const recommendations = snap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

    res.json({ recommendations, total: recommendations.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/recommendations - faculty/admin can recommend a student for a job
router.post(
  '/',
  verifyToken,
  requireRole('faculty', 'admin'),
  [
    body('studentId').notEmpty().withMessage('studentId is required'),
    body('jobId').notEmpty().withMessage('jobId is required'),
    body('reason').trim().notEmpty().withMessage('reason is required').isLength({ max: 1000 }).withMessage('reason must be under 1000 characters'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('rating must be between 1 and 5'),
  ],
  validate,
  async (req, res) => {
    try {
      const { studentId, jobId, reason, rating = 5 } = req.body;

      if (!db) {
        const payload = {
          studentId,
          jobId,
          reason,
          rating,
          status: 'Pending',
          createdAt: new Date().toISOString(),
          createdBy: req.user.uid,
          createdByRole: req.user.role,
          facultyName: req.user.name || req.user.displayName || 'Faculty',
        };
        return res.status(201).json({ id: uuidv4(), ...payload });
      }

      const [studentSnap, jobSnap] = await Promise.all([
        db.collection('students').doc(studentId).get(),
        db.collection('jobs').doc(jobId).get(),
      ]);

      if (!studentSnap.exists) return res.status(404).json({ error: 'Student not found' });
      if (!jobSnap.exists) return res.status(404).json({ error: 'Job not found' });

      const student = studentSnap.data() || {};
      const job = jobSnap.data() || {};
      const now = new Date().toISOString();
      const payload = {
        studentId,
        student: student.name || 'Student',
        studentEmail: student.email || '',
        jobId,
        role: job.title || 'Role',
        company: job.company || 'Company',
        reason,
        rating: Number(rating) || 5,
        status: 'Pending',
        date: now.slice(0, 10),
        createdAt: now,
        createdBy: req.user.uid,
        createdByRole: req.user.role,
        facultyName: req.user.name || req.user.displayName || 'Faculty',
      };

      const ref = await db.collection('recommendations').add(payload);

      await db.collection('notifications').add({
        message: `New recommendation: ${payload.role} at ${payload.company}.`,
        targetRole: 'student',
        targetUid: studentId,
        type: 'in-app',
        sentAt: now,
        sentBy: req.user.uid,
        read: [],
        recommendationId: ref.id,
      });

      logActivity('recommendation_created', { recommendationId: ref.id, studentId, jobId }, req.user.uid);
      res.status(201).json({ id: ref.id, ...payload });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;