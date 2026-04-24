// backend/routes/complaints.js
const express = require('express');
const router = express.Router();
const { body, query: queryParam } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { logActivity } = require('../utils/activityLogger');
const { sendMail } = require('../utils/emailService');

// GET /api/v1/complaints  — admin sees all; others see their own
router.get('/', verifyToken, async (req, res) => {
  try {
    if (!db) return res.json({ complaints: [], total: 0 });

    let q = db.collection('complaints').orderBy('createdAt', 'desc').limit(100);
    const snap = await q.get();
    let complaints = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Non-admins only see their own
    if (req.user.role !== 'admin') {
      complaints = complaints.filter((c) => c.createdBy === req.user.uid);
    }

    res.json({ complaints, total: complaints.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/complaints  — any authenticated user can file
router.post(
  '/',
  verifyToken,
  [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }).withMessage('Title must be under 200 characters'),
    body('description').trim().notEmpty().withMessage('Description is required').isLength({ max: 2000 }).withMessage('Description must be under 2000 characters'),
    body('category').optional().isIn(['technical', 'placement', 'recruiter', 'admin', 'other']).withMessage('Invalid category'),
  ],
  validate,
  async (req, res) => {
    try {
      const { title, description, category = 'other' } = req.body;

      const payload = {
        title,
        description,
        category,
        status: 'open',
        createdBy: req.user.uid,
        createdByEmail: req.user.email || '',
        createdByRole: req.user.role || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resolution: '',
        resolvedBy: null,
        resolvedAt: null,
      };

      if (!db) return res.status(201).json({ id: uuidv4(), ...payload });

      const ref = await db.collection('complaints').add(payload);
      logActivity('complaint_filed', { title, category }, req.user.uid);

      res.status(201).json({ id: ref.id, ...payload });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/v1/complaints/:id/resolve  — admin only
router.put(
  '/:id/resolve',
  verifyToken,
  requireRole('admin'),
  [
    body('resolution').trim().notEmpty().withMessage('Resolution message is required'),
    body('status').optional().isIn(['resolved', 'closed', 'open']).withMessage('Invalid status'),
  ],
  validate,
  async (req, res) => {
    try {
      const { resolution, status = 'resolved' } = req.body;
      const update = {
        resolution,
        status,
        resolvedBy: req.user.uid,
        resolvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (db) {
        await db.collection('complaints').doc(req.params.id).update(update);
        logActivity('complaint_resolved', { complaintId: req.params.id, status }, req.user.uid);

        // Notify the complainant via email
        const snap = await db.collection('complaints').doc(req.params.id).get();
        if (snap.exists && snap.data().createdByEmail) {
          await sendMail({
            to: snap.data().createdByEmail,
            subject: 'Your complaint has been resolved — PlaceCloud',
            text: `Your complaint "${snap.data().title}" has been marked as ${status}.\n\nResolution: ${resolution}`,
          });
        }
      }

      res.json({ id: req.params.id, ...update });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/v1/complaints/:id  — admin only
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (db) await db.collection('complaints').doc(req.params.id).delete();
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
