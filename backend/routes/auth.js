// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { admin, db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { logActivity } = require('../utils/activityLogger');

// POST /api/v1/auth/verify-token
// Returns the user's uid, email, and Firestore profile.
router.post('/verify-token', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    let profile = null;

    if (db) {
      const snap = await db.collection('users').doc(uid).get();
      if (snap.exists) profile = { id: snap.id, ...snap.data() };
    }

    res.json({ uid, email: req.user.email, role: req.user.role, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/auth/sync-claims
// Reads the calling user's role from Firestore and writes it to their
// Firebase custom claims. Called by the frontend after registration so
// that the role is available in subsequent ID tokens without a Firestore
// lookup in the middleware.
// Any authenticated user can sync their OWN claims.
router.post('/sync-claims', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;

    if (!db) {
      return res.json({ synced: false, message: 'Firestore not available' });
    }

    const snap = await db.collection('users').doc(uid).get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const { role } = snap.data();
    if (!role) {
      return res.status(400).json({ error: 'No role assigned to this user' });
    }

    // Check if this is a first-time sync (no existing claims)
    const currentUser = await admin.auth().getUser(uid);
    const isFirstSync = !currentUser.customClaims?.role;

    await admin.auth().setCustomUserClaims(uid, { role });

    if (isFirstSync) {
      logActivity('user_registered', { role, email: snap.data().email || '' }, uid);
    }

    res.json({ synced: true, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/auth/set-role  (admin only)
router.post(
  '/set-role',
  verifyToken,
  requireRole('admin'),
  [
    body('targetUid').notEmpty().withMessage('targetUid is required'),
    body('role').isIn(['admin', 'student', 'recruiter', 'faculty']).withMessage('Invalid role. Must be one of: admin, student, recruiter, faculty'),
  ],
  validate,
  async (req, res) => {
    try {
      const { targetUid, role } = req.body;

      await admin.auth().setCustomUserClaims(targetUid, { role });

      // Also update the Firestore profile to stay in sync
      if (db) {
        await db.collection('users').doc(targetUid).update({
          role,
          roleUpdatedAt: new Date().toISOString(),
          roleUpdatedBy: req.user.uid,
        });
      }

      logActivity('role_assigned', { targetUid, role }, req.user.uid);
      res.json({ success: true, message: `Role '${role}' assigned to ${targetUid}` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
