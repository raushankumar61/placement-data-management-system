const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const sortByCreatedAtDesc = (items) => items.sort((a, b) => {
  const left = new Date(b.createdAt || 0).getTime();
  const right = new Date(a.createdAt || 0).getTime();
  return left - right;
});

// GET /api/v1/mock-interviews
router.get('/', verifyToken, requireRole('student', 'admin', 'faculty'), async (req, res) => {
  try {
    if (!db) return res.json({ requests: [], total: 0 });

    let query = db.collection('mockInterviews');

    if (req.user.role === 'student') {
      query = query.where('studentId', '==', req.user.uid);
    } else if (req.query.studentId) {
      query = query.where('studentId', '==', req.query.studentId);
    }

    const snap = await query.get();
    const requests = sortByCreatedAtDesc(
      snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
    );

    res.json({ requests, total: requests.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/mock-interviews
router.post(
  '/',
  verifyToken,
  requireRole('student'),
  [
    body('domain').notEmpty().withMessage('domain is required'),
    body('topic').trim().notEmpty().withMessage('topic is required'),
    body('notes').optional().isString(),
  ],
  validate,
  async (req, res) => {
    try {
      const payload = {
        studentId: req.user.uid,
        studentName: req.body.studentName || req.user.name || req.user.displayName || 'Student',
        studentBranch: req.body.studentBranch || '',
        domain: req.body.domain,
        topic: req.body.topic,
        notes: req.body.notes || '',
        status: 'Pending',
        createdAt: new Date().toISOString(),
      };

      if (!db) return res.status(201).json({ id: uuidv4(), ...payload });

      const ref = await db.collection('mockInterviews').add(payload);
      res.status(201).json({ id: ref.id, ...payload });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
