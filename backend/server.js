// backend/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: 'Too many requests' });
app.use('/api/', limiter);

const normalizeOrigin = (value) => String(value || '').trim().replace(/\/+$/, '');

const allowedOrigins = String(
  process.env.FRONTEND_URLS || process.env.FRONTEND_URL || 'http://localhost:3000'
)
  .split(',')
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser clients and same-origin calls without Origin header.
    if (!origin) return callback(null, true);
    const normalized = normalizeOrigin(origin);
    if (allowedOrigins.includes(normalized)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/students', require('./routes/students'));
app.use('/api/v1/jobs', require('./routes/jobs'));
app.use('/api/v1/applications', require('./routes/applications'));
app.use('/api/v1/interviews', require('./routes/interviews'));
app.use('/api/v1/recruiters', require('./routes/recruiters'));
app.use('/api/v1/reports', require('./routes/reports'));
app.use('/api/v1/notifications', require('./routes/notifications'));
app.use('/api/v1/recommendations', require('./routes/recommendations'));
app.use('/api/v1/complaints', require('./routes/complaints'));
app.use('/api/v1/resume', require('./routes/resume'));
app.use('/api/v1/analytics', require('./routes/analytics'));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2.0.0' });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err);
  // Multer file filter error
  if (err.message && err.message.includes('Only PDF')) {
    return res.status(400).json({ error: err.message });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 PlaceCloud API v2 running on port ${PORT}`);

    // ── Interview Reminder Cron (daily at 8 AM) ────────────────────────────────
    try {
      const cron = require('node-cron');
      const { db } = require('./config/firebase');
      const { sendMail, buildInterviewReminderHtml } = require('./utils/emailService');

      cron.schedule('0 8 * * *', async () => {
        console.log('[cron] Running interview reminder job...');
        if (!db) return;

        try {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().slice(0, 10);

          const snap = await db.collection('interviews')
            .where('date', '==', tomorrowStr)
            .get();

          let sent = 0;
          for (const doc of snap.docs) {
            const data = doc.data();
            if (!data.studentEmail || data.status === 'completed') continue;

            const emailSent = await sendMail({
              to: data.studentEmail,
              subject: `🗓️ Interview Tomorrow: ${data.company} — PlaceCloud`,
              html: buildInterviewReminderHtml({
                studentName: data.studentName,
                company: data.company,
                role: data.role,
                round: data.round,
                date: tomorrowStr,
                time: data.time,
                mode: data.mode,
                link: data.link,
              }),
            });

            // Also push in-app notification
            await db.collection('notifications').add({
              message: `Reminder: Your ${data.round || 'interview'} at ${data.company} is tomorrow at ${data.time || 'the scheduled time'}.`,
              targetRole: 'student',
              targetUid: data.studentId,
              type: 'in-app',
              sentAt: new Date().toISOString(),
              sentBy: 'system',
              read: [],
              interviewId: doc.id,
            });

            if (emailSent) sent++;
          }

          console.log(`[cron] Sent ${sent} interview reminder emails for ${tomorrowStr}`);
        } catch (err) {
          console.error('[cron] Interview reminder error:', err.message);
        }
      });

      console.log('⏰ Interview reminder cron scheduled (daily 8 AM)');
    } catch (err) {
      console.warn('⚠️  Could not start cron scheduler:', err.message);
    }
  });
}

module.exports = app;

