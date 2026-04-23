const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { db } = require('../config/firebase');

function normalizeSkills(raw) {
  if (Array.isArray(raw)) return raw.map((s) => String(s).trim()).filter(Boolean);
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function importStudents(fileArg) {
  if (!db) {
    throw new Error('Firestore is not initialized. Check backend/serviceAccountKey.json');
  }

  const filePath = path.resolve(process.cwd(), fileArg || 'seed/dsce_blr_students_50.csv');
  if (!fs.existsSync(filePath)) {
    throw new Error(`Input file not found: ${filePath}`);
  }

  const wb = XLSX.readFile(filePath, { raw: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);

  if (!rows.length) {
    console.log('No rows found to import.');
    return;
  }

  let imported = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const rollNo = String(row['Roll No'] || row['rollNo'] || '').trim();
      if (!rollNo) {
        failed += 1;
        continue;
      }

      const student = {
        name: String(row['Name'] || row['name'] || '').trim(),
        email: String(row['Email'] || row['email'] || '').trim(),
        branch: String(row['Branch'] || row['branch'] || '').trim(),
        cgpa: Number.parseFloat(row['CGPA'] || row['cgpa'] || 0),
        rollNo,
        skills: normalizeSkills(row['Skills'] || row['skills']),
        placementStatus: String(row['Status'] || row['status'] || 'unplaced').trim().toLowerCase(),
        phone: String(row['Phone'] || row['phone'] || '').trim(),
        updatedAt: new Date().toISOString(),
      };

      await db.collection('students').doc(rollNo).set(student, { merge: true });
      imported += 1;
    } catch {
      failed += 1;
    }
  }

  const total = imported + failed;
  console.log(`Import complete. Imported/Updated: ${imported}, Failed: ${failed}, Total: ${total}`);

  const snap = await db.collection('students').get();
  console.log(`Current students in Firestore: ${snap.size}`);
}

importStudents(process.argv[2])
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Import failed:', err.message);
    process.exit(1);
  });
