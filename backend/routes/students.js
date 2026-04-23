// backend/routes/students.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/v1/students  — admin, faculty, recruiter can list students
router.get('/', verifyToken, requireRole('admin', 'faculty', 'recruiter'), async (req, res) => {
  try {
    if (!db) return res.json({ students: [], total: 0 });

    let query = db.collection('students');
    const { branch, status, limit: lim = 50, offset = 0 } = req.query;

    if (branch) query = query.where('branch', '==', branch);
    if (status) query = query.where('placementStatus', '==', status);

    const snap = await query.get();
    const students = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const paginated = students.slice(Number(offset), Number(offset) + Number(lim));

    res.json({ students: paginated, total: students.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/students/:id  — admin, faculty, recruiter can view a student
router.get('/:id', verifyToken, requireRole('admin', 'faculty', 'recruiter'), async (req, res) => {
  try {
    if (!db) return res.status(404).json({ error: 'Not found' });
    const snap = await db.collection('students').doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Student not found' });
    res.json({ id: snap.id, ...snap.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/students  — admin only
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!db) return res.json({ id: uuidv4(), ...req.body });
    const ref = await db.collection('students').add({
      ...req.body,
      createdAt: new Date().toISOString(),
      createdBy: req.user.uid,
    });
    res.status(201).json({ id: ref.id, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/v1/students/:id  — admin only
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (!db) return res.json({ id: req.params.id, ...req.body });
    await db.collection('students').doc(req.params.id).update({
      ...req.body,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.uid,
    });
    res.json({ id: req.params.id, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/students/:id  — admin only
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (db) await db.collection('students').doc(req.params.id).delete();
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/students/bulk-import  — admin only
router.post('/bulk-import', verifyToken, requireRole('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);

    const results = { success: 0, failed: 0, errors: [] };

    for (const row of rows) {
      try {
        const student = {
          name: row['Name'] || row['name'] || '',
          email: row['Email'] || row['email'] || '',
          branch: row['Branch'] || row['branch'] || '',
          cgpa: parseFloat(row['CGPA'] || row['cgpa'] || 0),
          rollNo: row['Roll No'] || row['rollNo'] || '',
          skills: (row['Skills'] || row['skills'] || '').split(',').map((s) => s.trim()).filter(Boolean),
          placementStatus: row['Status'] || 'unplaced',
          createdAt: new Date().toISOString(),
          importedBy: req.user.uid,
        };

        if (db) {
          await db.collection('students').add(student);
        }
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ row: row['Name'], error: err.message });
      }
    }

    res.json({ message: `Imported ${results.success} students`, ...results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
