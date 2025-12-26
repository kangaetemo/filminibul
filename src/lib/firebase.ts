import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User,
    Auth,
} from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

// Check if Firebase is properly configured
const isConfigured = firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isConfigured) {
    // Initialize Firebase (prevent duplicate initialization)
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
}

/**
 * Sign in with Google popup
 */
export async function signInWithGoogle(): Promise<User | null> {
    if (!auth || !googleProvider) {
        console.warn("Firebase not configured. Add NEXT_PUBLIC_FIREBASE_* env variables.");
        return null;
    }

    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Error signing in with Google:", error);
        return null;
    }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
    if (!auth) return;

    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error("Error signing out:", error);
    }
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
    if (!auth) {
        // Return no-op cleanup function if Firebase not configured
        callback(null);
        return () => { };
    }
    return onAuthStateChanged(auth, callback);
}

export { auth };
export type { User };
