// backend/routes/students.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { body } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createSeededRecord } = require('../utils/studentFactory');
const { logActivity } = require('../utils/activityLogger');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx/.xls) or CSV files are allowed'), false);
    }
  },
});

// GET /api/v1/students  — admin, faculty, recruiter can list students
router.get('/', verifyToken, requireRole('admin', 'faculty', 'recruiter'), async (req, res) => {
  try {
    if (!db) return res.json({ students: [], total: 0 });

    let query = db.collection('students');
    const { branch, status, limit: lim = 100, offset = 0 } = req.query;

    if (branch) query = query.where('branch', '==', branch);
    if (status) query = query.where('placementStatus', '==', status);

    const snap = await query.get();
    let students = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Recruiters: hide sensitive personal data fields
    if (req.user.role === 'recruiter') {
      students = students.map((s) => {
        const { aadhaar, dob, address, bankAccount, ...safe } = s;
        return safe;
      });
    }

    const paginated = students.slice(Number(offset), Number(offset) + Number(lim));
    res.json({ students: paginated, total: students.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/students/:id  — admin, faculty, recruiter, or the student themselves
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const allowedRoles = ['admin', 'faculty', 'recruiter'];
    const isSelf = req.user.uid === req.params.id;
    if (!isSelf && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!db) return res.status(404).json({ error: 'Not found' });
    const snap = await db.collection('students').doc(req.params.id).get();
    if (!snap.exists) return res.status(404).json({ error: 'Student not found' });
    res.json({ id: snap.id, ...snap.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/students  — admin only
router.post(
  '/',
  verifyToken,
  requireRole('admin'),
  [
    body('name').trim().notEmpty().withMessage('Student name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('cgpa').optional().isFloat({ min: 0, max: 10 }).withMessage('CGPA must be between 0 and 10'),
  ],
  validate,
  async (req, res) => {
    try {
      const payload = createSeededRecord(req.body, req.body.email || req.body.rollNo || uuidv4());
      if (!db) return res.json({ id: uuidv4(), ...payload });
      const ref = await db.collection('students').add({
        ...payload,
        createdAt: new Date().toISOString(),
        createdBy: req.user.uid,
      });
      logActivity('student_created', { studentId: ref.id, name: payload.name }, req.user.uid);
      res.status(201).json({ id: ref.id, ...payload });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// PUT /api/v1/students/:id  — admin, faculty, or the student themselves
router.put(
  '/:id',
  verifyToken,
  [
    body('cgpa').optional().isFloat({ min: 0, max: 10 }).withMessage('CGPA must be between 0 and 10'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  ],
  validate,
  async (req, res) => {
    try {
      const isSelf = req.user.uid === req.params.id;
      const isAdminOrFaculty = ['admin', 'faculty'].includes(req.user.role);
      if (!isSelf && !isAdminOrFaculty) {
        return res.status(403).json({ error: 'You can only update your own profile' });
      }

      // Students cannot self-update placementStatus (read-only from backend perspective)
      const body = { ...req.body };
      if (isSelf && !isAdminOrFaculty) {
        delete body.placementStatus;
        delete body.role;
      }

      const existingSnap = db ? await db.collection('students').doc(req.params.id).get() : null;
      const existing = existingSnap?.exists ? existingSnap.data() : {};
      const payload = createSeededRecord({ ...existing, ...body }, req.params.id);

      if (!db) return res.json({ id: req.params.id, ...payload });
      await db.collection('students').doc(req.params.id).update({
        ...payload,
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.uid,
      });
      res.json({ id: req.params.id, ...payload });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// DELETE /api/v1/students/:id  — admin only
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    if (db) await db.collection('students').doc(req.params.id).delete();
    logActivity('student_deleted', { studentId: req.params.id }, req.user.uid);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/students/bulk-import  — admin only
router.post('/bulk-import', verifyToken, requireRole('admin'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);

    if (!rows.length) return res.status(400).json({ error: 'Spreadsheet is empty' });

    const results = { success: 0, failed: 0, errors: [] };

    for (const row of rows) {
      try {
        const cgpaRaw = parseFloat(row['CGPA'] || row['cgpa'] || 0);
        const cgpa = isNaN(cgpaRaw) ? 0 : Math.min(10, Math.max(0, cgpaRaw));

        const student = createSeededRecord({
          name: String(row['Name'] || row['name'] || '').trim(),
          email: String(row['Email'] || row['email'] || '').trim(),
          branch: String(row['Branch'] || row['branch'] || '').trim(),
          cgpa,
          rollNo: String(row['Roll No'] || row['rollNo'] || row['RollNo'] || '').trim(),
          phone: String(row['Phone'] || row['phone'] || '').trim(),
          skills: String(row['Skills'] || row['skills'] || '').split(',').map((s) => s.trim()).filter(Boolean),
          placementStatus: String(row['Status'] || row['status'] || 'unplaced').toLowerCase(),
          createdAt: new Date().toISOString(),
          importedBy: req.user.uid,
        }, row['Email'] || row['Roll No'] || row['Name'] || uuidv4());

        if (!student.name && !student.email) {
          results.failed++;
          results.errors.push({ row: JSON.stringify(row).slice(0, 80), error: 'Missing name and email' });
          continue;
        }

        if (db) {
          await db.collection('students').add(student);
        }
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push({ row: row['Name'] || row['name'] || '?', error: err.message });
      }
    }

    logActivity('student_imported', { count: results.success, failed: results.failed }, req.user.uid);
    res.json({ message: `Imported ${results.success} students, ${results.failed} failed`, ...results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
