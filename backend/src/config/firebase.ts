import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

if (getApps().length === 0) {
  // Try service account from env first, then fall back to JSON file
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      initializeApp({
        credential: cert(serviceAccount),
        projectId: "gen-lang-client-09438188",
      });
      console.log("[Firebase Config] Initialized with env service account.");
    } catch (err) {
      console.error("[Firebase Config] Failed to parse env service account:", err);
    }
  } else {
    // Try to find the service account JSON file directly
    const possiblePaths = [
      path.resolve(process.cwd(), "service-account.json"),
      path.resolve(process.cwd(), "backend", "service-account.json"),
    ];
    
    let initialized = false;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        try {
          const serviceAccount = JSON.parse(fs.readFileSync(p, "utf-8"));
          initializeApp({
            credential: cert(serviceAccount),
            projectId: "gen-lang-client-09438188",
          });
          console.log("[Firebase Config] Initialized with file service account:", p);
          initialized = true;
          break;
        } catch (err) {
          console.error("[Firebase Config] Failed to load service account file:", err);
        }
      }
    }
    
    if (!initialized) {
      console.warn("[Firebase Config] No credentials found — Firestore will fail.");
      initializeApp({ projectId: "gen-lang-client-09438188" });
    }
  }
}

export const db = getFirestore();