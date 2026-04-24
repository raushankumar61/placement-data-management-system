// backend/utils/activityLogger.js
/**
 * Writes an audit event to the systemActivity Firestore collection.
 * Call this from any route that mutates data.
 * Errors are swallowed so a logging failure never breaks the main request.
 */
const { db } = require('../config/firebase');

/**
 * @param {'user_registered'|'job_posted'|'application_submitted'|'status_updated'|
 *         'recruiter_verified'|'role_assigned'|'student_imported'|'interview_scheduled'|
 *         'complaint_filed'|'complaint_resolved'|'notification_sent'} type
 * @param {object} payload  - arbitrary data to store with the event
 * @param {string} actorUid - uid of the user who triggered the action
 */
const logActivity = async (type, payload = {}, actorUid = null) => {
  if (!db) return;
  try {
    await db.collection('systemActivity').add({
      type,
      payload,
      actorUid,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[activityLogger] Failed to write audit event:', err.message);
  }
};

module.exports = { logActivity };
