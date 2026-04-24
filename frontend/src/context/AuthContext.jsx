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
import { fillStudentDefaults } from '../utils/studentDefaults';

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

    // ⚠️ FIX: Only create document on FIRST sign-up.
    // On subsequent logins the existing role must NOT be overwritten.
    if (!snap.exists()) {
      await setDoc(docRef, {
        name: result.user.displayName,
        email: result.user.email,
        role: selectedRole,       // role is only set once at registration
        createdAt: serverTimestamp(),
        photoURL: result.user.photoURL,
      });
    }
    // If doc exists, leave it untouched — preserving the stored role.

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
      await setDoc(doc(db, 'students', result.user.uid), fillStudentDefaults({
        name,
        email,
        branch: department || '',
        createdAt: serverTimestamp(),
      }, result.user.uid));
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
