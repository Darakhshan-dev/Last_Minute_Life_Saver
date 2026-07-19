import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  signInAnonymously
} from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDugliiFA5qLNMFz8C9bsjFglB8hK8XKpQ",
  authDomain: "gen-lang-client-09438188.firebaseapp.com",
  projectId: "gen-lang-client-09438188",
  storageBucket: "gen-lang-client-09438188.firebasestorage.app",
  messagingSenderId: "101176711301",
  appId: "1:101176711301:web:395b628fe4cdb75c2eb1ec",
  measurementId: "G-072JK8VBR1"
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.addScope("https://www.googleapis.com/auth/calendar.events.readonly");

export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true
  }
);

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

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};

export const loginAnonymously = async () => {
  try {
    const result = await signInAnonymously(auth);
    return { user: result.user, accessToken: null };
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

export const connectCalendarViaRedirect = async () => {
  await signInWithRedirect(auth, googleProvider);
};

export const getCalendarRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);

    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
      }

      return { user: result.user, accessToken: cachedAccessToken };
    }

    return null;
  } catch (error) {
    console.error("Calendar Redirect Result Error:", error);
    throw error;
  }
};