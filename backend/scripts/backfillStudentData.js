#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');
const { createSeededRecord } = require('../utils/studentFactory');

const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://placement-system-8f1b1.firebaseapp.com',
});

const db = admin.firestore();

async function commitInChunks(ops, chunkSize = 400) {
  for (let index = 0; index < ops.length; index += chunkSize) {
    const batch = db.batch();
    ops.slice(index, index + chunkSize).forEach((op) => op(batch));
    await batch.commit();
  }
}

async function backfillStudents() {
  console.log('Starting student data backfill...');

  const studentsSnap = await db.collection('students').get();
  const usersSnap = await db.collection('users').get();
  const userRefs = new Map(usersSnap.docs.map((doc) => [doc.id, doc.ref]));

  const studentOps = [];
  const userOps = [];

  studentsSnap.docs.forEach((docSnap, index) => {
    const normalized = createSeededRecord(docSnap.data() || {}, docSnap.id || `student-${index + 1}`);

    studentOps.push((batch) => batch.set(docSnap.ref, {
      ...normalized,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      backfilledAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }));

    const userRef = userRefs.get(docSnap.id);
    if (userRef) {
      userOps.push((batch) => batch.set(userRef, {
        name: normalized.name,
        email: normalized.email,
        branch: normalized.branch,
        department: normalized.branch,
        phone: normalized.phone,
        usn: normalized.usn,
        rollNo: normalized.rollNo,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true }));
    }
  });

  await commitInChunks(studentOps);
  if (userOps.length) await commitInChunks(userOps);

  console.log(`Backfilled ${studentsSnap.size} students.`);
}

backfillStudents()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });