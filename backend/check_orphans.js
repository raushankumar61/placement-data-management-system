const { db, admin } = require('./config/firebase'); 
async function check() { 
  try { 
    const authUsers = await admin.auth().listUsers(); 
    const uids = new Set(authUsers.users.map(u => u.uid)); 
    const orphanedStudents = []; 
    const orphanedApps = []; 
    const authWithoutProfile = []; 

    // check for auth users without profiles 
    for (const u of authUsers.users) { 
      const inS = await db.collection('students').doc(u.uid).get(); 
      const inA = await db.collection('admins').doc(u.uid).get(); 
      const inR = await db.collection('recruiters').doc(u.uid).get(); 
      const inF = await db.collection('faculty').doc(u.uid).get(); 
      if (!inS.exists && !inA.exists && !inR.exists && !inF.exists) { 
        authWithoutProfile.push({ uid: u.uid, email: u.email }); 
      } 
    } 

    // check students without auth 
    const sSnap = await db.collection('students').get(); 
    sSnap.docs.forEach(d => { 
      if (!uids.has(d.id) && d.id !== 'admin_test') orphanedStudents.push({ id: d.id, name: d.data().name }); 
    }); 

    // check apps without valid job or valid student 
    const jSnap = await db.collection('jobs').get(); 
    const validJobIds = new Set(jSnap.docs.map(d => d.id)); 
    const validStudentIds = new Set(sSnap.docs.map(d => d.id)); 

    const aSnap = await db.collection('applications').get(); 
    aSnap.docs.forEach(d => { 
      const data = d.data(); 
      if (!validJobIds.has(data.jobId) || !validStudentIds.has(data.studentId)) { 
        orphanedApps.push({ id: d.id, jobId: data.jobId, studentId: data.studentId }); 
      } 
    }); 

    console.log(JSON.stringify({ authWithoutProfile, orphanedStudents, orphanedApps }, null, 2)); 
  } catch(e) { 
    console.error(e.message); 
  } 
  process.exit(0); 
} 
check();
