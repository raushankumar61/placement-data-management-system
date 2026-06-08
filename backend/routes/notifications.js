// backend/routes/notifications.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { logActivity } = require('../utils/activityLogger');

const isNotificationVisibleToUser = (notification = {}, user = {}) => {
  const role = user.role;
  const uid = user.uid;
  
  if (role === 'admin') return true;
  if (notification.sentBy === uid) return true;

  const targetRole = notification.targetRole || 'all';
  const targetUid = notification.targetUid || null;
  const roleAllowed = targetRole === 'all' || targetRole === role;
  const uidAllowed = !targetUid || targetUid === uid;
  return roleAllowed && uidAllowed;
};

// GET /api/v1/notifications  — all authenticated users, scoped by role
router.get('/', verifyToken, async (req, res) => {
  try {
    if (!db) return res.json({ notifications: [], total: 0 });

    let query = db.collection('notifications').orderBy('sentAt', 'desc').limit(50);
    const snap = await query.get();

    const uid = req.user.uid;
    const notifications = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((n) => isNotificationVisibleToUser(n, req.user))
      .map((n) => ({
        ...n,
        isRead: Array.isArray(n.read) ? n.read.includes(uid) : false,
      }));

    res.json({ notifications, total: notifications.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/notifications/send  — admin OR faculty can broadcast
router.post(
  '/send',
  verifyToken,
  requireRole('admin', 'faculty'),
  [
    body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 500 }).withMessage('Message must be under 500 characters'),
    body('targetRole').optional().isIn(['all', 'student', 'recruiter', 'faculty', 'admin']).withMessage('Invalid targetRole'),
    body('type').optional().isIn(['in-app', 'email', 'sms']).withMessage('Invalid notification type'),
  ],
  validate,
  async (req, res) => {
    try {
      const { message, targetRole, type = 'in-app' } = req.body;

      const payload = {
        message,
        targetRole: targetRole || 'all',
        type,
        sentAt: new Date().toISOString(),
        sentBy: req.user.uid,
        sentByRole: req.user.role,
        read: [],
      };

      if (!db) return res.status(201).json({ id: uuidv4(), ...payload });

      const ref = await db.collection('notifications').add(payload);

      // Audit log
      logActivity('notification_sent', { targetRole: payload.targetRole, message: payload.message.slice(0, 80) }, req.user.uid);

      res.status(201).json({ id: ref.id, ...payload });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/v1/notifications/:id/read  — any authenticated user marks their own read
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    if (db) {
      const ref = db.collection('notifications').doc(req.params.id);
      const snap = await ref.get();
      if (snap.exists) {
        const current = snap.data() || {};
        if (!isNotificationVisibleToUser(current, req.user)) {
          return res.status(403).json({ error: 'Notification not accessible' });
        }
        const read = current.read || [];
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

// PUT /api/v1/notifications/:id/read-all  — mark all as read for this user
router.put('/read-all', verifyToken, async (req, res) => {
  try {
    if (!db) return res.json({ success: true });
    const snap = await db.collection('notifications')
      .orderBy('sentAt', 'desc')
      .limit(100)
      .get();

    const batch = db.batch();
    snap.docs.forEach((d) => {
      const current = d.data() || {};
      if (!isNotificationVisibleToUser(current, req.user)) return;
      const readArr = current.read || [];
      if (!readArr.includes(req.user.uid)) {
        batch.update(d.ref, { read: [...readArr, req.user.uid] });
      }
    });
    await batch.commit();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/notifications/:id/action  — perform action on notification (shortlist, reject, etc.)
router.post('/:id/action', verifyToken, async (req, res) => {
  try {
    if (!db) return res.status(201).json({ success: true });
    
    const { action } = req.body; // 'shortlist', 'reject', 'review', etc.
    const notifRef = db.collection('notifications').doc(req.params.id);
    const notifSnap = await notifRef.get();

    if (!notifSnap.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const notif = notifSnap.data();
    if (!isNotificationVisibleToUser(notif, req.user)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { applicationId, studentId, jobId } = notif;

    if (action === 'shortlist' && applicationId) {
      // Update application status to shortlisted
      await db.collection('applications').doc(applicationId).update({
        status: 'Shortlisted',
        shortlistedAt: new Date().toISOString(),
        shortlistedBy: req.user.uid,
      });

      // Notify student
      await db.collection('notifications').add({
        message: `Congratulations! You've been shortlisted for ${notif.jobId ? 'the position' : 'an opportunity'}!`,
        targetRole: 'student',
        targetUid: studentId,
        type: 'in-app',
        sentAt: new Date().toISOString(),
        sentBy: req.user.uid,
        read: [],
        applicationId,
      });

      logActivity('application_shortlisted', { studentId, applicationId, by: req.user.uid }, req.user.uid);
    } else if (action === 'reject' && applicationId) {
      // Update application status to rejected
      await db.collection('applications').doc(applicationId).update({
        status: 'Rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: req.user.uid,
      });

      // Notify student
      await db.collection('notifications').add({
        message: `Thank you for your interest. Unfortunately, we're moving forward with other candidates.`,
        targetRole: 'student',
        targetUid: studentId,
        type: 'in-app',
        sentAt: new Date().toISOString(),
        sentBy: req.user.uid,
        read: [],
        applicationId,
      });

      logActivity('application_rejected', { studentId, applicationId, by: req.user.uid }, req.user.uid);
    } else if (action === 'review' && studentId) {
      // Just mark as reviewed (no automatic action)
      logActivity('application_reviewed', { studentId, notificationId: req.params.id, by: req.user.uid }, req.user.uid);
    }

    // Mark notification as acted upon
    await notifRef.update({ actionedAt: new Date().toISOString(), actionedBy: req.user.uid, action });

    res.json({ success: true, action });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
