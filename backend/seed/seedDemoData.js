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

async function createOrUpdateUser(email, password, displayName, role) {
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

  if (role === 'student') userData.department = 'Computer Science';
  await db.collection('users').doc(userRecord.uid).set(userData);

  if (role === 'recruiter') {
    await db.collection('recruiters').doc(userRecord.uid).set({
      companyName: 'TechNova Demo',
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

const firstNames = ['Aarav', 'Vihaan', 'Aditya', 'Sai', 'Rohan', 'Vikram', 'Rahul', 'Karan', 'Aryan', 'Dhruv', 'Ananya', 'Diya', 'Ishita', 'Sneha', 'Neha', 'Priya', 'Riya', 'Kavya', 'Sanya', 'Megha'];
const lastNames = ['Sharma', 'Patel', 'Reddy', 'Kumar', 'Singh', 'Gupta', 'Rao', 'Desai', 'Joshi', 'Chowdhury', 'Iyer', 'Nair', 'Menon'];

const getBranchCode = (branch) => {
  if (branch === 'Computer Science') return 'CS';
  if (branch === 'Information Technology') return 'IS';
  if (branch === 'Electronics & Communication') return 'EC';
  if (branch === 'Mechanical') return 'ME';
  if (branch === 'Civil') return 'CV';
  return 'XX';
};

async function seed() {
  console.log('Starting seed process...');

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

  console.log('Creating demo accounts...');
  const pw = 'password123';
  await createOrUpdateUser('admin@demo.com', pw, 'Demo Admin', 'admin');
  await createOrUpdateUser('faculty@demo.com', pw, 'Demo Faculty', 'faculty');
  const recruiterUid = await createOrUpdateUser('recruiter@demo.com', pw, 'Demo Recruiter', 'recruiter');
  const studentUid = await createOrUpdateUser('student@demo.com', pw, 'Demo Student', 'student');

  console.log('Generating students...');
  const branches = ['Computer Science', 'Information Technology', 'Electronics & Communication', 'Mechanical', 'Civil'];
  let batch = db.batch();
  let opCount = 0;
  
  let studentCounter = 2; // Demo student is 1

  for (const branch of branches) {
    const branchCode = getBranchCode(branch);
    for (let i = 1; i <= 15; i++) {
      const fname = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lname = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${fname} ${lname}`;
      const email = `${fname.toLowerCase()}.${lname.toLowerCase()}${i}@demo.edu`;
      const rollNo = `1DS21${branchCode}${(studentCounter++).toString().padStart(3, '0')}`;
      
      const studentId = await createAuthUser(email, pw, name, 'student');
      const studentRef = db.collection('students').doc(studentId);
      const userRef = db.collection('users').doc(studentId);
      
      const cgpaBase = 6.0 + Math.random() * 2.0;
      const cgpaBonus = Math.random() > 0.7 ? Math.random() * 2.0 : 0;
      const finalCgpa = Math.min(10.0, cgpaBase + cgpaBonus).toFixed(1);

      let branchSkills = [];
      if (branch === 'Computer Science' || branch === 'Information Technology') {
        branchSkills = ['Python', 'Java', 'C++', 'JavaScript', 'React', 'Node.js', 'SQL', 'MongoDB', 'AWS', 'Data Structures'];
      } else if (branch === 'Electronics & Communication') {
        branchSkills = ['C', 'C++', 'Python', 'MATLAB', 'Verilog', 'IoT', 'Embedded Systems'];
      } else if (branch === 'Mechanical') {
        branchSkills = ['AutoCAD', 'SolidWorks', 'MATLAB', 'ANSYS', 'Python', 'C++'];
      } else if (branch === 'Civil') {
        branchSkills = ['AutoCAD', 'Revit', 'STAAD.Pro', 'Project Management', 'C++'];
      } else {
        branchSkills = ['Python', 'C++', 'Java', 'Communication', 'Problem Solving'];
      }
      
      // Pick 3-6 random skills from the branch pool
      const shuffledSkills = branchSkills.sort(() => 0.5 - Math.random());
      const studentSkills = shuffledSkills.slice(0, 3 + Math.floor(Math.random() * 4));

      batch.set(studentRef, {
        name: name,
        email: email,
        branch: branch,
        cgpa: Number(finalCgpa),
        placementStatus: Math.random() > 0.8 ? 'placed' : 'unplaced',
        currentPackage: '',
        skills: studentSkills,
        rollNo: rollNo,
        createdAt: new Date().toISOString()
      });

      batch.set(userRef, {
        name: name,
        email: email,
        role: 'student',
        department: branch,
        createdAt: new Date().toISOString()
      });

      const completedDate = new Date();
      completedDate.setDate(completedDate.getDate() - Math.floor(Math.random() * 30) - 1);
      
      const interview1 = {
        studentId: studentId,
        studentName: name,
        studentEmail: email,
        role: jobs[Math.floor(Math.random() * jobs.length)].title,
        company: companies[Math.floor(Math.random() * companies.length)],
        date: completedDate.toISOString().split('T')[0],
        time: '10:00 AM',
        mode: 'Online',
        platform: 'Google Meet',
        round: 'Technical Round 1',
        link: 'https://meet.google.com/mock-link',
        instructions: 'Be prepared with a working camera and microphone.',
        status: 'completed',
        createdBy: 'mock_system',
        feedback: {
          rating: 4,
          strengths: 'Good grasp of core CS fundamentals. Clear communication.',
          improvements: 'Could optimize the DP solution further.',
          result: 'Selected for Next Round',
          givenBy: 'Technical Panel'
        }
      };

      const upcomingDate = new Date();
      upcomingDate.setDate(upcomingDate.getDate() + Math.floor(Math.random() * 10) + 1);
      
      const interview2 = {
        studentId: studentId,
        studentName: name,
        studentEmail: email,
        role: jobs[Math.floor(Math.random() * jobs.length)].title,
        company: companies[Math.floor(Math.random() * companies.length)],
        date: upcomingDate.toISOString().split('T')[0],
        time: '02:00 PM',
        mode: 'Online',
        platform: 'Zoom',
        round: 'HR Round',
        link: 'https://zoom.us/mock-link',
        instructions: 'Please join 5 mins early.',
        status: 'scheduled',
        createdBy: 'mock_system'
      };

      const intRef1 = db.collection('interviews').doc();
      const intRef2 = db.collection('interviews').doc();
      batch.set(intRef1, interview1);
      batch.set(intRef2, interview2);

      opCount += 4;
      if (opCount > 400) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    }
  }
  if (opCount > 0) await batch.commit();

  console.log('Creating mock jobs...');
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 1);
  const farFutureDate = new Date();
  farFutureDate.setMonth(farFutureDate.getMonth() + 2);

  const jobs = [
    {
      title: 'Software Development Engineer I',
      company: 'Amazon',
      location: 'Bengaluru',
      ctc: '24 LPA',
      type: 'Full-time',
      workMode: 'Hybrid',
      experienceLevel: 'Fresher',
      openings: 15,
      minCGPA: 7.5,
      deadline: futureDate.toISOString(),
      recruiterId: recruiterUid,
      recruiterName: 'Demo Recruiter',
      description: 'Design and build scalable services. Strong problem solving and DSA skills required.',
      perks: ['Relocation Bonus', 'Health Insurance', 'Free Meals'],
      branches: ['Computer Science', 'Information Technology', 'Electronics & Communication'],
      status: 'open',
      createdAt: new Date().toISOString()
    },
    {
      title: 'Data Analyst Intern',
      company: 'Amazon',
      location: 'Hyderabad',
      ctc: '80k/month',
      type: 'Internship',
      workMode: 'Onsite',
      experienceLevel: 'Fresher',
      openings: 5,
      minCGPA: 7.0,
      deadline: farFutureDate.toISOString(),
      recruiterId: recruiterUid,
      recruiterName: 'Demo Recruiter',
      description: 'Analyze large datasets to extract actionable insights. SQL and Python required.',
      perks: ['Stipend', 'Pre-Placement Offer (PPO)'],
      branches: ['Computer Science', 'Information Technology', 'Mechanical'],
      status: 'open',
      createdAt: new Date().toISOString()
    },
    {
      title: 'Backend Engineer',
      company: 'Google',
      location: 'Bengaluru',
      ctc: '32 LPA',
      type: 'Full-time',
      workMode: 'Hybrid',
      experienceLevel: 'Fresher',
      openings: 10,
      minCGPA: 8.0,
      deadline: futureDate.toISOString(),
      recruiterId: recruiterUid,
      recruiterName: 'Demo Recruiter',
      description: 'Join the Google Cloud team to work on distributed systems and massive scale architectures.',
      perks: ['Stock Options', 'Gym', 'Free Meals'],
      branches: ['Computer Science', 'Information Technology'],
      status: 'open',
      createdAt: new Date().toISOString()
    },
    {
      title: 'Systems Engineer',
      company: 'TCS',
      location: 'Pune',
      ctc: '7 LPA',
      type: 'Full-time',
      workMode: 'Onsite',
      experienceLevel: 'Fresher',
      openings: 100,
      minCGPA: 6.0,
      deadline: farFutureDate.toISOString(),
      recruiterId: recruiterUid,
      recruiterName: 'Demo Recruiter',
      description: 'Entry-level engineering role. Training provided upon joining.',
      perks: ['Health Insurance', 'Transport'],
      branches: ['All'],
      status: 'open',
      createdAt: new Date().toISOString()
    },
    {
      title: 'Frontend Developer',
      company: 'Microsoft',
      location: 'Noida',
      ctc: '20 LPA',
      type: 'Full-time',
      workMode: 'Remote',
      experienceLevel: 'Fresher',
      openings: 8,
      minCGPA: 7.5,
      deadline: futureDate.toISOString(),
      recruiterId: recruiterUid,
      recruiterName: 'Demo Recruiter',
      description: 'Develop responsive, highly interactive user interfaces using React and modern CSS.',
      perks: ['Remote Work Stipend', 'Health Insurance', 'Gym Allowance'],
      branches: ['Computer Science', 'Information Technology'],
      status: 'open',
      createdAt: new Date().toISOString()
    },
    {
      title: 'Hardware Engineer',
      company: 'Intel',
      location: 'Bengaluru',
      ctc: '15 LPA',
      type: 'Full-time',
      workMode: 'Onsite',
      experienceLevel: 'Fresher',
      openings: 12,
      minCGPA: 7.0,
      deadline: farFutureDate.toISOString(),
      recruiterId: recruiterUid,
      recruiterName: 'Demo Recruiter',
      description: 'Design, test, and optimize microprocessors and embedded systems.',
      perks: ['Relocation Bonus', 'Stock Options'],
      branches: ['Electronics & Communication', 'Mechanical'],
      status: 'open',
      createdAt: new Date().toISOString()
    },
    {
      title: 'Structural Design Intern',
      company: 'L&T Construction',
      location: 'Chennai',
      ctc: '40k/month',
      type: 'Internship',
      workMode: 'Onsite',
      experienceLevel: 'Fresher',
      openings: 6,
      minCGPA: 6.5,
      deadline: futureDate.toISOString(),
      recruiterId: recruiterUid,
      recruiterName: 'Demo Recruiter',
      description: 'Assist in structural analysis and design of civil infrastructure projects.',
      perks: ['Stipend', 'Travel Allowance'],
      branches: ['Civil'],
      status: 'open',
      createdAt: new Date().toISOString()
    },
    {
      title: 'Business Analyst',
      company: 'Deloitte',
      location: 'Mumbai',
      ctc: '12 LPA',
      type: 'Full-time',
      workMode: 'Hybrid',
      experienceLevel: 'Fresher',
      openings: 25,
      minCGPA: 6.0,
      deadline: farFutureDate.toISOString(),
      recruiterId: recruiterUid,
      recruiterName: 'Demo Recruiter',
      description: 'Analyze business needs, document requirements, and coordinate with technical teams.',
      perks: ['Health Insurance', 'Performance Bonus'],
      branches: ['All'],
      status: 'open',
      createdAt: new Date().toISOString()
    },
    {
      title: 'Software Engineer, Core Systems',
      company: 'Apple',
      location: 'Hyderabad',
      ctc: '35 LPA',
      type: 'Full-time',
      workMode: 'Onsite',
      experienceLevel: 'Fresher',
      openings: 5,
      minCGPA: 8.5,
      deadline: futureDate.toISOString(),
      recruiterId: recruiterUid,
      recruiterName: 'Demo Recruiter',
      description: 'Work on low-level operating system components. Strong C/C++ required.',
      perks: ['Apple Products Discount', 'Stock Grants', 'Health Care'],
      branches: ['Computer Science', 'Electronics & Communication'],
      status: 'open',
      createdAt: new Date().toISOString()
    },
    {
      title: 'Machine Learning Engineer',
      company: 'Meta',
      location: 'Bengaluru',
      ctc: '42 LPA',
      type: 'Full-time',
      workMode: 'Hybrid',
      experienceLevel: 'Fresher',
      openings: 8,
      minCGPA: 8.0,
      deadline: futureDate.toISOString(),
      recruiterId: recruiterUid,
      recruiterName: 'Demo Recruiter',
      description: 'Build predictive models and scalable AI algorithms for billion-user products.',
      perks: ['Free Meals', 'Relocation Allowance', 'Unlimited PTO'],
      branches: ['Computer Science', 'Information Technology'],
      status: 'open',
      createdAt: new Date().toISOString()
    },
    {
      title: 'Quantitative Analyst',
      company: 'Goldman Sachs',
      location: 'Bengaluru',
      ctc: '30 LPA',
      type: 'Full-time',
      workMode: 'Hybrid',
      experienceLevel: 'Fresher',
      openings: 10,
      minCGPA: 8.0,
      deadline: farFutureDate.toISOString(),
      recruiterId: recruiterUid,
      recruiterName: 'Demo Recruiter',
      description: 'Develop mathematical models for algorithmic trading and risk management.',
      perks: ['Year-end Bonus', 'Comprehensive Health', 'Fitness Subsidy'],
      branches: ['Computer Science', 'Electronics & Communication', 'Mechanical'],
      status: 'open',
      createdAt: new Date().toISOString()
    },
    {
      title: 'Cloud Infrastructure Engineer',
      company: 'Netflix',
      location: 'Remote',
      ctc: '45 LPA',
      type: 'Full-time',
      workMode: 'Remote',
      experienceLevel: 'Fresher',
      openings: 3,
      minCGPA: 7.5,
      deadline: farFutureDate.toISOString(),
      recruiterId: recruiterUid,
      recruiterName: 'Demo Recruiter',
      description: 'Ensure 99.99% uptime for streaming infrastructure using AWS and Kubernetes.',
      perks: ['Top of Market Pay', 'Remote First', 'Open Vacation'],
      branches: ['Computer Science', 'Information Technology'],
      status: 'open',
      createdAt: new Date().toISOString()
    },
    {
      title: 'Management Consultant Analyst',
      company: 'McKinsey & Company',
      location: 'Gurugram',
      ctc: '22 LPA',
      type: 'Full-time',
      workMode: 'Onsite',
      experienceLevel: 'Fresher',
      openings: 15,
      minCGPA: 7.0,
      deadline: futureDate.toISOString(),
      recruiterId: recruiterUid,
      recruiterName: 'Demo Recruiter',
      description: 'Solve complex business problems for Fortune 500 clients. High travel required.',
      perks: ['Business Class Travel', 'Global Network', 'Performance Bonus'],
      branches: ['All'],
      status: 'open',
      createdAt: new Date().toISOString()
    },
    {
      title: 'Core Electronics Engineer',
      company: 'NVIDIA',
      location: 'Pune',
      ctc: '28 LPA',
      type: 'Full-time',
      workMode: 'Onsite',
      experienceLevel: 'Fresher',
      openings: 6,
      minCGPA: 7.5,
      deadline: farFutureDate.toISOString(),
      recruiterId: recruiterUid,
      recruiterName: 'Demo Recruiter',
      description: 'ASIC/FPGA design and verification for next-generation GPUs.',
      perks: ['ESPP', 'Health and Wellness', 'Education Reimbursement'],
      branches: ['Electronics & Communication'],
      status: 'open',
      createdAt: new Date().toISOString()
    },
    {
      title: 'Design Engineer',
      company: 'Boeing',
      location: 'Bengaluru',
      ctc: '14 LPA',
      type: 'Full-time',
      workMode: 'Onsite',
      experienceLevel: 'Fresher',
      openings: 10,
      minCGPA: 6.5,
      deadline: futureDate.toISOString(),
      recruiterId: recruiterUid,
      recruiterName: 'Demo Recruiter',
      description: 'Structural and aerodynamic analysis for commercial aerospace components.',
      perks: ['Relocation', 'Health Benefits'],
      branches: ['Mechanical', 'Civil'],
      status: 'open',
      createdAt: new Date().toISOString()
    }
  ];

  for (let i = 0; i < jobs.length; i++) {
    await db.collection('jobs').doc(`mock_job_${i}`).set(jobs[i]);
  }

  console.log('Creating mock alumni...');
  const mockAlumni = [];
  const companies = ['Google', 'Amazon', 'Microsoft', 'TCS', 'Infosys'];
  
  for (let i = 1; i <= 8; i++) {
    const fname = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lname = lastNames[Math.floor(Math.random() * lastNames.length)];
    const company = companies[Math.floor(Math.random() * companies.length)];
    
    mockAlumni.push({
      name: `${fname} ${lname}`,
      email: `${fname.toLowerCase()}.${lname.toLowerCase()}@alumni.demo.edu`,
      branch: branches[Math.floor(Math.random() * branches.length)],
      companyPlaced: company,
      bio: `Working at ${company}. Feel free to reach out for referrals or resume reviews!`,
      linkedin: `https://www.linkedin.com/in/${fname.toLowerCase()}-${lname.toLowerCase()}-${Math.floor(Math.random() * 10000)}/`,
      graduationYear: 2022 + Math.floor(Math.random() * 3),
      createdAt: new Date().toISOString()
    });
  }

  for (let i = 0; i < mockAlumni.length; i++) {
    await db.collection('alumni').doc(`mock_alumni_${i}`).set(mockAlumni[i]);
  }

  console.log('Creating mock applications and system activity...');
  const selectedApplication = {
    studentId: studentUid,
    studentName: 'Aarav Sharma',
    studentEmail: 'aarav.sharma1@demo.edu',
    jobId: 'mock_job_0',
    company: 'Amazon',
    role: 'Software Development Engineer I',
    status: 'Selected',
    appliedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  };
  await db.collection('applications').doc('mock_app_1').set(selectedApplication);

  const activities = [
    { type: 'job_posted', payload: { title: 'Backend Engineer', company: 'Google' }, createdAt: new Date().toISOString() },
    { type: 'application_submitted', payload: { company: 'Amazon' }, createdAt: new Date().toISOString() },
    { type: 'status_updated', payload: { newStatus: 'Selected' }, createdAt: new Date().toISOString() }
  ];
  for (let i = 0; i < activities.length; i++) {
    await db.collection('systemActivity').add(activities[i]);
  }

  console.log('✅ Seed process completed successfully!');
}

seed().catch(console.error).finally(() => process.exit(0));
