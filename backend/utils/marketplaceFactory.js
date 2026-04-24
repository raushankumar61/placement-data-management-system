const JOB_TYPES = ['Full-time', 'Internship', 'PPO', 'Contract'];
const WORK_MODES = ['Onsite', 'Hybrid', 'Remote'];
const EXPERIENCE_LEVELS = ['Fresher', '0-2 years', '2-4 years', '4+ years'];
const INDUSTRIES = ['Technology', 'Finance', 'Consulting', 'E-commerce', 'Healthcare', 'Manufacturing', 'EdTech', 'SaaS', 'Media'];
const ROLE_POOL = ['SDE', 'Data Analyst', 'Data Scientist', 'Product Manager', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'QA Engineer', 'DevOps Engineer', 'Business Analyst'];
const BENEFITS = ['Flexible hours', 'Health insurance', 'Learning budget', 'Remote allowance', 'Mentorship program', 'Performance bonus', 'Paid leave'];
const SOURCES = ['Campus Drive', 'Off Campus', 'Referral', 'Portal', 'LinkedIn', 'Hackathon', 'Company Career Page'];
const RECRUITER_SIZES = ['1-50', '51-200', '201-500', '501-1000', '1000+'];

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

const pickMany = (rng, values, min, max) => {
  const target = Math.max(min, Math.min(values.length, Math.floor(rng() * (max - min + 1)) + min));
  const result = [];
  const used = new Set();
  while (result.length < target) {
    const index = Math.floor(rng() * values.length);
    if (!used.has(index)) {
      used.add(index);
      result.push(values[index]);
    }
  }
  return result;
};

const normalizeList = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (value == null) return [];
  return String(value).split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
};

const ensureArray = (value, fallback) => {
  const list = normalizeList(value);
  return list.length ? list : fallback;
};

