// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../services/firebase';
import { syncClaims } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (uid) => {
    try {
      const docRef = doc(db, 'users', uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setUserProfile(data);
        setRole(data.role);
        return data;
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchUserProfile(firebaseUser.uid);
      } else {
        setUser(null);
        setUserProfile(null);
        setRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const profile = await fetchUserProfile(result.user.uid);

    // Sync role to custom claims and refresh the token so the role
    // is available immediately in all subsequent API requests.
    try {
      await syncClaims();
      await result.user.getIdToken(/* forceRefresh= */ true);
    } catch (e) {
      console.warn('syncClaims after login failed:', e.message);
    }

    return { user: result.user, profile };
  };

  const loginWithGoogle = async (selectedRole = 'student') => {
    const result = await signInWithPopup(auth, googleProvider);
    const uid = result.user.uid;
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, {
        name: result.user.displayName,
        email: result.user.email,
        role: selectedRole,
        createdAt: serverTimestamp(),
        photoURL: result.user.photoURL,
      });
    }
    const profile = await fetchUserProfile(uid);

    // Sync role to custom claims then refresh token
    try {
      await syncClaims();
      await result.user.getIdToken(/* forceRefresh= */ true);
    } catch (e) {
      console.warn('syncClaims after Google login failed:', e.message);
    }

    return { user: result.user, profile };
  };

  const register = async ({ name, email, password, role: userRole, department }) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: name });
    const docRef = doc(db, 'users', result.user.uid);
    const userData = {
      name,
      email,
      role: userRole,
      department: department || '',
      createdAt: serverTimestamp(),
    };
    await setDoc(docRef, userData);

    // Create role-specific doc
    if (userRole === 'student') {
      await setDoc(doc(db, 'students', result.user.uid), {
        name,
        email,
        phone: '',
        rollNo: '',
        usn: '',
        cgpa: 0,
        branch: department || '',
        skills: [],
        bio: '',
        linkedin: '',
        github: '',
        projects: [],
        certificationLinks: [],
        resumeURL: '',
        placementReadinessScore: 0,
        placementStatus: 'unplaced',
        companyPlaced: '',
        currentPackage: '',
        highestPackage: '',
        offersCount: 0,
        offerCompanies: [],
        interviewExperience: '',
        improvementSuggestions: [],
        address: '',
        dateOfBirth: '',
        gender: '',
        graduationYear: '',
        tenthPercentage: '',
        twelfthPercentage: '',
        backlogCount: 0,
        createdAt: serverTimestamp(),
      });
    } else if (userRole === 'recruiter') {
      await setDoc(doc(db, 'recruiters', result.user.uid), {
        companyName: '',
        contactEmail: email,
        verified: false,
        createdAt: serverTimestamp(),
      });
    }

    const profile = await fetchUserProfile(result.user.uid);

    // Sync role to custom claims then refresh token so the next API
    // call carries the role in the Bearer token's payload.
    try {
      await syncClaims();
      await result.user.getIdToken(/* forceRefresh= */ true);
    } catch (e) {
      console.warn('syncClaims after register failed:', e.message);
    }

    return { user: result.user, profile };
  };

  const logout = () => signOut(auth);

  const refreshProfile = () => user && fetchUserProfile(user.uid);

  return (
    <AuthContext.Provider value={{
      user, userProfile, role, loading,
      login, loginWithGoogle, register, logout, refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
