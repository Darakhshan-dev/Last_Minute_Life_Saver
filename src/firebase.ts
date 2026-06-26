import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configured dynamically from the provisioned Firebase project metadata
const firebaseConfig = {
  apiKey: "AIzaSyDzaXwAXn4szuTCoV15VSBHVf4pxyxmeco",
  authDomain: "gen-lang-client-0943848188.firebaseapp.com",
  projectId: "gen-lang-client-0943848188",
  storageBucket: "gen-lang-client-0943848188.firebasestorage.app",
  messagingSenderId: "714214369262",
  appId: "1:714214369262:web:e5eb960ff7ed426b4c90ff"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Add calendar scopes for Google Calendar operations
googleProvider.addScope("https://www.googleapis.com/auth/calendar");

// Targets the provisioned database ID specifically
export const db = getFirestore(app, "ai-studio-dc36cd4b-c934-454c-a7b2-297a0f4b0647");

// In-memory caching for Google OAuth access token
let cachedAccessToken: string | null = null;

export const getAccessToken = () => cachedAccessToken;
export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    return result.user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};

export const loginAnonymously = async () => {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error("Anonymous Sign-In Error:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    cachedAccessToken = null;
  } catch (error) {
    console.error("Logout Error:", error);
    throw error;
  }
};
