#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');
const { createJobDefaults, createRecruiterDefaults, createApplicationDefaults, syncStudentRollup } = require('../utils/marketplaceFactory');

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

async function backfillMarketplace() {
  console.log('Starting marketplace data backfill...');

  const [jobsSnap, recruitersSnap, appsSnap, studentsSnap] = await Promise.all([
    db.collection('jobs').get(),
    db.collection('recruiters').get(),
    db.collection('applications').get(),
    db.collection('students').get(),
  ]);

  const jobsById = new Map();
  const recruitersById = new Map();
  const studentById = new Map();

  const jobOps = jobsSnap.docs.map((docSnap) => {
    const normalized = createJobDefaults(docSnap.data() || {}, docSnap.id);
    jobsById.set(docSnap.id, normalized);
    return (batch) => batch.set(docSnap.ref, {
      ...normalized,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      backfilledAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  const recruiterOps = recruitersSnap.docs.map((docSnap) => {
    const normalized = createRecruiterDefaults(docSnap.data() || {}, docSnap.id);
    recruitersById.set(docSnap.id, normalized);
    return (batch) => batch.set(docSnap.ref, {
      ...normalized,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      backfilledAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  const applicationOps = appsSnap.docs.map((docSnap) => {
    const normalized = createApplicationDefaults(docSnap.data() || {}, docSnap.id);
    return (batch) => batch.set(docSnap.ref, {
      ...normalized,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      backfilledAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  const applications = appsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...createApplicationDefaults(docSnap.data() || {}, docSnap.id) }));

  const studentOps = studentsSnap.docs.map((docSnap) => {
    const current = docSnap.data() || {};
    const normalized = syncStudentRollup({ id: docSnap.id, ...current }, applications, jobsById);
    studentById.set(docSnap.id, normalized);
    return (batch) => batch.set(docSnap.ref, {
      ...normalized,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      backfilledAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  const recruiterStats = new Map();
  jobsById.forEach((job, id) => {
    const recruiterKey = job.recruiterId || job.postedBy || job.postedByUid || job.company;
    if (!recruiterStats.has(recruiterKey)) {
      recruiterStats.set(recruiterKey, { jobsPosted: 0, activeOpenings: 0, hires: 0 });
    }
    const stats = recruiterStats.get(recruiterKey);
    stats.jobsPosted += 1;
    stats.activeOpenings += Number(job.openings || 0);
    stats.hires += applications.filter((application) => application.jobId === id && application.status === 'Selected').length;
  });

  const recruiterRollupOps = recruitersSnap.docs.map((docSnap) => {
    const current = recruitersById.get(docSnap.id) || createRecruiterDefaults(docSnap.data() || {}, docSnap.id);
    const stats = recruiterStats.get(docSnap.id) || recruiterStats.get(current.uid) || recruiterStats.get(current.companyName) || { jobsPosted: current.jobsPosted || 0, activeOpenings: current.activeOpenings || 0, hires: current.hires || 0 };
    return (batch) => batch.set(docSnap.ref, {
      ...current,
      jobsPosted: stats.jobsPosted,
      activeOpenings: stats.activeOpenings,
      hires: Math.max(Number(current.hires || 0), stats.hires),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      backfilledAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  await commitInChunks([...jobOps, ...recruiterOps, ...applicationOps, ...studentOps, ...recruiterRollupOps]);

  console.log(`Backfilled jobs: ${jobsSnap.size}, recruiters: ${recruitersSnap.size}, applications: ${appsSnap.size}, students: ${studentsSnap.size}`);
}

backfillMarketplace()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Marketplace backfill failed:', error);
    process.exit(1);
  });