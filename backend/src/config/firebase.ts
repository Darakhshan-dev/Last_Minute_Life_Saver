import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

// Dynamically resolve configuration from root directory
const rootConfigPath = path.resolve(process.cwd(), "firebase-applet-config.json");
let projectId = "gen-lang-client-0943848188";
let databaseId = "ai-studio-dc36cd4b-c934-454c-a7b2-297a0f4b0647";

try {
  if (fs.existsSync(rootConfigPath)) {
    const config = JSON.parse(fs.readFileSync(rootConfigPath, "utf-8"));
    if (config.projectId) projectId = config.projectId;
    if (config.databaseId) databaseId = config.databaseId;
    if (config.firestoreDatabaseId) databaseId = config.firestoreDatabaseId;
  }
} catch (err) {
  console.error("Error loading Firebase config:", err);
}

if (getApps().length === 0) {
  initializeApp({
    projectId: projectId,
  });
}

export const db = getFirestore(databaseId);
