// backend/routes/applications.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createApplicationDefaults, syncStudentRollup } = require('../utils/marketplaceFactory');
const { logActivity } = require('../utils/activityLogger');
const { sendMail, buildStatusUpdateHtml } = require('../utils/emailService');

const recomputeStudentRollup = async (studentId, actorUid) => {
  if (!db || !studentId) return;

  const studentRef = db.collection('students').doc(studentId);
  const studentSnap = await studentRef.get();
  if (!studentSnap.exists) return;

  const [appsSnap, jobsSnap] = await Promise.all([
    db.collection('applications').where('studentId', '==', studentId).get(),
    db.collection('jobs').get(),
  ]);

  const applications = appsSnap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...createApplicationDefaults(docSnap.data() || {}, docSnap.id),
  }));
  const jobsById = new Map(jobsSnap.docs.map((docSnap) => [docSnap.id, docSnap.data() || {}]));
  const rollup = syncStudentRollup({ id: studentSnap.id, ...studentSnap.data() }, applications, jobsById);

  await studentRef.set({
    ...rollup,
    updatedAt: new Date().toISOString(),
    ...(actorUid ? { updatedBy: actorUid } : {}),
  }, { merge: true });
};

// GET /api/v1/applications  — all authenticated users (scoped by role)
router.get('/', verifyToken, async (req, res) => {
  try {
    if (!db) return res.json({ applications: [], total: 0 });

    let query = db.collection('applications');
    const { studentId, jobId, status } = req.query;

    if (req.user.role === 'student') {
      query = query.where('studentId', '==', req.user.uid);
    } else {
      if (studentId) query = query.where('studentId', '==', studentId);
      if (jobId) query = query.where('jobId', '==', jobId);
    }
    if (status) query = query.where('status', '==', status);

    const snap = await query.get();
    const applications = snap.docs.map((d) => ({ id: d.id, ...createApplicationDefaults(d.data() || {}, d.id) }));
    res.json({ applications, total: applications.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/applications  — students only can apply
router.post(
  '/',
  verifyToken,
  requireRole('student'),
  [
    body('jobId').notEmpty().withMessage('jobId is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { jobId } = req.body;
      const studentId = req.user.uid;

      const jobSnap = db ? await db.collection('jobs').doc(jobId).get() : null;
      const job = jobSnap?.exists ? jobSnap.data() : {};

      const payload = createApplicationDefaults({
        studentId,
        studentEmail: req.user.email || '',
        studentName: req.user.name || req.user.displayName || '',
        jobId,
        company: job.company || req.body.company || '',
        role: job.title || req.body.role || '',
        branch: req.body.branch || '',
        recruiterId: job.recruiterId || '',
        recruiterName: job.recruiterName || '',
        expectedCTC: req.body.expectedCTC || job.ctc || '',
        source: req.body.source || 'Campus Drive',
        round: req.body.round || 'Screening',
        notes: req.body.notes || '',
        status: 'Applied',
        appliedAt: new Date().toISOString(),
      }, `${studentId}-${jobId}`);

      if (!db) return res.status(201).json({ id: uuidv4(), ...payload });

      const existing = await db.collection('applications')
        .where('studentId', '==', studentId)
        .where('jobId', '==', jobId)
        .get();

      if (!existing.empty) {
        return res.status(409).json({ error: 'Already applied to this job' });
      }

      const ref = await db.collection('applications').add(payload);

      // Increment applicant count on job
      const jobRef = db.collection('jobs').doc(jobId);
      const createdJobSnap = await jobRef.get();
      if (createdJobSnap.exists) {
        await jobRef.update({ applicants: (createdJobSnap.data().applicants || 0) + 1 });
      }

      await recomputeStudentRollup(studentId, req.user.uid);

      // Write notification to student (self) so notification page shows it
      await db.collection('notifications').add({
        message: `You applied to ${payload.role} at ${payload.company}. Status: Applied.`,
        targetRole: 'student',
        targetUid: studentId,
        type: 'in-app',
        sentAt: new Date().toISOString(),
        sentBy: 'system',
        read: [],
        applicationId: ref.id,
      });

      logActivity('application_submitted', { studentId, jobId, company: payload.company }, studentId);

      res.status(201).json({ id: ref.id, ...payload });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/v1/applications/:id/status  — admin or recruiter can update status
router.put(
  '/:id/status',
  verifyToken,
  requireRole('admin', 'recruiter'),
  [
    body('status')
      .notEmpty().withMessage('status is required')
      .isIn(['Applied', 'Shortlisted', 'Selected', 'Rejected', 'In Process'])
      .withMessage('Invalid status. Must be one of: Applied, Shortlisted, Selected, Rejected, In Process'),
  ],
  validate,
  async (req, res) => {
    try {
      const { status } = req.body;

      const snap = db ? await db.collection('applications').doc(req.params.id).get() : null;
      const current = snap?.exists ? snap.data() : {};
      const payload = createApplicationDefaults({
        ...current,
        status,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.uid,
      }, req.params.id);

      if (db) {
        await db.collection('applications').doc(req.params.id).update(payload);

        if (current.studentId) {
          await recomputeStudentRollup(current.studentId, req.user.uid);

          // Push in-app notification to the student
          await db.collection('notifications').add({
            message: `Your application for ${current.role || 'a role'} at ${current.company || 'a company'} is now: ${status}`,
            targetRole: 'student',
            targetUid: current.studentId,
            type: 'in-app',
            sentAt: new Date().toISOString(),
            sentBy: req.user.uid,
            read: [],
            applicationId: req.params.id,
          });

          // Send email notification
          if (current.studentEmail) {
            await sendMail({
              to: current.studentEmail,
              subject: `Application Update: ${current.role} at ${current.company} — ${status}`,
              html: buildStatusUpdateHtml({
                studentName: current.studentName,
                company: current.company,
                role: current.role,
                status,
              }),
            });
          }
        }
      }

      logActivity('status_updated', {
        applicationId: req.params.id,
        oldStatus: current.status,
        newStatus: status,
        studentId: current.studentId,
      }, req.user.uid);

      res.json({ id: req.params.id, ...payload });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
