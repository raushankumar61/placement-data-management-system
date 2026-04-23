// backend/routes/notifications.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

// GET /api/v1/notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    if (!db) return res.json({ notifications: [], total: 0 });
    const snap = await db.collection('notifications')
      .orderBy('sentAt', 'desc')
      .limit(50)
      .get();
    const notifications = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ notifications, total: notifications.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/notifications/send
router.post('/send', verifyToken, async (req, res) => {
  try {
    const { message, targetRole, type = 'in-app' } = req.body;

    if (!message) return res.status(400).json({ error: 'Message is required' });

    const payload = {
      message,
      targetRole: targetRole || 'all',
      type,
      sentAt: new Date().toISOString(),
      sentBy: req.user.uid,
      read: [],
    };

    if (!db) return res.status(201).json({ id: uuidv4(), ...payload });

    const ref = await db.collection('notifications').add(payload);
    res.status(201).json({ id: ref.id, ...payload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/notifications/:id/read
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    if (db) {
      const ref = db.collection('notifications').doc(req.params.id);
      const snap = await ref.get();
      if (snap.exists) {
        const read = snap.data().read || [];
        if (!read.includes(req.user.uid)) {
          await ref.update({ read: [...read, req.user.uid] });
        }
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
