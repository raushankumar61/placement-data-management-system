const { admin, db } = require('../config/firebase');

async function deleteCollection(collectionPath) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(100);
  
  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query, resolve) {
  const snapshot = await query.get();
  if (snapshot.size === 0) {
    resolve();
    return;
  }
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  process.nextTick(() => deleteQueryBatch(query, resolve));
}

async function createAuthUser(email, password, displayName, role) {
  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(userRecord.uid, { password, displayName });
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      userRecord = await admin.auth().createUser({ email, password, displayName });
    } else {
      throw error;
    }
  }
  await admin.auth().setCustomUserClaims(userRecord.uid, { role });
  return userRecord.uid;
}

async function createOrUpdateUser(email, password, displayName, role, meta = {}) {
  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(userRecord.uid, { password, displayName });
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      userRecord = await admin.auth().createUser({ email, password, displayName });
    } else {
      throw error;
    }
  }

  await admin.auth().setCustomUserClaims(userRecord.uid, { role });

  const userData = {
    name: displayName,
    email: email,
    role: role,
    createdAt: new Date().toISOString(),
  };

  if (role === 'student') userData.department = meta.department || 'Computer Science';
  if (role === 'recruiter') userData.companyName = meta.companyName || 'TechNova';
  if (role === 'faculty') {
    userData.designation = meta.designation || 'Faculty Member';
    userData.employeeId = meta.employeeId || 'FAC-000';
  }
  await db.collection('users').doc(userRecord.uid).set(userData);

  if (role === 'recruiter') {
    await db.collection('recruiters').doc(userRecord.uid).set({
      companyName: meta.companyName || 'TechNova Demo',
      name: displayName,
      contactEmail: email,
      verified: true,
      createdAt: new Date().toISOString()
    });
  } else if (role === 'student') {
    await db.collection('students').doc(userRecord.uid).set({
      name: displayName,
      email: email,
      branch: 'Computer Science',
      cgpa: 8.5,
      placementStatus: 'unplaced',
      currentPackage: '',
      highestPackage: '',
      phone: '9876543210',
      skills: ['React', 'Node.js'],
      createdAt: new Date().toISOString(),
      rollNo: '1DS21CS001'
    });
  }

  return userRecord.uid;
}

const firstNames = ['Aarav', 'Vihaan', 'Aditya', 'Sai', 'Rohan', 'Vikram', 'Rahul', 'Karan', 'Aryan', 'Dhruv', 'Ananya', 'Diya', 'Ishita', 'Sneha', 'Neha', 'Priya', 'Riya', 'Kavya', 'Sanya', 'Megha', 'Arjun', 'Kabir', 'Rishabh', 'Siddharth', 'Nikhil', 'Pooja', 'Shruti', 'Anjali', 'Swati', 'Kriti'];
const lastNames = ['Sharma', 'Patel', 'Reddy', 'Kumar', 'Singh', 'Gupta', 'Rao', 'Desai', 'Joshi', 'Chowdhury', 'Iyer', 'Nair', 'Menon', 'Verma', 'Das', 'Sen', 'Bose', 'Chatterjee', 'Dubey', 'Yadav'];

const getBranchCode = (branch) => {
  if (branch === 'Computer Science') return 'CS';
  if (branch === 'Information Technology') return 'IS';
  if (branch === 'Electronics & Communication') return 'EC';
  if (branch === 'Mechanical') return 'ME';
  if (branch === 'Civil') return 'CV';
  return 'XX';
};

const TIER_1_COMPANIES = ['Google', 'Amazon', 'Microsoft', 'Apple', 'Meta', 'Netflix', 'NVIDIA', 'Atlassian'];
const TIER_2_COMPANIES = ['Deloitte', 'PwC', 'KPMG', 'EY', 'Paytm', 'Razorpay', 'Swiggy', 'Zomato', 'Flipkart', 'Cred'];
const TIER_3_COMPANIES = ['TCS', 'Infosys', 'Wipro', 'Cognizant', 'Accenture', 'Tech Mahindra', 'Capgemini'];

