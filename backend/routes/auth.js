// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const { admin, db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

// POST /api/v1/auth/verify-token
router.post('/verify-token', verifyToken, async (req, res) => {
  try {
    const uid = req.user.uid;
    let profile = null;

    if (db) {
      const snap = await db.collection('users').doc(uid).get();
      if (snap.exists) profile = { id: snap.id, ...snap.data() };
    }

    res.json({ uid, email: req.user.email, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/auth/set-role  (admin only – set custom claims)
router.post('/set-role', verifyToken, async (req, res) => {
  try {
    const { targetUid, role } = req.body;
    if (!['admin', 'student', 'recruiter', 'faculty'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    await admin.auth().setCustomUserClaims(targetUid, { role });
    res.json({ success: true, message: `Role ${role} assigned to ${targetUid}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
