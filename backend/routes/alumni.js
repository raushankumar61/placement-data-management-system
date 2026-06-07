const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const { createSeededRecord } = require('../utils/studentFactory');

// GET /api/v1/alumni
router.get('/', verifyToken, requireRole('admin', 'faculty', 'student'), async (req, res) => {
  try {
    if (!db) return res.json({ alumni: [], total: 0 });

    const snap = await db.collection('alumni').get();

    let alumni = snap.docs.map((docSnap) => {
      const data = docSnap.data() || {};
      return {
        id: docSnap.id,
        name: data.name || '',
        email: data.email || '',
        branch: data.branch || '',
        companyPlaced: data.companyPlaced || '',
        latestApplicationCompany: data.companyPlaced || '',
        bio: data.bio || '',
        linkedin: data.linkedin || '',
        graduationYear: data.graduationYear || null
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
