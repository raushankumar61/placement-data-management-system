const fs = require('fs');
const path = require('path');
const { db } = require('../config/firebase');

const COLLECTIONS = [
  'users',
  'students',
  'recruiters',
  'jobs',
  'applications',
  'interviews',
  'notifications',
  'recommendations',
  'complaints',
  'placementActivities',
  'verifications',
  'alumni',
  'mockInterviews',
];

const normalizeValue = (value) => {
  if (!value) return value;
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, normalizeValue(nested)]));
  }
  return value;
};

async function exportCollection(name) {
  const snap = await db.collection(name).get();
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...normalizeValue(docSnap.data() || {}) }));
}

async function main() {
  if (!db) {
    throw new Error('Firestore is not configured. Set the Firebase Admin environment variables first.');
  }

  const backup = {
    createdAt: new Date().toISOString(),
    collections: {},
  };

  for (const collectionName of COLLECTIONS) {
    try {
      backup.collections[collectionName] = await exportCollection(collectionName);
      console.log(`[backup] Exported ${collectionName}: ${backup.collections[collectionName].length} documents`);
    } catch (error) {
      backup.collections[collectionName] = { error: error.message, documents: [] };
      console.warn(`[backup] Skipped ${collectionName}: ${error.message}`);
    }
  }

  const outputDir = path.resolve(__dirname, '../backups');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `firestore-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2), 'utf8');
  console.log(`Backup written to ${outputPath}`);
}

main().catch((error) => {
  console.error('[backup] Failed:', error.message);
  process.exitCode = 1;
});