const cleanSlug = (value) => String(value || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const createJobDefaults = (job = {}, seed = 'job') => {
  const rng = createRng(seed);
  const title = job.title || pick(rng, ROLE_POOL);
  const company = job.company || pick(rng, ['Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Uber', 'Salesforce', 'Oracle', 'IBM', 'TCS', 'Infosys', 'Wipro', 'Accenture', 'Deloitte', 'Flipkart', 'Swiggy', 'Razorpay']);
  const branches = ensureArray(job.branches, ['All']);
  const ctcBase = job.ctc || `${pick(rng, [6, 8, 10, 12, 15, 18, 20, 24])} LPA`;
  const applicants = Number(job.applicants ?? (50 + Math.floor(rng() * 200)));

  return {
    ...job,
    title,
    company,
    recruiterId: job.recruiterId || `recruiter-${cleanSlug(company)}`,
    recruiterName: job.recruiterName || `${company} Talent Team`,
    recruiterEmail: job.recruiterEmail || `talent@${cleanSlug(company)}.com`,
    industry: job.industry || pick(rng, INDUSTRIES),
    workMode: job.workMode || pick(rng, WORK_MODES),
    experienceLevel: job.experienceLevel || pick(rng, EXPERIENCE_LEVELS),
    location: job.location || pick(rng, ['Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Mumbai', 'Delhi NCR']),
    ctc: ctcBase,
    stipend: job.stipend || (job.type === 'Internship' ? '80k/month' : ''),
    type: job.type || pick(rng, JOB_TYPES),
    minCGPA: job.minCGPA || String((6.5 + rng() * 1.5).toFixed(1)),
    branches,
    skills: ensureArray(job.skills, pickMany(rng, ['Python', 'Java', 'JavaScript', 'React', 'Node.js', 'SQL', 'MongoDB', 'AWS', 'Docker', 'Git', 'DSA', 'Communication'], 4, 7)),
    perks: ensureArray(job.perks, pickMany(rng, BENEFITS, 2, 4)),
    description: job.description || `${company} is hiring for ${title} with a focus on product quality, ownership, and scalable systems.`,
    interviewRounds: Number(job.interviewRounds ?? (2 + Math.floor(rng() * 3))),
    openingRole: job.openingRole || title,
    openings: Number(job.openings ?? (5 + Math.floor(rng() * 20))),
    applicants,
    applyLink: job.applyLink || `https://careers.${cleanSlug(company)}.com/${cleanSlug(title)}`,
    postedOnCampus: Boolean(job.postedOnCampus ?? (rng() > 0.5)),
    deadline: job.deadline || `${2025}-${String(Math.floor(rng() * 9) + 1).padStart(2, '0')}-${String(Math.floor(rng() * 25) + 1).padStart(2, '0')}`,
    status: job.status || 'active',
    createdAt: job.createdAt || new Date().toISOString(),
  };
};

const createRecruiterDefaults = (recruiter = {}, seed = 'recruiter') => {
  const rng = createRng(seed);
  const companyName = recruiter.companyName || recruiter.name || pick(rng, ['Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Infosys', 'TCS', 'Wipro', 'Accenture', 'Deloitte']);
  const contactEmail = recruiter.contactEmail || recruiter.email || `talent@${cleanSlug(companyName)}.com`;

  return {
    ...recruiter,
    companyName,
    contactEmail,
    phone: recruiter.phone || `+91-${String(7000000000 + (hashString(`${seed}-phone`) % 900000000)).slice(0, 10)}`,
    website: recruiter.website || `https://www.${cleanSlug(companyName)}.com`,
    industry: recruiter.industry || pick(rng, INDUSTRIES),
    location: recruiter.location || pick(rng, ['Bangalore', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi NCR', 'Chennai']),
    companySize: recruiter.companySize || pick(rng, RECRUITER_SIZES),
    foundedYear: Number(recruiter.foundedYear || (1995 + Math.floor(rng() * 25))),
    linkedIn: recruiter.linkedIn || `https://linkedin.com/company/${cleanSlug(companyName)}`,
    hiringRoles: ensureArray(recruiter.hiringRoles, pickMany(rng, ROLE_POOL, 2, 4)),
    jobsPosted: Number(recruiter.jobsPosted ?? (1 + Math.floor(rng() * 12))),
    hires: Number(recruiter.hires ?? Math.floor(rng() * 20)),
    activeOpenings: Number(recruiter.activeOpenings ?? (1 + Math.floor(rng() * 8))),
    verified: Boolean(recruiter.verified),
    about: recruiter.about || `${companyName} recruits for high-impact product and engineering roles across multiple campus drives.`,
    createdAt: recruiter.createdAt || new Date().toISOString(),
  };
};

const createApplicationDefaults = (application = {}, seed = 'application') => {
  const rng = createRng(seed);
  const status = application.status || pick(rng, ['Applied', 'Shortlisted', 'Selected', 'Rejected']);

  return {
    ...application,
    studentId: application.studentId || '',
    studentEmail: application.studentEmail || '',
    studentName: application.studentName || '',
    jobId: application.jobId || '',
    company: application.company || '',
    role: application.role || application.title || '',
    branch: application.branch || '',
    source: application.source || pick(rng, SOURCES),
    round: application.round || (status === 'Selected' ? 'Final' : status === 'Shortlisted' ? 'Technical' : 'Screening'),
    interviewDate: application.interviewDate || `${2025}-${String(Math.floor(rng() * 9) + 1).padStart(2, '0')}-${String(Math.floor(rng() * 25) + 1).padStart(2, '0')}`,
    expectedCTC: application.expectedCTC || '',
    offeredCTC: application.offeredCTC || '',
    recruiterId: application.recruiterId || '',
    recruiterName: application.recruiterName || '',
    notes: application.notes || 'No additional notes yet.',
    feedback: application.feedback || '',
    resumeScore: Number(application.resumeScore ?? (60 + Math.floor(rng() * 41))),
    status,
    appliedAt: application.appliedAt || new Date().toISOString(),
    createdAt: application.createdAt || new Date().toISOString(),
  };
};

const syncStudentRollup = (student = {}, applications = [], jobsById = new Map()) => {
  const relevant = applications.filter((application) => String(application.studentId || '') === String(student.id || student.uid || ''));
  const normalizedStudent = { ...student };
  const shortlisted = relevant.filter((application) => ['Shortlisted', 'Selected'].includes(application.status));
  const selected = relevant.filter((application) => application.status === 'Selected');
  const rejected = relevant.filter((application) => application.status === 'Rejected');
  const companyNames = Array.from(new Set(selected.map((application) => application.company || jobsById.get(application.jobId)?.company).filter(Boolean)));
  const selectedPackages = selected.map((application) => {
    const job = jobsById.get(application.jobId) || {};
    const value = application.offeredCTC || job.ctc || application.expectedCTC || '';
    const match = String(value).match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : null;
  }).filter((value) => value != null);

  normalizedStudent.applicationCount = relevant.length;
  normalizedStudent.shortlistedCount = shortlisted.length;
  normalizedStudent.selectedCount = selected.length;
  normalizedStudent.rejectedCount = rejected.length;
  normalizedStudent.latestApplicationCompany = relevant[0]?.company || normalizedStudent.latestApplicationCompany || '';
  normalizedStudent.latestApplicationStatus = relevant[0]?.status || normalizedStudent.latestApplicationStatus || 'N/A';
  normalizedStudent.applicationSources = Array.from(new Set(relevant.map((application) => application.source).filter(Boolean)));
  normalizedStudent.offerCompanies = Array.from(new Set([...(normalizedStudent.offerCompanies || []), ...companyNames]));

  if (selected.length) {
    normalizedStudent.placementStatus = 'placed';
    normalizedStudent.companyPlaced = normalizedStudent.companyPlaced || companyNames[0] || selected[0].company || '';
    const maxPackage = selectedPackages.length ? Math.max(...selectedPackages) : null;
    if (maxPackage != null) {
      normalizedStudent.currentPackage = normalizedStudent.currentPackage || `${maxPackage} LPA`;
      normalizedStudent.highestPackage = normalizedStudent.highestPackage || `${maxPackage} LPA`;
    }
    normalizedStudent.offersCount = Math.max(Number(normalizedStudent.offersCount || 0), selected.length);
  } else if (shortlisted.length && normalizedStudent.placementStatus !== 'placed') {
    normalizedStudent.placementStatus = 'in-process';
  } else if (relevant.length && normalizedStudent.placementStatus === 'unplaced') {
    normalizedStudent.placementStatus = 'in-process';
  }

  return normalizedStudent;
};

module.exports = {
  createJobDefaults,
  createRecruiterDefaults,
  createApplicationDefaults,
  syncStudentRollup,
};