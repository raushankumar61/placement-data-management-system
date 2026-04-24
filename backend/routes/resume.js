// backend/routes/resume.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifyToken } = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

/**
 * POST /api/v1/resume/parse
 * Extracts skills from an uploaded PDF resume.
 * Body: multipart/form-data with field "resume" (PDF)
 */
router.post('/parse', verifyToken, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded. Use field name "resume".' });
    }

    // Lazy-load pdf-parse to avoid startup errors
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(req.file.buffer);
    const text = data.text.toLowerCase();

    // Comprehensive skills dictionary
    const SKILLS_DICT = [
      // Programming Languages
      'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'c', 'go', 'golang',
      'rust', 'kotlin', 'swift', 'php', 'ruby', 'scala', 'r', 'matlab', 'dart',
      // Web Frontend
      'react', 'angular', 'vue', 'nextjs', 'next.js', 'nuxt', 'svelte', 'html', 'css',
      'tailwindcss', 'bootstrap', 'jquery', 'redux', 'webpack', 'vite',
      // Backend
      'nodejs', 'node.js', 'express', 'django', 'flask', 'fastapi', 'spring', 'laravel',
      'rails', 'nestjs', 'graphql', 'rest api', 'restful',
      // Databases
      'mysql', 'postgresql', 'mongodb', 'firebase', 'sqlite', 'redis', 'cassandra',
      'dynamodb', 'elasticsearch', 'oracle',
      // Cloud & DevOps
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'ci/cd',
      'github actions', 'linux', 'nginx', 'apache',
      // Data Science / ML
      'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'keras', 'scikit-learn',
      'pandas', 'numpy', 'matplotlib', 'seaborn', 'nlp', 'computer vision', 'data science',
      'data analysis', 'tableau', 'power bi',
      // Mobile
      'android', 'ios', 'flutter', 'react native', 'xamarin',
      // Other
      'git', 'github', 'agile', 'scrum', 'jira', 'figma', 'photoshop', 'blockchain',
      'solidity', 'cybersecurity', 'networking', 'microservices', 'system design',
    ];

    const foundSkills = SKILLS_DICT.filter((skill) => {
      const pattern = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${pattern}\\b`, 'i').test(text);
    });

    // Deduplicate and clean up
    const uniqueSkills = [...new Set(foundSkills)].map((s) => {
      // Capitalise properly
      const capitalMap = {
        'nodejs': 'Node.js', 'node.js': 'Node.js', 'nextjs': 'Next.js', 'next.js': 'Next.js',
        'react': 'React', 'angular': 'Angular', 'vue': 'Vue', 'python': 'Python',
        'java': 'Java', 'javascript': 'JavaScript', 'typescript': 'TypeScript',
        'mongodb': 'MongoDB', 'mysql': 'MySQL', 'postgresql': 'PostgreSQL',
        'aws': 'AWS', 'gcp': 'GCP', 'azure': 'Azure', 'docker': 'Docker',
        'kubernetes': 'Kubernetes', 'git': 'Git', 'github': 'GitHub',
        'machine learning': 'Machine Learning', 'deep learning': 'Deep Learning',
        'data science': 'Data Science', 'nlp': 'NLP', 'html': 'HTML', 'css': 'CSS',
        'c++': 'C++', 'c#': 'C#', 'c': 'C', 'go': 'Go', 'rust': 'Rust',
        'flutter': 'Flutter', 'kotlin': 'Kotlin', 'swift': 'Swift',
      };
      return capitalMap[s] || s.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    });

    // Extract a text preview (first 300 chars of meaningful text)
    const preview = data.text.replace(/\s+/g, ' ').trim().slice(0, 300);

    res.json({
      skills: uniqueSkills,
      preview,
      totalPages: data.numpages,
    });
  } catch (err) {
    console.error('[resume/parse]', err.message);
    res.status(500).json({ error: 'Failed to parse resume: ' + err.message });
  }
});

module.exports = router;
