#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://placement-system-8f1b1.firebaseapp.com',
});

const db = admin.firestore();

const toDate = (value) => {
  if (!value) return null;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value?.toDate) return value.toDate();
  if (value instanceof Date) return value;
  return null;
};

const futureDeadline = (offsetDays) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

async function refreshJobDeadlines() {
  console.log('Refreshing expired active job deadlines...');

  const jobsSnap = await db.collection('jobs').get();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const candidates = jobsSnap.docs.filter((docSnap) => {
    const data = docSnap.data() || {};
    const status = String(data.status || 'active').toLowerCase();
    const deadline = toDate(data.deadline);
    return status !== 'closed' && deadline && deadline < today;
  });

  if (!candidates.length) {
    console.log('No expired active jobs found.');
    return;
  }

  for (let index = 0; index < candidates.length; index += 400) {
    const batch = db.batch();
    candidates.slice(index, index + 400).forEach((docSnap, offset) => {
      const nextDeadline = futureDeadline(10 + ((index + offset) % 30));
      batch.set(docSnap.ref, {
        deadline: nextDeadline,
        status: 'active',
        refreshedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });
    await batch.commit();
  }

  console.log(`Updated ${candidates.length} expired active jobs.`);
}

refreshJobDeadlines()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Job deadline refresh failed:', error);
    process.exit(1);
  });
