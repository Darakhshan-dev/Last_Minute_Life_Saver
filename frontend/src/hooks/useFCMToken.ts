import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";

// Import messaging lazily to avoid errors in browsers that don't support it
let messagingInstance: any = null;

async function getMessagingInstance() {
  if (messagingInstance) return messagingInstance;
  try {
    const { getMessaging } = await import("firebase/messaging");
    const { app } = await import("../services/firebase");
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch {
    return null;
  }
}

const VAPID_KEY = "BA-6gbb3NdGl3u2v7VnGHkRcDZsLfk0SlHdJMYTOi3pyjf-xTIoMnGd-bcdPAbQdNtiG5UFxKrIef6n_jweVR5c"; // paste your Web Push certificate key pair here

export function useFCMToken(userId: string | null) {
  useEffect(() => {
    if (!userId) return;
    if (!("Notification" in window)) return;
    if (!("serviceWorker" in navigator)) return;

    const registerAndGetToken = async () => {
      try {
        // Register the service worker
       const registration = await navigator.serviceWorker.register(
  "/firebase-messaging-sw.js"
);
console.log("[FCM] Service worker registered:", registration.scope);

// Wait for service worker to become fully active before FCM subscribes
await navigator.serviceWorker.ready;
console.log("[FCM] Service worker is active and ready.");

        // Request notification permission if not already granted
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.warn("[FCM] Notification permission denied");
          return;
        }

        const messaging = await getMessagingInstance();
        if (!messaging) {
          console.warn("[FCM] Messaging not supported in this browser");
          return;
        }

        // Get FCM token
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (!token) {
          console.warn("[FCM] No FCM token received");
          return;
        }

        console.log("[FCM] Token obtained:", token.substring(0, 20) + "...");

        // Save token to Firestore under users/{uid}/fcmTokens/{token}
        await setDoc(
          doc(db, "users", userId, "fcmTokens", token),
          {
            token,
            createdAt: new Date().toISOString(),
            userAgent: navigator.userAgent,
          },
          { merge: true }
        );

        console.log("[FCM] Token saved to Firestore successfully.");

        // Handle foreground messages (when tab is open)
        onMessage(messaging, (payload) => {
          console.log("[FCM] Foreground message received:", payload);
          if (payload.notification) {
            new Notification(payload.notification.title || "Notification", {
              body: payload.notification.body || "",
            });
          }
        });
      } catch (err) {
        console.error("[FCM] Error setting up push notifications:", err);
      }
    };

    registerAndGetToken();
  }, [userId]);
}