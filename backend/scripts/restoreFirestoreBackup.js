const fs = require('fs');
const path = require('path');
const { db } = require('../config/firebase');

const resolveBackupPath = () => {
  const argPath = process.argv[2];
  if (argPath) return path.resolve(process.cwd(), argPath);
  const backupDir = path.resolve(__dirname, '../backups');
  const files = fs.existsSync(backupDir)
    ? fs.readdirSync(backupDir).filter((file) => file.endsWith('.json')).sort()
    : [];
  return files.length ? path.join(backupDir, files[files.length - 1]) : null;
};

async function main() {
  if (!db) {
    throw new Error('Firestore is not configured. Set the Firebase Admin environment variables first.');
  }

  const backupPath = resolveBackupPath();
  if (!backupPath || !fs.existsSync(backupPath)) {
    throw new Error('No backup file found. Pass a backup JSON path or run the export script first.');
  }

  const raw = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const collections = raw.collections || {};

  for (const [collectionName, records] of Object.entries(collections)) {
    if (!Array.isArray(records)) {
      console.warn(`[restore] Skipping ${collectionName}; expected an array of records.`);
      continue;
    }

    for (const record of records) {
      const { id, ...data } = record || {};
      if (!id) continue;
      await db.collection(collectionName).doc(id).set(data, { merge: true });
    }

    console.log(`[restore] Restored ${collectionName}: ${records.length} documents`);
  }

  console.log(`Restore completed from ${backupPath}`);
}

main().catch((error) => {
  console.error('[restore] Failed:', error.message);
  process.exitCode = 1;
});