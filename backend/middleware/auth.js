// backend/middleware/auth.js
const { admin, db } = require('../config/firebase');

/**
 * Verifies the Firebase ID token from the Authorization header.
 * If the decoded token doesn't include a role in its custom claims,
 * fetches the role from Firestore and attaches it to req.user.role.
 * Also syncs the role back to custom claims in the background so
 * subsequent requests skip the Firestore round-trip.
 */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;

    // Fast path: role already in custom claims
    if (decoded.role) {
      return next();
    }

    // Slow path: fetch role from Firestore (first login after registration)
    if (db) {
      try {
        const snap = await db.collection('users').doc(decoded.uid).get();
        if (snap.exists) {
          const role = snap.data().role;
          req.user.role = role;

          // Sync custom claims in the background so next token refresh
          // includes the role and avoids this Firestore round-trip.
          admin.auth()
            .setCustomUserClaims(decoded.uid, { role })
            .catch((e) => console.warn('Failed to sync custom claims:', e.message));
        }
      } catch (profileErr) {
        console.warn('Could not fetch user role from Firestore:', profileErr.message);
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware factory that restricts access to users with specific roles.
 * Must be used after verifyToken.
 *
 * Usage: requireRole('admin', 'faculty')
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user?.role || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: insufficient permissions' });
  }
  next();
};

module.exports = { verifyToken, requireRole };
