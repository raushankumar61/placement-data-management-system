const express = require('express');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { logActivity } = require('../utils/activityLogger');

// GET /api/v1/interviews - authenticated users can list interviews
router.get('/', verifyToken, async (req, res) => {
  try {
    if (!db) return res.json({ interviews: [], total: 0 });

    let query = db.collection('interviews');
    if (req.user.role === 'student') {
      query = query.where('studentId', '==', req.user.uid);
    } else if (req.user.role === 'recruiter') {
      query = query.where('recruiterId', '==', req.user.uid);
    }

    const snap = await query.orderBy('createdAt', 'desc').get();
    const interviews = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    res.json({ interviews, total: interviews.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/interviews - admin or recruiter can schedule interviews
router.post(
  '/',
  verifyToken,
  requireRole('admin', 'recruiter'),
  [
    body('studentId').notEmpty().withMessage('studentId is required'),
    body('date').notEmpty().withMessage('date is required'),
    body('time').notEmpty().withMessage('time is required'),
    body('role').notEmpty().withMessage('role is required'),
  ],
  validate,
  async (req, res) => {
    try {
      if (!db) return res.status(201).json({ id: uuidv4(), ...req.body });

      const studentSnap = await db.collection('students').doc(req.body.studentId).get();
      if (!studentSnap.exists) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const payload = {
        studentId: req.body.studentId,
        student: studentSnap.data().name || '',
        role: req.body.role,
        date: req.body.date,
        time: req.body.time,
        mode: req.body.mode || 'Online',
        platform: req.body.platform || '',
        round: req.body.round || 'Technical Round 1',
        link: req.body.link || req.body.venue || '',
        venue: req.body.venue || '',
        instructions: req.body.instructions || '',
        status: 'scheduled',
        recruiterId: req.user.uid,
        recruiterName: req.user.name || req.user.displayName || '',
        createdAt: new Date().toISOString(),
        createdBy: req.user.uid,
      };

      const ref = await db.collection('interviews').add(payload);

      await db.collection('notifications').add({
        message: `Interview scheduled: ${payload.round} for ${payload.role} on ${payload.date} at ${payload.time}.`,
        targetRole: 'student',
        targetUid: payload.studentId,
        type: 'in-app',
        sentAt: new Date().toISOString(),
        sentBy: req.user.uid,
        read: [],
        interviewId: ref.id,
      });

      logActivity('interview_scheduled', { interviewId: ref.id, studentId: payload.studentId, role: payload.role }, req.user.uid);
      res.status(201).json({ id: ref.id, ...payload });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/v1/interviews/:id - admin or recruiter can cancel interviews
router.delete('/:id', verifyToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    if (db) {
      const snap = await db.collection('interviews').doc(req.params.id).get();
      if (!snap.exists) {
        return res.status(404).json({ error: 'Interview not found' });
      }
      const interview = snap.data();
      if (req.user.role === 'recruiter' && interview.recruiterId && interview.recruiterId !== req.user.uid) {
        return res.status(403).json({ error: 'You can only cancel interviews you created' });
      }
      await db.collection('interviews').doc(req.params.id).delete();
    }
    logActivity('interview_cancelled', { interviewId: req.params.id }, req.user.uid);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;