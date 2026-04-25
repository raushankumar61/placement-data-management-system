#!/usr/bin/env node
/**
 * Backfill existing job records so recruiter ownership fields are consistent.
 * - postedBy is filled from recruiterId when missing
 * - postedByName is filled from recruiterName/company when missing
 *
 * Run: node backend/scripts/backfillJobOwnershipFields.js
 */

const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://placement-system-8f1b1.firebaseapp.com',
});

const db = admin.firestore();

const normalizeText = (value) => String(value || '').trim();

async function backfillJobOwnershipFields() {
  console.log('Starting job ownership backfill...');

  const snap = await db.collection('jobs').get();
  if (snap.empty) {
    console.log('No jobs found.');
    return;
  }

  const batch = db.batch();
  let updated = 0;

  snap.docs.forEach((docSnap) => {
    const job = docSnap.data() || {};
    const updates = {};

    if (!normalizeText(job.postedBy) && normalizeText(job.recruiterId)) {
      updates.postedBy = job.recruiterId;
    }

    if (!normalizeText(job.postedByName)) {
      updates.postedByName = normalizeText(job.recruiterName) || normalizeText(job.company) || 'Recruiter';
    }

    if (Object.keys(updates).length) {
      updates.updatedAt = new Date().toISOString();
      batch.update(docSnap.ref, updates);
      updated += 1;
      console.log(`Updating ${docSnap.id}:`, updates);
    }
  });

  if (!updated) {
    console.log('All job ownership fields are already consistent.');
    return;
  }

  await batch.commit();
  console.log(`Backfilled ${updated} job documents.`);
}

backfillJobOwnershipFields()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });
