import { db } from "../config/firebase";
import { firestoreService } from "./firestoreService";

export async function startPushNotificationScheduler() {
  console.log("[Push Scheduler] Starting push notification scheduler...");

  const checkAndNotify = async () => {
    try {
      const now = new Date();

      const usersSnapshot = await db.collection("users").get();
      console.log(`[Push Scheduler] Checking ${usersSnapshot.docs.length} users...`);

      for (const userDoc of usersSnapshot.docs) {
        const uid = userDoc.id;

        try {
          const tokensSnapshot = await db
            .collection("users")
            .doc(uid)
            .collection("fcmTokens")
            .get();

          if (tokensSnapshot.empty) continue;

          const tokens = tokensSnapshot.docs.map((d: any) => d.data().token);

          const tasks = await firestoreService.getTasks(uid);
          const incompleteTasks = tasks.filter(
            (t: any) => !t.completed && t.status !== "completed"
          );

          if (incompleteTasks.length === 0) continue;

          for (const task of incompleteTasks) {
            const deadline = new Date(task.deadline);
            const hoursRemaining =
              (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

            let shouldNotify = false;
            let title = "";
            let body = "";

            if (hoursRemaining < 0) {
              shouldNotify = true;
              title = "⚠️ Task Overdue!";
              body = `"${task.title}" has passed its deadline. Take action now!`;
            } else if (hoursRemaining <= 2) {
              shouldNotify = true;
              title = "🔥 Deadline in 2 hours!";
              body = `"${task.title}" is due very soon. Focus on this now!`;
            } else if (hoursRemaining <= 24) {
              shouldNotify = true;
              title = "⏰ Deadline approaching!";
              body = `"${task.title}" is due in ${Math.round(hoursRemaining)} hours.`;
            }

            if (!shouldNotify) continue;

            const notifKey = `${uid}_${task.id}_${
              hoursRemaining < 0
                ? "overdue"
                : hoursRemaining <= 2
                ? "2h"
                : "24h"
            }`;
            const notifRef = db.collection("_pushNotifLog").doc(notifKey);
            const notifDoc = await notifRef.get();
            if (notifDoc.exists) continue;

           let accessToken: string | null = null;
try {
  const { GoogleAuth } = require("google-auth-library");
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  let credentials;
  if (serviceAccountJson) {
    credentials = JSON.parse(serviceAccountJson);
  } else {
    const fs = require("fs");
    const path = require("path");
    const filePath = path.resolve(process.cwd(), "service-account.json");
    credentials = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });
  const client = await auth.getClient();
  const tokenResult = await client.getAccessToken();
  accessToken = tokenResult.token;
} catch (tokenErr: any) {
  console.error(
    "[Push Scheduler] Failed to get access token:",
    tokenErr.message
  );
  continue;
}
            if (!accessToken) continue;

            for (const token of tokens) {
              try {
                // Use FCM v1 REST API directly
                const response = await fetch(
                  `https://fcm.googleapis.com/v1/projects/gen-lang-client-09438188/messages:send`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      message: {
                        token,
                        notification: { title, body },
                        data: {
                          taskId: task.id || "",
                          type:
                            hoursRemaining < 0 ? "overdue" : "approaching",
                        },
                        webpush: {
                          notification: {
                            title,
                            body,
                            requireInteraction: "true",
                            icon: "/favicon.ico",
                          },
                          fcm_options: { link: "/" },
                        },
                      },
                    }),
                  }
                );

                if (response.ok) {
                  console.log(
                    `[Push Scheduler] ✅ Sent to uid:${uid} task:"${task.title}"`
                  );
                } else {
                  const errBody = await response.text();
                  console.error("[Push Scheduler] FCM API error:", errBody);
                }
              } catch (sendErr: any) {
                console.error(
                  "[Push Scheduler] Send error:",
                  sendErr.message
                );
              }
            }

            await notifRef.set({
              notifiedAt: now.toISOString(),
              taskId: task.id,
              uid,
            });
          }
        } catch (userErr) {
          console.error(`[Push Scheduler] Error for uid:${uid}:`, userErr);
        }
      }
      console.log("[Push Scheduler] Check complete.");
    } catch (err) {
      console.error("[Push Scheduler] Scheduler error:", err);
    }
  };

  await checkAndNotify();
setInterval(checkAndNotify, 5 * 60 * 1000);
  console.log("[Push Scheduler] Scheduler running — checking every 5 minutes.");
}