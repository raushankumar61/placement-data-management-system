// backend/routes/recruiters.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createRecruiterDefaults } = require('../utils/marketplaceFactory');
const { logActivity } = require('../utils/activityLogger');
const { resolveRecruiterScope } = require('../utils/recruiterOwnership');

// GET /api/v1/recruiters  — admin only
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!db) return res.json({ recruiters: [], total: 0 });
    const snap = await db.collection('recruiters').get();
    const recruiters = snap.docs.map((d) => ({ id: d.id, ...createRecruiterDefaults(d.data() || {}, d.id) }));
    res.json({ recruiters, total: recruiters.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/recruiters/me  — recruiter sees their own profile
router.get('/me', verifyToken, requireRole('recruiter'), async (req, res) => {
  try {
    if (!db) return res.json({});

    const scope = await resolveRecruiterScope(db, req.user);
    const [uidDoc, ...otherDocs] = scope.recruiterDocs || [];
    const profile = uidDoc || otherDocs[0] || null;

    if (!profile) return res.status(404).json({ error: 'Recruiter profile not found' });
    res.json({ id: profile.id, ...profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/recruiters  — recruiter registers their own profile; admin can also create
router.post(
  '/',
  verifyToken,
  requireRole('admin', 'recruiter'),
  [
    body('companyName').trim().notEmpty().withMessage('Company name is required'),
    body('contactEmail').optional().isEmail().withMessage('Valid contact email required'),
  ],
  validate,
  async (req, res) => {
    try {
      const payload = createRecruiterDefaults({
        ...req.body,
        uid: req.user.uid,
        email: req.body.email || req.user.email || '',
        verified: false,
        createdAt: new Date().toISOString(),
      }, req.body.companyName || req.user.uid);

      if (!db) return res.status(201).json({ id: uuidv4(), ...payload });

      // Use uid as doc ID so we can look up by recruiter uid
      await db.collection('recruiters').doc(req.user.uid).set(payload, { merge: true });

      logActivity('user_registered', { role: 'recruiter', company: payload.companyName }, req.user.uid);
      res.status(201).json({ id: req.user.uid, ...payload });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/v1/recruiters/:id  — admin or the recruiter who owns the profile
router.put(
  '/:id',
  verifyToken,
  requireRole('admin', 'recruiter'),
  [
    body('contactEmail').optional().isEmail().withMessage('Valid contact email required'),
  ],
  validate,
  async (req, res) => {
    try {
      // Recruiter can only update their own profile
      if (req.user.role === 'recruiter' && req.params.id !== req.user.uid) {
        return res.status(403).json({ error: 'You can only update your own recruiter profile' });
      }

      const currentSnap = db ? await db.collection('recruiters').doc(req.params.id).get() : null;
      const current = currentSnap?.exists ? currentSnap.data() : {};

      // Recruiters cannot change their own verified status
      const update = { ...req.body };
      if (req.user.role === 'recruiter') delete update.verified;

      const payload = createRecruiterDefaults({
        ...current,
        ...update,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.uid,
      }, req.params.id);

      if (db) await db.collection('recruiters').doc(req.params.id).update(payload);
      res.json({ id: req.params.id, ...payload });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/v1/recruiters/:id/verify  — admin only
router.put(
  '/:id/verify',
  verifyToken,
  requireRole('admin'),
  [
    body('verified').isBoolean().withMessage('verified must be a boolean'),
  ],
  validate,
  async (req, res) => {
    try {
      const { verified } = req.body;
      if (db) {
        await db.collection('recruiters').doc(req.params.id).update({
          verified,
          verifiedAt: new Date().toISOString(),
          verifiedBy: req.user.uid,
        });

        // Notify the recruiter via in-app notification
        const recruiterSnap = await db.collection('recruiters').doc(req.params.id).get();
        const recruiterData = recruiterSnap.exists ? recruiterSnap.data() : {};
        const msg = verified
          ? `Your recruiter account for ${recruiterData.companyName || 'your company'} has been verified. You can now post jobs.`
          : `Your recruiter account verification has been revoked. Contact the placement office for details.`;

        await db.collection('notifications').add({
          message: msg,
          targetRole: 'recruiter',
          targetUid: req.params.id,
          type: 'in-app',
          sentAt: new Date().toISOString(),
          sentBy: req.user.uid,
          read: [],
        });
      }

      logActivity('recruiter_verified', { recruiterId: req.params.id, verified }, req.user.uid);
      res.json({ id: req.params.id, verified });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/v1/recruiters/:id  — admin only
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (db) await db.collection('recruiters').doc(req.params.id).delete();
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
