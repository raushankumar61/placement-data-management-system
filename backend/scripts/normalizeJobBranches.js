#!/usr/bin/env node
/**
 * Backfill script: Normalize all existing job branches in Firestore
 * to use the standardized format for permanent branch eligibility fix
 * Run: node backend/scripts/normalizeJobBranches.js
 */

const admin = require('firebase-admin');
const path = require('path');
const { normalizeJobBranches } = require('../utils/branchEligibility');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://placement-system-8f1b1.firebaseapp.com',
});

const db = admin.firestore();

async function normalizeAllJobBranches() {
  console.log('🔄 Starting job branch normalization...\n');

  try {
    const jobsSnap = await db.collection('jobs').get();

    if (jobsSnap.empty) {
      console.log('ℹ️  No jobs found in Firestore.');
      process.exit(0);
    }

    console.log(`📊 Found ${jobsSnap.size} jobs. Normalizing branches...\n`);

    const batch = db.batch();
    let normalizedCount = 0;
    let unchangedCount = 0;

    jobsSnap.docs.forEach((docSnap) => {
      const job = docSnap.data();
      const originalBranches = JSON.stringify(job.branches || []);

      const normalized = normalizeJobBranches(job.branches);
      const normalizedString = JSON.stringify(normalized);

      if (originalBranches !== normalizedString) {
        console.log(`✏️  ${job.title || 'Untitled Job'} (${docSnap.id})`);
        console.log(`   Before: ${originalBranches}`);
        console.log(`   After:  ${normalizedString}\n`);

        batch.update(docSnap.ref, {
          branches: normalized,
          normalizedAt: new Date().toISOString(),
        });

        normalizedCount++;
      } else {
        unchangedCount++;
      }
    });

    if (normalizedCount === 0) {
      console.log('✅ All jobs already have normalized branches!');
      process.exit(0);
    }

    console.log(`💾 Committing ${normalizedCount} changes to Firestore...\n`);
    await batch.commit();

    console.log(`✅ Normalization complete!`);
    console.log(`   Updated: ${normalizedCount} jobs`);
    console.log(`   Unchanged: ${unchangedCount} jobs`);
    console.log(`   Total: ${jobsSnap.size} jobs\n`);

    console.log('🎉 All job branches are now standardized for proper eligibility matching!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during normalization:', error);
    process.exit(1);
  }
}

normalizeAllJobBranches();
