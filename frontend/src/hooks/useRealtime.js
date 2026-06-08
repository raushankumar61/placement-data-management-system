import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

export function useRealtimeJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db) {
      setError(new Error('Firestore is not initialized.'));
      setLoading(false);
      return undefined;
    }
    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setJobs(jobsData);
      setError(null);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching jobs in realtime:", error);
      setError(error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { jobs, loading, error };
}

export function useRealtimeApplications({ studentId, jobId, recruiterId } = {}) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!db) {
      setError(new Error('Firestore is not initialized.'));
      setLoading(false);
      return undefined;
    }
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
      setError(null);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching applications in realtime:", error);
      setError(error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [studentId, jobId, recruiterId]);

  return { applications, loading, error };
}
