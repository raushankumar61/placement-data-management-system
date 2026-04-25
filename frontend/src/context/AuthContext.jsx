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
import { syncClaims, getMyRecruiterProfile, verifyToken as verifySessionToken } from '../services/api';
import { fillStudentDefaults } from '../utils/studentDefaults';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  const applyResolvedSession = (profile, fallbackRole = null) => {
    if (profile) {
      setUserProfile(profile);
      setRole(profile.role || fallbackRole || null);
      return profile;
    }

    setUserProfile(null);
    setRole(fallbackRole || null);
    return null;
  };

  const fetchUserProfile = async (firebaseUser) => {
    if (!firebaseUser?.uid) {
      return applyResolvedSession(null);
    }

    const tokenPromise = firebaseUser.getIdTokenResult().catch((err) => {
      console.warn('Unable to read token claims:', err);
      return null;
    });

    const userDocPromise = getDoc(doc(db, 'users', firebaseUser.uid)).catch((err) => {
      console.error('Error fetching profile:', err);
      return null;
    });

    const [tokenResult, userSnap] = await Promise.all([tokenPromise, userDocPromise]);
    const fallbackRole = tokenResult?.claims?.role || null;

    if (userSnap?.exists()) {
      const data = userSnap.data();
      const merged = { ...data };
      const resolved = applyResolvedSession(merged, fallbackRole);

      if (data.role === 'recruiter') {
        getMyRecruiterProfile()
          .then(({ data: recruiterProfile }) => {
            if (recruiterProfile) {
              setUserProfile((current) => ({ ...current, ...recruiterProfile }));
            }
          })
          .catch(() => {
            // Recruiter profile enrichment is best-effort; keep the session usable.
          });
      }

      return resolved;
    }

    try {
      const { data } = await verifySessionToken();
      if (data?.profile || data?.role) {
        const merged = data.profile || {
          uid: data.uid || firebaseUser.uid,
          email: data.email || firebaseUser.email || '',
          role: data.role || fallbackRole || null,
        };
        return applyResolvedSession(merged, data.role || fallbackRole);
      }
    } catch (err) {
      console.warn('Backend session verification failed:', err);
    }

    // Final fallback: keep the user signed in if we at least know the role
    // from token claims, instead of bouncing them back to /login.
    if (fallbackRole) {
      return applyResolvedSession({
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || '',
        role: fallbackRole,
      }, fallbackRole);
    }

    return applyResolvedSession(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchUserProfile(firebaseUser);
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
    console.log('[AuthContext] login() called for:', email);
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log('[AuthContext] Firebase auth passed. Fetching profile...');
    const profile = await fetchUserProfile(result.user);

    // Sync role to custom claims and refresh the token so the role
    // is available immediately in all subsequent API requests.
    try {
      console.log('[AuthContext] Calling backend syncClaims()...');
      await syncClaims();
      console.log('[AuthContext] syncClaims() successful. Refreshing token...');
      await result.user.getIdToken(/* forceRefresh= */ true);
      console.log('[AuthContext] Token refreshed successfully.');
    } catch (e) {
      console.error('[AuthContext ERROR] syncClaims API call failed:', e);
      // NOTE: We don't throw here so login still completes, but backend might reject further calls.
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

    const profile = await fetchUserProfile(result.user);

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

    const profile = await fetchUserProfile(result.user);

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

  const refreshProfile = () => user && fetchUserProfile(user);

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
