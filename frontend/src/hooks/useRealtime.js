import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

export function useRealtimeJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJobs(jobsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching jobs in realtime:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { jobs, loading };
}

export function useRealtimeApplications({ studentId, jobId, recruiterId } = {}) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) return;
    let q = collection(db, 'applications');
    const constraints = [];
    
    if (studentId) constraints.push(where('studentId', '==', studentId));
    if (jobId) constraints.push(where('jobId', '==', jobId));
    if (recruiterId) constraints.push(where('recruiterId', '==', recruiterId));
    
    if (constraints.length > 0) {
      q = query(q, ...constraints);
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Optional: Sort manually here if we didn't add an index for `studentId` + `createdAt`
      appsData.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setApplications(appsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching applications in realtime:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [studentId, jobId]);

  return { applications, loading };
}