// Helper to generate a date offset from today (in days)
const randomDate = (minDaysOffset, maxDaysOffset) => {
  const d = new Date();
  d.setDate(d.getDate() + Math.floor(Math.random() * (maxDaysOffset - minDaysOffset)) + minDaysOffset);
  return d.toISOString();
};

async function seed() {
  console.log('Starting highly realistic seed process...');

  if (!db) {
    console.error('Firestore not initialized.');
    process.exit(1);
  }

  console.log('Clearing old data...');
  await deleteCollection('jobs');
  await deleteCollection('applications');
  await deleteCollection('interviews');
  await deleteCollection('notifications');
  await deleteCollection('alumni');
  await deleteCollection('systemActivity');
  await deleteCollection('students');
  await deleteCollection('recruiters');

  console.log('Creating demo accounts...');
  const pw = 'password123';
  await createOrUpdateUser('admin@demo.com', pw, 'Admin', 'admin');
  
  const facultyList = [
    { email: 'cs.hod@demo.edu', name: 'Dr. Anita Sharma', dept: 'Computer Science', designation: 'Head of Department', empId: 'FAC-CS-001' },
    { email: 'cs.coord@demo.edu', name: 'Prof. Rajesh Kumar', dept: 'Computer Science', designation: 'Placement Coordinator', empId: 'FAC-CS-002' },
    { email: 'it.hod@demo.edu', name: 'Dr. Vikram Singh', dept: 'Information Technology', designation: 'Head of Department', empId: 'FAC-IT-001' },
    { email: 'it.coord@demo.edu', name: 'Prof. Neha Gupta', dept: 'Information Technology', designation: 'Placement Coordinator', empId: 'FAC-IT-002' },
    { email: 'ec.hod@demo.edu', name: 'Dr. Ramesh Rao', dept: 'Electronics & Communication', designation: 'Head of Department', empId: 'FAC-EC-001' },
    { email: 'ec.coord@demo.edu', name: 'Prof. Priya Desai', dept: 'Electronics & Communication', designation: 'Placement Coordinator', empId: 'FAC-EC-002' },
    { email: 'me.hod@demo.edu', name: 'Dr. S. K. Patel', dept: 'Mechanical', designation: 'Head of Department', empId: 'FAC-ME-001' },
    { email: 'me.coord@demo.edu', name: 'Prof. Arvind Menon', dept: 'Mechanical', designation: 'Placement Coordinator', empId: 'FAC-ME-002' },
    { email: 'cv.hod@demo.edu', name: 'Dr. R. K. Iyer', dept: 'Civil', designation: 'Head of Department', empId: 'FAC-CV-001' },
    { email: 'cv.coord@demo.edu', name: 'Prof. Sushma Reddy', dept: 'Civil', designation: 'Placement Coordinator', empId: 'FAC-CV-002' }
  ];

  for (const f of facultyList) {
    await createOrUpdateUser(f.email, pw, f.name, 'faculty', { department: f.dept, designation: f.designation, employeeId: f.empId });
  }

  const companyReps = {
    'Amazon': 'Andy (Amazon)',
    'Google': 'Sundar (Google)',
    'Meta': 'Mark (Meta)',
    'Microsoft': 'Satya (Microsoft)',
    'Razorpay': 'Harshil (Razorpay)',
    'Deloitte': 'Punit (Deloitte)',
    'Swiggy': 'Sriharsha (Swiggy)',
    'TCS': 'K. Krithivasan (TCS)',
    'Wipro': 'Thierry (Wipro)',
    'Accenture': 'Julie (Accenture)'
  };
  const recruiterMap = {};
  for (const [company, rep] of Object.entries(companyReps)) {
    const email = `${company.toLowerCase().replace(/[^a-z]/g, '')}.recruiter@demo.com`;
    const uid = await createOrUpdateUser(email, pw, rep, 'recruiter', { companyName: company });
    recruiterMap[company] = { uid, name: rep };
  }
  const defaultRecruiterUid = await createOrUpdateUser('recruiter@demo.com', pw, 'Demo Recruiter', 'recruiter', { companyName: 'TechNova Demo' });
  recruiterMap['TechNova Demo'] = { uid: defaultRecruiterUid, name: 'Demo Recruiter' };

  // Dummy arrays so the jobs object definition doesn't throw ReferenceError
  const recruiterUid = defaultRecruiterUid;
  const recruiterIds = [defaultRecruiterUid];
  const recruiterNames = ['Demo Recruiter'];

  const studentUid = await createOrUpdateUser('student@demo.com', pw, 'Demo Student', 'student', { department: 'Computer Science' });

  console.log('Generating realistic jobs...');
  
  const jobs = [
    // TIER 1 JOBS
    {
      title: 'Software Development Engineer I',
      company: 'Amazon',
      location: 'Bengaluru',
      ctc: '24 LPA',
      ctcValue: 24,
      tier: 1,
      type: 'Full-time',
      workMode: 'Hybrid',
      experienceLevel: 'Fresher',
      openings: 15,
      minCGPA: 8.0,
      deadline: randomDate(15, 30),
      recruiterId: recruiterIds[Math.floor(Math.random() * recruiterIds.length)],
      recruiterName: recruiterNames[Math.floor(Math.random() * recruiterNames.length)],
      description: 'Design and build scalable services. Strong problem solving and DSA skills required.',
      perks: ['Relocation Bonus', 'Health Insurance', 'Free Meals'],
      branches: ['Computer Science', 'Information Technology', 'Electronics & Communication'],
      status: 'open',
      createdAt: randomDate(-220, -180)
    },
    {
      title: 'Backend Engineer',
      company: 'Google',
      location: 'Bengaluru',
      ctc: '32 LPA',
      ctcValue: 32,
      tier: 1,
      type: 'Full-time',
      workMode: 'Hybrid',
      experienceLevel: 'Fresher',
      openings: 8,
      minCGPA: 8.5,
      deadline: randomDate(10, 20),
      recruiterId: recruiterIds[Math.floor(Math.random() * recruiterIds.length)],
      recruiterName: recruiterNames[Math.floor(Math.random() * recruiterNames.length)],
      description: 'Join the Google Cloud team to work on distributed systems and massive scale architectures.',
      perks: ['Stock Options', 'Gym', 'Free Meals'],
      branches: ['Computer Science', 'Information Technology'],
      status: 'open',
      createdAt: randomDate(-180, -140)
    },
    {
      title: 'Machine Learning Engineer',
      company: 'Meta',
      location: 'Bengaluru',
      ctc: '38 LPA',
      ctcValue: 38,
      tier: 1,
      type: 'Full-time',
      workMode: 'Hybrid',
      experienceLevel: 'Fresher',
      openings: 5,
      minCGPA: 8.5,
      deadline: randomDate(5, 15),
      recruiterId: recruiterIds[Math.floor(Math.random() * recruiterIds.length)],
      recruiterName: recruiterNames[Math.floor(Math.random() * recruiterNames.length)],
      description: 'Build predictive models and scalable AI algorithms for billion-user products.',
      perks: ['Free Meals', 'Relocation Allowance', 'Unlimited PTO'],
      branches: ['Computer Science', 'Information Technology'],
      status: 'open',
      createdAt: randomDate(-140, -100)
    },
    {
      title: 'Frontend Developer',
      company: 'Microsoft',
      location: 'Hyderabad',
      ctc: '22 LPA',
      ctcValue: 22,
      tier: 1,
      type: 'Full-time',
      workMode: 'Hybrid',
      experienceLevel: 'Fresher',
      openings: 12,
      minCGPA: 7.5,
      deadline: randomDate(-5, 5),
      recruiterId: recruiterIds[Math.floor(Math.random() * recruiterIds.length)],
      recruiterName: recruiterNames[Math.floor(Math.random() * recruiterNames.length)],
      description: 'Develop responsive, highly interactive user interfaces using React and modern CSS.',
      perks: ['Remote Work Stipend', 'Health Insurance', 'Gym Allowance'],
      branches: ['Computer Science', 'Information Technology'],
      status: 'closed',
      createdAt: randomDate(-240, -200)
    },
    
    // TIER 2 JOBS
    {
      title: 'Full Stack Engineer',
      company: 'Razorpay',
      location: 'Bengaluru',
      ctc: '18 LPA',
      ctcValue: 18,
      tier: 2,
      type: 'Full-time',
      workMode: 'Onsite',
      experienceLevel: 'Fresher',
      openings: 20,
      minCGPA: 7.0,
      deadline: randomDate(10, 40),
      recruiterId: recruiterIds[Math.floor(Math.random() * recruiterIds.length)],
      recruiterName: recruiterNames[Math.floor(Math.random() * recruiterNames.length)],
      description: 'Work on cutting-edge fintech products. Node.js and React expertise required.',
      perks: ['MacBook', 'Health Insurance', 'Learning Budget'],
      branches: ['Computer Science', 'Information Technology'],
      status: 'open',
      createdAt: randomDate(-100, -70)
    },
    {
      title: 'Business Analyst',
      company: 'Deloitte',
      location: 'Mumbai',
      ctc: '12 LPA',
      ctcValue: 12,
      tier: 2,
      type: 'Full-time',
      workMode: 'Hybrid',
      experienceLevel: 'Fresher',
      openings: 35,
      minCGPA: 6.5,
      deadline: randomDate(-10, 10),
      recruiterId: recruiterIds[Math.floor(Math.random() * recruiterIds.length)],
      recruiterName: recruiterNames[Math.floor(Math.random() * recruiterNames.length)],
      description: 'Analyze business needs, document requirements, and coordinate with technical teams.',
      perks: ['Health Insurance', 'Performance Bonus'],
      branches: ['All'],
      status: 'open',
      createdAt: randomDate(-150, -110)
    },
    {
      title: 'Software Engineer Intern',
      company: 'Swiggy',
      location: 'Bengaluru',
      ctc: '50k/month',
      ctcValue: 6,
      tier: 2,
      type: 'Internship',
      workMode: 'Hybrid',
      experienceLevel: 'Fresher',
      openings: 15,
      minCGPA: 7.0,
      deadline: randomDate(5, 20),
      recruiterId: recruiterIds[Math.floor(Math.random() * recruiterIds.length)],
      recruiterName: recruiterNames[Math.floor(Math.random() * recruiterNames.length)],
      description: '6-month internship leading to PPO. Work on high-scale delivery logistics.',
      perks: ['Stipend', 'Free Food', 'PPO Opportunity'],
      branches: ['Computer Science', 'Information Technology'],
      status: 'open',
      createdAt: randomDate(-15, 0)
    },
    
    // TIER 3 JOBS
    {
      title: 'Systems Engineer',
      company: 'TCS',
      location: 'Pune',
      ctc: '7 LPA',
      ctcValue: 7,
      tier: 3,
      type: 'Full-time',
      workMode: 'Onsite',
      experienceLevel: 'Fresher',
      openings: 150,
      minCGPA: 6.0,
      deadline: randomDate(30, 60),
      recruiterId: recruiterUid,
      recruiterName: 'Demo Recruiter',
      description: 'Entry-level engineering role. Comprehensive training provided upon joining.',
      perks: ['Health Insurance', 'Transport'],
      branches: ['All'],
      status: 'open',
      createdAt: randomDate(-10, 5)
    },
    {
      title: 'Project Engineer',
      company: 'Wipro',
      location: 'Chennai',
      ctc: '6.5 LPA',
      ctcValue: 6.5,
      tier: 3,
      type: 'Full-time',
      workMode: 'Onsite',
      experienceLevel: 'Fresher',
      openings: 100,
      minCGPA: 6.0,
      deadline: randomDate(-20, 0),
      recruiterId: recruiterUid,
      recruiterName: 'Demo Recruiter',
      description: 'Work on diverse client projects across various domains.',
      perks: ['Health Insurance', 'Training'],
      branches: ['All'],
      status: 'closed',
      createdAt: randomDate(-80, -40)
    },
    {
      title: 'Associate Software Engineer',
      company: 'Accenture',
      location: 'Noida',
      ctc: '8 LPA',
      ctcValue: 8,
      tier: 3,
      type: 'Full-time',
      workMode: 'Hybrid',
      experienceLevel: 'Fresher',
      openings: 80,
      minCGPA: 6.5,
      deadline: randomDate(15, 45),
      recruiterId: recruiterUid,
      recruiterName: 'Demo Recruiter',
      description: 'Develop and maintain enterprise applications.',
      perks: ['Health Insurance', 'Flexible Hours'],
      branches: ['Computer Science', 'Information Technology', 'Electronics & Communication'],
      status: 'open',
      createdAt: randomDate(-25, 0)
    }
  ];

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const rec = recruiterMap[job.company] || recruiterMap['TechNova Demo'];
    job.recruiterId = rec.uid;
    job.recruiterName = rec.name;
    await db.collection('jobs').doc(`mock_job_${i}`).set(job);
  }

  console.log('Generating realistic students, applications, and interviews...');
  const branches = [
    { name: 'Computer Science', weight: 30 },
    { name: 'Information Technology', weight: 20 },
    { name: 'Electronics & Communication', weight: 15 },
    { name: 'Mechanical', weight: 10 },
    { name: 'Civil', weight: 10 }
  ];
  
  let batch = db.batch();
  let opCount = 0;
  let studentCounter = 2; // Demo student is 1
  const activities = [];
  const systemApplications = [];

  for (const branchObj of branches) {
    const branchCode = getBranchCode(branchObj.name);
    // Generate students proportionally
    for (let i = 1; i <= branchObj.weight; i++) {
      const fname = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lname = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${fname} ${lname}`;
      const email = `${fname.toLowerCase()}.${lname.toLowerCase()}${Math.floor(Math.random() * 999)}@demo.edu`;
      const rollNo = `1DS21${branchCode}${(studentCounter++).toString().padStart(3, '0')}`;
      
      const studentId = await createAuthUser(email, pw, name, 'student');
      const studentRef = db.collection('students').doc(studentId);
      const userRef = db.collection('users').doc(studentId);
      
      // Realistically distribute CGPA: bell curve centered around 7.5
      let u = 0, v = 0;
      while(u === 0) u = Math.random();
      while(v === 0) v = Math.random();
      let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      num = num / 10.0 + 0.5; // Translate to 0 -> 1
      if (num < 0 || num > 1) num = 0.5; // resample between 0 and 1
      
      // Map to 5.0 - 9.8 CGPA range
      const finalCgpa = (5.0 + (num * 4.8)).toFixed(2);
      const numCgpa = Number(finalCgpa);
      
      // Number of backlogs is inversely correlated to CGPA
      const backlogCount = numCgpa < 6.5 ? Math.floor(Math.random() * 3) : 0;

      let branchSkills = [];
      if (['Computer Science', 'Information Technology'].includes(branchObj.name)) {
        branchSkills = ['Python', 'Java', 'C++', 'JavaScript', 'React', 'Node.js', 'SQL', 'MongoDB', 'AWS', 'Data Structures', 'System Design'];
      } else if (branchObj.name === 'Electronics & Communication') {
        branchSkills = ['C', 'C++', 'Python', 'MATLAB', 'Verilog', 'IoT', 'Embedded Systems'];
      } else if (branchObj.name === 'Mechanical') {
        branchSkills = ['AutoCAD', 'SolidWorks', 'MATLAB', 'ANSYS', 'Python', 'C++'];
      } else if (branchObj.name === 'Civil') {
        branchSkills = ['AutoCAD', 'Revit', 'STAAD.Pro', 'Project Management', 'C++'];
      }
      
      // Top students get top skills
      if (numCgpa > 8.0) {
        branchSkills.push('System Design', 'Competitive Programming', 'Machine Learning', 'Cloud Architecture');
      }

      const shuffledSkills = branchSkills.sort(() => 0.5 - Math.random());
      const studentSkills = shuffledSkills.slice(0, 3 + Math.floor(Math.random() * 4));

      // Placement Logic: Correlated to CGPA
      let placementStatus = 'unplaced';
      let highestPackage = '';
      let companyPlaced = '';
      let offersCount = 0;
      let placementReadinessScore = Math.floor((numCgpa * 10) - (backlogCount * 5));
      if (placementReadinessScore > 100) placementReadinessScore = 100;

      // Decide which tier they place in based on CGPA
      let targetTier = 0;
      if (numCgpa >= 8.0 && Math.random() > 0.4) targetTier = 1;
      else if (numCgpa >= 7.0 && Math.random() > 0.3) targetTier = 2;
      else if (numCgpa >= 6.0 && backlogCount === 0 && Math.random() > 0.2) targetTier = 3;

      const myJobs = [];
      
      if (targetTier > 0) {
        // Find jobs in this tier that the branch is eligible for
        const eligibleJobs = jobs.filter(j => 
          j.tier === targetTier && 
          numCgpa >= j.minCGPA && 
          (j.branches.includes('All') || j.branches.includes(branchObj.name))
        );

        if (eligibleJobs.length > 0) {
          const job = eligibleJobs[Math.floor(Math.random() * eligibleJobs.length)];
          placementStatus = 'placed';
          companyPlaced = job.company;
          highestPackage = job.ctc;
          offersCount = 1;
          
          // Generate application for this job
          const appliedDate = randomDate(-240, -10);
          const appRef = db.collection('applications').doc();
          const appData = {
            studentId: studentId,
            studentName: name,
            studentEmail: email,
            jobId: `mock_job_${jobs.indexOf(job)}`,
            company: job.company,
            role: job.title,
            status: 'Selected',
            ctc: job.ctc,
            appliedAt: appliedDate,
            updatedAt: randomDate(-10, 0),
            createdAt: appliedDate,
            recruiterId: job.recruiterId,
            recruiterName: job.recruiterName
          };
          batch.set(appRef, appData);
          systemApplications.push(appData);
          myJobs.push(job);
          opCount++;

          // Generate success interview feedback
          const intRef = db.collection('interviews').doc();
          const interviewDate = randomDate(-25, -10);
          batch.set(intRef, {
            studentId: studentId,
            studentName: name,
            studentEmail: email,
            role: job.title,
            company: job.company,
            date: interviewDate.split('T')[0],
            time: '11:00 AM',
            mode: 'Online',
            platform: 'Google Meet',
            round: 'Technical + HR',
            link: 'https://meet.google.com/mock-link',
            instructions: 'Final interview',
            status: 'completed',
            createdBy: 'mock_system',
            recruiterId: job.recruiterId,
            feedback: {
              rating: 4 + Math.floor(Math.random() * 2), // 4 or 5
              strengths: `Excellent problem solving. Handled the ${studentSkills[0]} questions perfectly.`,
              improvements: 'Can improve on system design scalability concepts.',
              result: 'Selected',
              givenBy: 'Technical Panel'
            }
          });
          opCount++;
          
          activities.push({
            type: 'status_updated',
            payload: { newStatus: 'Selected', company: job.company },
            createdAt: appData.updatedAt
          });
        }
      }

      // Generate some rejected/in-process applications to make it realistic
      if (Math.random() > 0.5) {
        const otherJobs = jobs.filter(j => !myJobs.includes(j) && (j.branches.includes('All') || j.branches.includes(branchObj.name)));
        if (otherJobs.length > 0) {
          const randomJob = otherJobs[Math.floor(Math.random() * otherJobs.length)];
          const isPending = Math.random() > 0.5;
          const status = isPending ? (Math.random() > 0.5 ? 'Shortlisted' : 'Applied') : 'Rejected';
          
          if (placementStatus === 'unplaced' && status !== 'Rejected') {
            placementStatus = 'in-process';
          }

          const appliedDate = randomDate(-240, -10);
          const appRef = db.collection('applications').doc();
          batch.set(appRef, {
            studentId: studentId,
            studentName: name,
            studentEmail: email,
            jobId: `mock_job_${jobs.indexOf(randomJob)}`,
            company: randomJob.company,
            role: randomJob.title,
            status: status,
            appliedAt: appliedDate,
            updatedAt: isPending ? appliedDate : randomDate(-10, 0),
            createdAt: appliedDate,
            recruiterId: randomJob.recruiterId,
            recruiterName: randomJob.recruiterName
          });
          opCount++;

          // If rejected, maybe they failed an interview
          if (status === 'Rejected' && Math.random() > 0.5) {
            const intRef = db.collection('interviews').doc();
            batch.set(intRef, {
              studentId: studentId,
              studentName: name,
              studentEmail: email,
              role: randomJob.title,
              company: randomJob.company,
              date: randomDate(-15, -5).split('T')[0],
              time: '14:00 PM',
              mode: 'Online',
              platform: 'Zoom',
              round: 'Technical Round 1',
              link: 'https://zoom.us/mock-link',
              instructions: 'Initial technical screening',
              status: 'completed',
              createdBy: 'mock_system',
              recruiterId: randomJob.recruiterId,
              feedback: {
                rating: 2,
                strengths: 'Good communication skills.',
                improvements: 'Struggled with Data Structures and Algorithms optimization.',
                result: 'Rejected',
                givenBy: 'Technical Panel'
              }
            });
            opCount++;
          }
        }
      }

      batch.set(studentRef, {
        name: name,
        email: email,
        branch: branchObj.name,
        cgpa: numCgpa,
        placementStatus: placementStatus,
        currentPackage: highestPackage,
        highestPackage: highestPackage,
        companyPlaced: companyPlaced,
        offersCount: offersCount,
        backlogCount: backlogCount,
        placementReadinessScore: placementReadinessScore,
        skills: studentSkills,
        projects: ['Built a Placement Portal System', 'E-Commerce Backend API'],
        rollNo: rollNo,
        createdAt: new Date().toISOString()
      });

      batch.set(userRef, {
        name: name,
        email: email,
        role: 'student',
        department: branchObj.name,
        createdAt: new Date().toISOString()
      });

      opCount += 2;
      if (opCount > 400) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    }
  }
  if (opCount > 0) await batch.commit();

  console.log('Creating mock alumni...');
  const mockAlumni = [];
  
  for (let i = 1; i <= 12; i++) {
    const fname = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lname = lastNames[Math.floor(Math.random() * lastNames.length)];
    // Mix of Tier 1 & 2 for Alumni
    const company = (Math.random() > 0.5 ? TIER_1_COMPANIES : TIER_2_COMPANIES)[Math.floor(Math.random() * 5)];
    
    mockAlumni.push({
      name: `${fname} ${lname}`,
      email: `${fname.toLowerCase()}.${lname.toLowerCase()}@alumni.demo.edu`,
      branch: branches[Math.floor(Math.random() * branches.length)].name,
      companyPlaced: company,
      bio: `SDE at ${company}. Experience in scalable systems. Reach out for resume reviews or referrals!`,
      linkedin: `https://www.linkedin.com/in/${fname.toLowerCase()}-${lname.toLowerCase()}-${Math.floor(Math.random() * 10000)}/`,
      graduationYear: 2021 + Math.floor(Math.random() * 4),
      createdAt: new Date().toISOString()
    });
  }

  for (let i = 0; i < mockAlumni.length; i++) {
    await db.collection('alumni').doc(`mock_alumni_${i}`).set(mockAlumni[i]);
  }

  console.log('Logging system activity...');
  // Ensure we have some base activities
  activities.push(
    { type: 'job_posted', payload: { title: 'Backend Engineer', company: 'Google' }, createdAt: randomDate(-45, -40) },
    { type: 'job_posted', payload: { title: 'Machine Learning Engineer', company: 'Meta' }, createdAt: randomDate(-30, -28) },
    { type: 'job_posted', payload: { title: 'Software Development Engineer I', company: 'Amazon' }, createdAt: randomDate(-60, -58) }
  );

  // Sort activities by date
  activities.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  
  for (let i = 0; i < Math.min(activities.length, 50); i++) {
    await db.collection('systemActivity').add(activities[i]);
  }

  console.log('✅ Highly Realistic Seed process completed successfully!');
}

seed().catch(console.error).finally(() => process.exit(0));
