#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');
const { createJobDefaults, createRecruiterDefaults, createApplicationDefaults, syncStudentRollup } = require('../utils/marketplaceFactory');

const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://placement-system-8f1b1.firebaseapp.com',
});

const db = admin.firestore();

const JOB_TITLES = ['Software Development Engineer', 'Data Scientist', 'Frontend Developer', 'Backend Developer', 'QA Engineer', 'DevOps Engineer', 'Product Analyst', 'Business Analyst', 'Mobile App Developer', 'ML Engineer'];
const COMPANIES = ['Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Uber', 'Salesforce', 'Oracle', 'IBM', 'TCS', 'Infosys', 'Wipro', 'Accenture', 'Deloitte', 'Flipkart', 'Swiggy', 'Razorpay'];
const BRANCHES = ['Computer Science', 'Information Technology', 'Electronics & Communication', 'Mechanical', 'Civil', 'Electrical', 'Artificial Intelligence & Machine Learning', 'Data Science'];
const STATUSES = ['Applied', 'Shortlisted', 'Selected', 'Rejected'];
const SOURCES = ['Campus Drive', 'Off Campus', 'Referral', 'Portal', 'LinkedIn'];

const hashString = (input) => {
  const text = String(input || 'marketplace');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const createRng = (seed) => {
  let state = hashString(seed) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

const pick = (rng, values) => values[Math.floor(rng() * values.length)];

const chunkedCommit = async (operations, chunkSize = 400) => {
  for (let index = 0; index < operations.length; index += chunkSize) {
    const batch = db.batch();
    operations.slice(index, index + chunkSize).forEach((op) => op(batch));
    await batch.commit();
  }
};

async function seedMarketplaceData() {
  console.log('Seeding marketplace demo data...');

  const studentsSnap = await db.collection('students').get();
  const students = studentsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

  if (!students.length) {
    throw new Error('No students found. Seed student data first.');
  }

  const recruiterOperations = [];
  const recruiterRecords = [];
  for (let index = 1; index <= 18; index += 1) {
    const company = COMPANIES[(index - 1) % COMPANIES.length];
    const recruiterId = `demo_recruiter_${String(index).padStart(3, '0')}`;
    const recruiter = createRecruiterDefaults({
      companyName: company,
      contactEmail: `talent@${company.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`,
      verified: index % 3 !== 0,
      location: pick(createRng(`recruiter-${index}`), ['Bangalore', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi NCR', 'Chennai']),
      industry: pick(createRng(`recruiter-industry-${index}`), ['Technology', 'Finance', 'Consulting', 'E-commerce', 'EdTech', 'SaaS']),
    }, recruiterId);
    recruiterRecords.push({ id: recruiterId, ...recruiter });
    recruiterOperations.push((batch) => batch.set(db.collection('recruiters').doc(recruiterId), recruiter, { merge: true }));
  }

  const jobOperations = [];
  const jobRecords = [];
  for (let index = 1; index <= 36; index += 1) {
    const rng = createRng(`job-${index}`);
    const recruiter = recruiterRecords[(index - 1) % recruiterRecords.length];
    const title = JOB_TITLES[(index - 1) % JOB_TITLES.length];
    const company = recruiter.companyName;
    const jobId = `demo_job_${String(index).padStart(3, '0')}`;
    const job = createJobDefaults({
      title,
      company,
      recruiterId: recruiter.id,
      recruiterName: recruiter.companyName,
      recruiterEmail: recruiter.contactEmail,
      industry: recruiter.industry,
      location: pick(rng, ['Bangalore', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi NCR', 'Chennai']),
      ctc: `${pick(rng, [6, 8, 10, 12, 15, 18, 20, 24])} LPA`,
      type: pick(rng, ['Full-time', 'Internship', 'PPO', 'Contract']),
      minCGPA: String((6.5 + rng() * 1.8).toFixed(1)),
      branches: index % 6 === 0 ? ['All'] : [BRANCHES[index % BRANCHES.length], BRANCHES[(index + 1) % BRANCHES.length]],
      skills: ['JavaScript', 'Python', 'SQL', 'React', 'Node.js', 'DSA'].slice(0, 4 + (index % 3)),
      perks: ['Flexible hours', 'Learning budget', 'Mentorship program', 'Remote allowance'].slice(0, 2 + (index % 2)),
      description: `${company} is hiring for ${title} with multiple role opportunities for campus candidates.`,
      interviewRounds: 2 + (index % 3),
      openings: 6 + (index % 12),
      applicants: 20 + (index * 4),
      workMode: pick(rng, ['Onsite', 'Hybrid', 'Remote']),
      experienceLevel: pick(rng, ['Fresher', '0-2 years', '2-4 years']),
      postedOnCampus: index % 2 === 0,
      deadline: `2025-${String((index % 9) + 1).padStart(2, '0')}-${String((index % 26) + 1).padStart(2, '0')}`,
      status: index % 7 === 0 ? 'closed' : 'active',
      applyLink: `https://careers.${company.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com/apply/${jobId}`,
    }, jobId);
    jobRecords.push({ id: jobId, ...job });
    jobOperations.push((batch) => batch.set(db.collection('jobs').doc(jobId), job, { merge: true }));
  }

  const applicationOperations = [];
  const applicationRecords = [];
  for (let index = 1; index <= 240; index += 1) {
    const rng = createRng(`app-${index}`);
    const student = students[(index - 1) % students.length];
    const job = jobRecords[(index - 1) % jobRecords.length];
    const status = STATUSES[index % STATUSES.length];
    const applicationId = `demo_application_${String(index).padStart(3, '0')}`;
    const application = createApplicationDefaults({
      studentId: student.id,
      studentEmail: student.email || '',
      studentName: student.name || '',
      jobId: job.id,
      company: job.company,
      role: job.title,
      branch: student.branch || '',
      recruiterId: job.recruiterId,
      recruiterName: job.recruiterName,
      source: pick(rng, SOURCES),
      round: status === 'Selected' ? 'Final' : status === 'Shortlisted' ? 'Technical' : 'Screening',
      interviewDate: `2025-${String((index % 9) + 1).padStart(2, '0')}-${String((index % 26) + 1).padStart(2, '0')}`,
      expectedCTC: job.ctc,
      offeredCTC: status === 'Selected' ? job.ctc : '',
      status,
      feedback: status === 'Rejected' ? 'Needs stronger system design fundamentals.' : 'Good potential; continue preparation.',
      notes: `Auto-seeded application for ${student.name || 'student'}.`,
    }, applicationId);
    applicationRecords.push({ id: applicationId, ...application });
    applicationOperations.push((batch) => batch.set(db.collection('applications').doc(applicationId), application, { merge: true }));
  }

  await chunkedCommit([...recruiterOperations, ...jobOperations, ...applicationOperations]);

  const jobsById = new Map(jobRecords.map((job) => [job.id, job]));
  const applicationsByStudent = new Map();
  applicationRecords.forEach((application) => {
    if (!applicationsByStudent.has(application.studentId)) applicationsByStudent.set(application.studentId, []);
    applicationsByStudent.get(application.studentId).push(application);
  });

  const studentOperations = studentsSnap.docs.map((docSnap) => {
    const student = docSnap.data() || {};
    const rollup = syncStudentRollup({ id: docSnap.id, ...student }, applicationRecords, jobsById);
    return (batch) => batch.set(docSnap.ref, {
      ...rollup,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      marketplaceSeededAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  const recruiterSummary = new Map();
  jobRecords.forEach((job) => {
    const key = job.recruiterId;
    if (!recruiterSummary.has(key)) recruiterSummary.set(key, { jobsPosted: 0, hires: 0, activeOpenings: 0 });
    const summary = recruiterSummary.get(key);
    summary.jobsPosted += 1;
    summary.activeOpenings += Number(job.openings || 0);
    summary.hires += applicationRecords.filter((application) => application.jobId === job.id && application.status === 'Selected').length;
  });

  const recruiterSummaryOps = recruiterRecords.map((recruiter) => {
    const summary = recruiterSummary.get(recruiter.id) || { jobsPosted: 0, hires: 0, activeOpenings: 0 };
    return (batch) => batch.set(db.collection('recruiters').doc(recruiter.id), {
      ...recruiter,
      jobsPosted: summary.jobsPosted,
      hires: summary.hires,
      activeOpenings: summary.activeOpenings,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      marketplaceSeededAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  await chunkedCommit([...studentOperations, ...recruiterSummaryOps]);

  console.log(`Seeded ${recruiterRecords.length} recruiters, ${jobRecords.length} jobs, and ${applicationRecords.length} applications.`);
}

seedMarketplaceData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Marketplace seed failed:', error);
    process.exit(1);
  });