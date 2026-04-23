// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const { admin, db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

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

    await admin.auth().setCustomUserClaims(uid, { role });
    res.json({ synced: true, role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/auth/set-role  (admin only)
// Sets a custom claim role on any user. Restricted to admins.
router.post('/set-role', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { targetUid, role } = req.body;
    const validRoles = ['admin', 'student', 'recruiter', 'faculty'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }
    if (!targetUid) {
      return res.status(400).json({ error: 'targetUid is required' });
    }

    await admin.auth().setCustomUserClaims(targetUid, { role });

    // Also update the Firestore profile to stay in sync
    if (db) {
      await db.collection('users').doc(targetUid).update({
        role,
        roleUpdatedAt: new Date().toISOString(),
        roleUpdatedBy: req.user.uid,
      });
    }

    res.json({ success: true, message: `Role '${role}' assigned to ${targetUid}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
