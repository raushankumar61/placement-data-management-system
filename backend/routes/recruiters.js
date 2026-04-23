// backend/routes/recruiters.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, async (req, res) => {
  try {
    if (!db) return res.json({ recruiters: [], total: 0 });
    const snap = await db.collection('recruiters').get();
    const recruiters = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ recruiters, total: recruiters.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const payload = {
      ...req.body,
      uid: req.user.uid,
      verified: false,
      createdAt: new Date().toISOString(),
    };
    if (!db) return res.status(201).json({ id: uuidv4(), ...payload });
    const ref = await db.collection('recruiters').add(payload);
    res.status(201).json({ id: ref.id, ...payload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const payload = { ...req.body, updatedAt: new Date().toISOString() };
    if (db) await db.collection('recruiters').doc(req.params.id).update(payload);
    res.json({ id: req.params.id, ...payload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/verify', verifyToken, async (req, res) => {
  try {
    const { verified } = req.body;
    if (db) await db.collection('recruiters').doc(req.params.id).update({ verified, verifiedAt: new Date().toISOString(), verifiedBy: req.user.uid });
    res.json({ id: req.params.id, verified });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
