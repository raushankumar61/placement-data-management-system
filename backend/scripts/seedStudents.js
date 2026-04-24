#!/usr/bin/env node
/**
 * Seed 200 realistic student records to Firestore
 * Run: node backend/scripts/seedStudents.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://placement-system-8f1b1.firebaseapp.com',
});

const db = admin.firestore();

const BRANCHES = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical',
  'Civil',
  'Electrical',
  'Artificial Intelligence & Machine Learning',
  'Data Science',
];

const COMPANIES = [
  'Google', 'Microsoft', 'Amazon', 'Apple', 'Meta', 'Netflix', 'Uber',
  'LinkedIn', 'Salesforce', 'Oracle', 'IBM', 'TCS', 'Infosys', 'Wipro',
  'Accenture', 'Cognizant', 'HCL', 'Tech Mahindra', 'Capgemini', 'Deloitte',
  'Flipkart', 'Swiggy', 'OYO', 'Unacademy', 'Dream11', 'Razorpay', 'Meesho',
];

const SKILLS = [
  'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'MongoDB',
  'AWS', 'Azure', 'Docker', 'Kubernetes', 'Git', 'REST API', 'GraphQL',
  'Machine Learning', 'Data Science', 'TensorFlow', 'PyTorch', 'C++',
  'DSA', 'System Design', 'Problem Solving', 'Communication', 'Leadership',
];

const PLACEMENT_STATUSES = ['unplaced', 'in-process', 'placed'];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomElements(arr, min, max) {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const result = [];
  const indices = new Set();
  while (result.length < count) {
    const idx = Math.floor(Math.random() * arr.length);
    if (!indices.has(idx)) {
      indices.add(idx);
      result.push(arr[idx]);
    }
  }
  return result;
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max, decimals = 1) {
  const num = Math.random() * (max - min) + min;
  return parseFloat(num.toFixed(decimals));
}

function generateEmail(name, index) {
  const namePart = name.toLowerCase().replace(/\s+/g, '.');
  return `${namePart}${index}@student.edu`;
}

function generateRollNo() {
  const year = getRandomNumber(20, 23);
  const dept = ['CS', 'IT', 'EC', 'ME', 'CE', 'EE', 'AI', 'DS'][getRandomNumber(0, 7)];
  const serial = String(getRandomNumber(1, 999)).padStart(3, '0');
  return `${year}${dept}${serial}`;
}

function generateUSN() {
  const year = getRandomNumber(20, 23);
  const college = String(getRandomNumber(100, 999));
  const branch = String(getRandomNumber(10, 99));
  const serial = String(getRandomNumber(1, 9999)).padStart(4, '0');
  return `${year}JC${college}${branch}${serial}`;
}

function generatePhone() {
  return `9${getRandomNumber(100000000, 999999999)}`;
}

function generateStudentRecord(index) {
  const firstNames = ['Aarav', 'Vivaan', 'Arjun', 'Aditya', 'Vihaan', 'Ishaan', 'Rohan', 'Sarthak', 'Abhishek', 'Nikhil',
    'Isha', 'Priya', 'Ananya', 'Sara', 'Neha', 'Zara', 'Pooja', 'Ridhi', 'Sneha', 'Disha'];
  const lastNames = ['Sharma', 'Kumar', 'Singh', 'Patel', 'Reddy', 'Verma', 'Gupta', 'Rao', 'Nair', 'Iyer',
    'Kulkarni', 'Desai', 'Bhat', 'Srivastava', 'Misra', 'Dutta', 'Aarif', 'Khan', 'Ali', 'Hassan'];

  const firstName = getRandomElement(firstNames);
  const lastName = getRandomElement(lastNames);
  const name = `${firstName} ${lastName}`;
  const branch = getRandomElement(BRANCHES);

  const placementStatus = getRandomElement(PLACEMENT_STATUSES);
  const isPlaced = placementStatus === 'placed';
  const cgpa = getRandomFloat(6.5, 9.5);

  // Generate placement details based on status
  let companyPlaced = '';
  let currentPackage = '';
  let highestPackage = '';
  let offersCount = 0;
  let offerCompanies = [];

  if (isPlaced) {
    offersCount = getRandomNumber(1, 4);
    offerCompanies = getRandomElements(COMPANIES, 1, Math.min(offersCount, COMPANIES.length));
    companyPlaced = offerCompanies[0];
    currentPackage = String(getRandomFloat(8, 25, 2));
    highestPackage = String(getRandomFloat(Number(currentPackage), 30, 2));
  } else if (placementStatus === 'in-process') {
    offersCount = getRandomNumber(0, 2);
    offerCompanies = getRandomElements(COMPANIES, 0, Math.min(offersCount, COMPANIES.length));
    currentPackage = '';
    highestPackage = '';
  }

  const graduationYear = String(getRandomNumber(2024, 2026));
  const dob = `${getRandomNumber(1999, 2004)}-${String(getRandomNumber(1, 12)).padStart(2, '0')}-${String(getRandomNumber(1, 28)).padStart(2, '0')}`;

  return {
    name,
    email: generateEmail(name, index),
    phone: generatePhone(),
    rollNo: generateRollNo(),
    usn: generateUSN(),
    branch,
    cgpa: getRandomFloat(6.5, 9.5),
    graduationYear,
    tenthPercentage: String(getRandomFloat(75, 98)),
    twelfthPercentage: String(getRandomFloat(75, 98)),
    backlogCount: getRandomNumber(0, isPlaced ? 0 : 2),
    placementStatus,
    placementReadinessScore: getRandomNumber(60, 100),
    companyPlaced,
    currentPackage,
    highestPackage,
    offersCount,
    offerCompanies,
    skills: getRandomElements(SKILLS, 4, 8),
    bio: `${name} is a passionate ${branch} student with strong technical skills and problem-solving abilities.`,
    linkedin: `https://linkedin.com/in/${name.toLowerCase().replace(/\s+/g, '-')}-${index}`,
    github: `https://github.com/${name.toLowerCase().replace(/\s+/g, '-')}${index}`,
    projects: getRandomElements([
      'E-commerce Platform',
      'Chat Application',
      'Weather App',
      'Task Management System',
      'Social Media Clone',
      'Blogging Platform',
      'ML Model for Prediction',
      'Data Analytics Dashboard',
      'Real-time Notification System',
      'Mobile App Development',
    ], 2, 4),
    certificationLinks: getRandomElements([
      'https://coursera.org/cert/...',
      'https://udemy.com/cert/...',
      'https://edx.org/cert/...',
      'https://aws.amazon.com/cert/...',
      'https://google.com/cert/...',
    ], 1, 3),
    interviewExperience: `Had ${getRandomNumber(1, 5)} interview rounds. Found the process ${getRandomElement(['very smooth', 'moderately challenging', 'quite demanding'])}. Focus on DSA and system design questions.`,
    improvementSuggestions: getRandomElements([
      'Improve communication skills',
      'Focus on time management',
      'Practice more coding problems',
      'Build more projects',
      'Learn system design',
      'Improve presentation skills',
      'Work on team collaboration',
      'Take more certifications',
    ], 2, 4),
    resumeURL: `https://storage.example.com/resumes/${name.replace(/\s+/g, '-')}-${index}.pdf`,
    address: `${getRandomNumber(100, 999)} ${getRandomElement(['Main', 'Oak', 'Elm', 'Pine'])} Street, ${getRandomElement(['Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai'])}, India`,
    dateOfBirth: dob,
    gender: getRandomElement(['male', 'female', 'other']),
    createdAt: new Date(2024, getRandomNumber(0, 3), getRandomNumber(1, 28)),
  };
}

async function seedStudents() {
  console.log('🌱 Starting to seed 200 students...');

  try {
    const batch = db.batch();
    let count = 0;

    for (let i = 1; i <= 200; i++) {
      const studentData = generateStudentRecord(i);
      const docRef = db.collection('students').doc(`demo_student_${String(i).padStart(3, '0')}`);
      batch.set(docRef, studentData);

      count++;
      if (count % 50 === 0) {
        console.log(`  📝 Generated ${count} students...`);
      }
    }

    console.log('💾 Committing batch to Firestore...');
    await batch.commit();

    console.log('✅ Successfully seeded 200 students to Firestore!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding students:', error);
    process.exit(1);
  }
}

seedStudents();
