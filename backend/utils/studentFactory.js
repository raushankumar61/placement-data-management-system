const BRANCHES = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical',
  'Civil',
  'Electrical',
  'Artificial Intelligence & Machine Learning',
  'Data Science',
  'Aerospace Engineering',
  'Biotechnology',
  'Robotics and Automation',
];

const BRANCH_CODES = {
  'Computer Science': 'CS',
  'Information Technology': 'IT',
  'Electronics & Communication': 'EC',
  Mechanical: 'ME',
  Civil: 'CV',
  Electrical: 'EE',
  'Artificial Intelligence & Machine Learning': 'AI',
  'Data Science': 'DS',
  'Aerospace Engineering': 'AE',
  Biotechnology: 'BT',
  'Robotics and Automation': 'RA',
};

const FIRST_NAMES = ['Aarav', 'Vivaan', 'Arjun', 'Aditya', 'Vihaan', 'Ishaan', 'Rohan', 'Sarthak', 'Abhishek', 'Nikhil', 'Isha', 'Priya', 'Ananya', 'Sara', 'Neha', 'Zara', 'Pooja', 'Ridhi', 'Sneha', 'Disha'];
const LAST_NAMES = ['Sharma', 'Kumar', 'Singh', 'Patel', 'Reddy', 'Verma', 'Gupta', 'Rao', 'Nair', 'Iyer', 'Kulkarni', 'Desai', 'Bhat', 'Srivastava', 'Misra', 'Dutta', 'Aarif', 'Khan', 'Ali', 'Hassan'];
const COMPANIES = ['Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Uber', 'LinkedIn', 'Salesforce', 'Oracle', 'IBM', 'TCS', 'Infosys', 'Wipro', 'Accenture', 'Cognizant', 'HCL', 'Tech Mahindra', 'Capgemini', 'Deloitte', 'Flipkart', 'Swiggy', 'OYO', 'Unacademy', 'Dream11', 'Razorpay', 'Meesho'];
const SKILLS = ['JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'MongoDB', 'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git', 'REST API', 'GraphQL', 'Machine Learning', 'Data Science', 'TensorFlow', 'PyTorch', 'C++', 'DSA', 'System Design', 'Problem Solving', 'Communication', 'Leadership'];
const PROJECTS = ['E-commerce Platform', 'Chat Application', 'Weather App', 'Task Management System', 'Social Media Clone', 'Blogging Platform', 'ML Model for Prediction', 'Data Analytics Dashboard', 'Real-time Notification System', 'Mobile App Development'];
const CERTIFICATIONS = ['https://coursera.org/cert/placeholder', 'https://udemy.com/cert/placeholder', 'https://edx.org/cert/placeholder', 'https://aws.amazon.com/cert/placeholder', 'https://google.com/cert/placeholder'];
const STATUSES = ['unplaced', 'in-process', 'placed'];
const GENDERS = ['male', 'female', 'other'];
const EMAIL_DOMAINS = ['students.placecloud.edu', 'campusmail.placecloud.edu', 'mail.placecloud.edu'];
const RESUME_HOSTS = ['storage.googleapis.com/placecloud-demo-resumes', 'resumes.placecloud.app', 'placecloud-resumes.s3.amazonaws.com'];
const CERTIFICATION_HOSTS = ['www.coursera.org/account/accomplishments/certificate', 'www.udemy.com/certificate', 'www.credly.com/badges', 'www.edx.org/certificates'];

function hashString(input) {
  const text = String(input || 'student');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function createRng(seed) {
  let state = hashString(seed) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function pick(rng, values) {
  return values[Math.floor(rng() * values.length)];
}

function isPlaceholderText(value) {
  const text = String(value || '').trim().toLowerCase();
  return !text
    || text.includes('placeholder')
    || text.includes('storage.example.com')
    || text.includes('@student.edu')
    || text.includes('student.edu')
    || /^demo\b/.test(text)
    || /^sample\b/.test(text)
    || /^test\b/.test(text);
}

function pickMany(rng, values, min, max) {
  const count = Math.max(min, Math.min(values.length, Math.floor(rng() * (max - min + 1)) + min));
  const result = [];
  const used = new Set();
  while (result.length < count) {
    const index = Math.floor(rng() * values.length);
    if (!used.has(index)) {
      used.add(index);
      result.push(values[index]);
    }
  }
  return result;
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (value == null) return [];
  return String(value)
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function branchCode(branch) {
  return BRANCH_CODES[branch] || 'CS';
}

function generateName(rng, seed) {
  return `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`;
}

function generatePhone(seed) {
  const digits = String(1000000000 + (hashString(`${seed}-phone`) % 9000000000));
  return digits.slice(0, 10);
}

function generateRollNo(branch, graduationYear, seed) {
  const year = String(graduationYear || new Date().getFullYear()).slice(-2);
  const code = branchCode(branch);
  const seq = String((hashString(`${seed}-roll`) % 900) + 100).padStart(3, '0');
  return `${year}${code}${seq}`;
}

function generateUsn(branch, graduationYear, seed) {
  const year = String(graduationYear || new Date().getFullYear()).slice(-2);
  const code = branchCode(branch);
  const seq = String((hashString(`${seed}-usn`) % 900) + 100).padStart(3, '0');
  return `${year}${code}${seq}`;
}

function generateEmail(name, seed) {
  const slug = String(name || `student-${seed}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');
  return `${slug || `student.${seed}`}@${pick(createRng(`${seed}-email-domain`), EMAIL_DOMAINS)}`;
}

function generateUrl(type, name, seed) {
  const slug = String(name || `student-${seed}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return type === 'linkedin'
    ? `https://linkedin.com/in/${slug}-${seed}`
    : `https://github.com/${slug}-${seed}`;
}

function generateDateOfBirth(seed) {
  const year = 1999 + (hashString(`${seed}-dob-year`) % 6);
  const month = String((hashString(`${seed}-dob-month`) % 12) + 1).padStart(2, '0');
  const day = String((hashString(`${seed}-dob-day`) % 28) + 1).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateAddress(seed) {
  const streets = ['Main', 'Oak', 'Elm', 'Pine', 'Lake View', 'Garden', 'Park'];
  const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai', 'Kolkata'];
  const number = (hashString(`${seed}-addr`) % 900) + 100;
  return `${number} ${pick(createRng(`${seed}-street`), streets)} Street, ${pick(createRng(`${seed}-city`), cities)}, India`;
}

function generateCertificationLinks(seed, count = 2) {
  const rng = createRng(`${seed}-cert`);
  const links = [];
  while (links.length < count) {
    const host = pick(rng, CERTIFICATION_HOSTS);
    const suffix = `${seed}-${links.length + 1}-${Math.abs(hashString(`${seed}-${links.length + 1}`)).toString(36)}`.replace(/[^a-z0-9-]/g, '-');
    const url = `https://${host}/${suffix}`;
    if (!links.includes(url)) links.push(url);
  }
  return links;
}

function generateResumeUrl(name, seed) {
  const slug = String(name || `student-${seed}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const host = pick(createRng(`${seed}-resume-host`), RESUME_HOSTS);
  return `https://${host}/${slug || `student-${seed}`}-${Math.abs(hashString(`${seed}-resume`)).toString(36)}.pdf`;
}

function createSeededRecord(student = {}, seed = 'student') {
  const rng = createRng(seed);
  const name = !isPlaceholderText(student.name) ? student.name : generateName(rng, seed);
  const branch = student.branch || pick(rng, BRANCHES);
  const graduationYear = String(student.graduationYear || (2024 + Math.floor(rng() * 3)));
  const placementStatus = student.placementStatus || pick(rng, STATUSES);
  const isPlaced = placementStatus === 'placed';
  const skills = normalizeList(student.skills).length ? normalizeList(student.skills) : pickMany(rng, SKILLS, 4, 8);
  const projects = normalizeList(student.projects).length ? normalizeList(student.projects) : pickMany(rng, PROJECTS, 2, 4);
  const existingCertifications = normalizeList(student.certificationLinks);
  const certifications = existingCertifications.length && !existingCertifications.some((link) => isPlaceholderText(link))
    ? existingCertifications
    : generateCertificationLinks(seed, Math.max(1, Math.floor(rng() * 3) + 1));
  const offerCompanies = normalizeList(student.offerCompanies).length ? normalizeList(student.offerCompanies) : (isPlaced ? pickMany(rng, COMPANIES, 1, 4) : []);
  const offersCount = Number(student.offersCount ?? (isPlaced ? Math.max(1, offerCompanies.length) : 0));
  const currentPackage = student.currentPackage || (isPlaced ? String((8 + rng() * 17).toFixed(2)) : '');
  const highestPackage = student.highestPackage || (isPlaced ? String((Number(currentPackage || 8) + rng() * 8).toFixed(2)) : '');
  const companyPlaced = student.companyPlaced || (isPlaced ? offerCompanies[0] || pick(rng, COMPANIES) : '');
  const cgpa = Number(student.cgpa ?? (6.5 + rng() * 3));
  const placementReadinessScore = Number(student.placementReadinessScore ?? (60 + Math.floor(rng() * 41)));
  const tenthPercentage = student.tenthPercentage || String((75 + rng() * 23).toFixed(1));
  const twelfthPercentage = student.twelfthPercentage || String((75 + rng() * 23).toFixed(1));
  const backlogCount = Number(student.backlogCount ?? (isPlaced ? 0 : Math.floor(rng() * 3)));
  const phone = student.phone || generatePhone(seed);
  const rollNo = student.rollNo || generateRollNo(branch, graduationYear, seed);
  const usn = generateUsn(branch, graduationYear, seed);
  const interviewExperience = student.interviewExperience || `Completed ${Math.max(1, Math.floor(rng() * 5) + 1)} rounds with a focus on core concepts, projects, and communication.`;
  const improvementSuggestions = normalizeList(student.improvementSuggestions).length
    ? normalizeList(student.improvementSuggestions)
    : pickMany(rng, [
      'Improve communication skills',
      'Focus on time management',
      'Practice more coding problems',
      'Build more projects',
      'Learn system design',
      'Improve presentation skills',
      'Work on team collaboration',
      'Take more certifications',
    ], 2, 4);

  return {
    ...student,
    name,
    email: !isPlaceholderText(student.email) ? student.email : generateEmail(name, seed),
    phone,
    rollNo,
    usn,
    branch,
    cgpa: Number(cgpa.toFixed(1)),
    graduationYear,
    tenthPercentage,
    twelfthPercentage,
    backlogCount,
    placementStatus,
    placementReadinessScore,
    companyPlaced,
    currentPackage,
    highestPackage,
    offersCount,
    offerCompanies,
    skills,
    bio: student.bio || `${name} is a ${branch} student with a strong focus on practical problem solving and placement readiness.`,
    linkedin: student.linkedin || generateUrl('linkedin', name, seed),
    github: student.github || generateUrl('github', name, seed),
    projects,
    certificationLinks: certifications,
    interviewExperience,
    improvementSuggestions,
    resumeURL: !isPlaceholderText(student.resumeURL) ? student.resumeURL : generateResumeUrl(name, seed),
    address: student.address || generateAddress(seed),
    dateOfBirth: student.dateOfBirth || generateDateOfBirth(seed),
    gender: student.gender || pick(rng, GENDERS),
  };
}

module.exports = {
  BRANCHES,
  createSeededRecord,
  normalizeList,
};