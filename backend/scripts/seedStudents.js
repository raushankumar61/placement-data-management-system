#!/usr/bin/env node
/**
 * Seed 200 realistic student records to Firestore
 * Run: node backend/scripts/seedStudents.js
 */

const admin = require('firebase-admin');
const path = require('path');
const { createSeededRecord } = require('../utils/studentFactory');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://placement-system-8f1b1.firebaseapp.com',
});

const db = admin.firestore();

function generateStudentRecord(index) {
  const base = createSeededRecord({
    placementStatus: index % 5 === 0 ? 'placed' : index % 5 === 1 ? 'in-process' : 'unplaced',
  }, `demo_student_${index}`);

  return {
    ...base,
    createdAt: new Date(2024, Math.floor(Math.random() * 4), Math.floor(Math.random() * 28) + 1),
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
