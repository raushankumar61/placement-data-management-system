const admin = require('firebase-admin');
const path = require('path');

const targetProjectId = process.env.FIREBASE_PROJECT_ID || '';

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

const tryReadServiceAccountFile = () => {
  try {
    return require(path.join(__dirname, '../serviceAccountKey.json'));
  } catch {
    return null;
  }
};

const chooseServiceAccount = () => {
  const envAccount = tryParseServiceAccount();
  const fileAccount = tryReadServiceAccountFile();

  if (targetProjectId) {
    if (envAccount?.project_id === targetProjectId) return envAccount;
    if (fileAccount?.project_id === targetProjectId) return fileAccount;
  }

  return envAccount || fileAccount;
};

if (!admin.apps.length) {
  try {
    const serviceAccount = chooseServiceAccount();
    if (!serviceAccount) {
      throw new Error('No Firebase service account found in env or serviceAccountKey.json');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: targetProjectId || serviceAccount.project_id,
    });

    console.log(`✅ Firebase Admin initialized successfully (${targetProjectId || serviceAccount.project_id})`);
    if (targetProjectId && serviceAccount.project_id && serviceAccount.project_id !== targetProjectId) {
      console.warn(`⚠️ Firebase project mismatch: service account is ${serviceAccount.project_id}, expected ${targetProjectId}`);
    }
  } catch (err) {
    console.warn('⚠️ Firebase Admin init warning. Auth-protected routes will fail until credentials are configured.');
    console.warn('⚠️ Details:', err.message);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

module.exports = { admin, db };