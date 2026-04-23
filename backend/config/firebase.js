const admin = require('firebase-admin');
const path = require('path');

if (!admin.apps.length) {
  try {
    const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    console.log('✅ Firebase Admin initialized successfully');
  } catch (err) {
    console.warn('⚠️ Firebase Admin init warning:', err.message);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

module.exports = { admin, db };