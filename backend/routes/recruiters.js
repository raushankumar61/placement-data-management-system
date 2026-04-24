// backend/routes/recruiters.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const { createRecruiterDefaults } = require('../utils/marketplaceFactory');

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

// POST /api/v1/recruiters  — recruiter registers their own profile; admin can also create
router.post('/', verifyToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const payload = createRecruiterDefaults({
      ...req.body,
      uid: req.user.uid,
      verified: false,
      createdAt: new Date().toISOString(),
    }, req.body.companyName || req.user.uid);
    if (!db) return res.status(201).json({ id: uuidv4(), ...payload });
    const ref = await db.collection('recruiters').add(payload);
    res.status(201).json({ id: ref.id, ...payload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/recruiters/:id  — admin or the recruiter who owns the profile
router.put('/:id', verifyToken, requireRole('admin', 'recruiter'), async (req, res) => {
  try {
    const currentSnap = db ? await db.collection('recruiters').doc(req.params.id).get() : null;
    const current = currentSnap?.exists ? currentSnap.data() : {};
    const payload = createRecruiterDefaults({ ...current, ...req.body, updatedAt: new Date().toISOString() }, req.params.id);
    if (db) await db.collection('recruiters').doc(req.params.id).update(payload);
    res.json({ id: req.params.id, ...payload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/recruiters/:id/verify  — admin only
router.put('/:id/verify', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { verified } = req.body;
    if (db) {
      await db.collection('recruiters').doc(req.params.id).update({
        verified,
        verifiedAt: new Date().toISOString(),
        verifiedBy: req.user.uid,
      });
    }
    res.json({ id: req.params.id, verified });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
