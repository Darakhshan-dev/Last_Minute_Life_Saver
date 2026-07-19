import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

console.log("[Firebase Admin] File loaded. ENV present:", !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
console.log("[Firebase Admin] Apps already initialized:", getApps().length);

if (!getApps().length) {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  console.log("[Firebase Admin] Attempting to initialize...");
  if (!serviceAccountJson) {
    console.warn("[Firebase Admin] WARNING: FIREBASE_SERVICE_ACCOUNT_JSON not set.");
  } else {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      console.log("[Firebase Admin] JSON parsed successfully. Project:", serviceAccount.project_id);
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log("[Firebase Admin] Initialized successfully.");
    } catch (err) {
      console.error("[Firebase Admin] FAILED:", err);
    }
  }
} else {
  console.log("[Firebase Admin] Already initialized, skipping.");
}

export { getMessaging };