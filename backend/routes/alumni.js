const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');
const { createSeededRecord } = require('../utils/studentFactory');

// GET /api/v1/alumni
router.get('/', verifyToken, async (req, res) => {
  try {
    if (!db) return res.json({ alumni: [], total: 0 });

    const snap = await db.collection('students')
      .where('placementStatus', '==', 'placed')
      .get();

    let alumni = snap.docs.map((docSnap) => {
      const normalized = createSeededRecord(docSnap.data() || {}, docSnap.id);
      return {
        id: docSnap.id,
        name: normalized.name,
        email: normalized.email,
        branch: normalized.branch,
        companyPlaced: normalized.companyPlaced,
        latestApplicationCompany: normalized.latestApplicationCompany || '',
        bio: normalized.bio,
        linkedin: normalized.linkedin,
      };
    });

    const search = String(req.query.search || '').trim().toLowerCase();
    const company = String(req.query.company || '').trim().toLowerCase();

    if (search) {
      alumni = alumni.filter((person) => String(person.name || '').toLowerCase().includes(search));
    }

    if (company) {
      alumni = alumni.filter((person) =>
        String(person.companyPlaced || person.latestApplicationCompany || '').toLowerCase() === company
      );
    }

    res.json({ alumni, total: alumni.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
