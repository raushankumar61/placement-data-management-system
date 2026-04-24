const admin = require('firebase-admin');
const path = require('path');

const tryParseServiceAccount = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (_) {
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
};

if (!admin.apps.length) {
  try {
    const serviceAccount = tryParseServiceAccount() || require(path.join(__dirname, '../serviceAccountKey.json'));
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
    });

    console.log(`✅ Firebase Admin initialized successfully (${process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id})`);
  } catch (err) {
    console.warn('⚠️ Firebase Admin init warning. Auth-protected routes will fail until credentials are configured.');
    console.warn('⚠️ Details:', err.message);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

module.exports = { admin, db };