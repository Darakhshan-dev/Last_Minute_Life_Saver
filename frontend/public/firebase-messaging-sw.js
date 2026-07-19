importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDugliiFA5qLNMFz8C9bsjFglB8hK8XKpQ",
  authDomain: "gen-lang-client-09438188.firebaseapp.com",
  projectId: "gen-lang-client-09438188",
  storageBucket: "gen-lang-client-09438188.firebasestorage.app",
  messagingSenderId: "101176711301",
  appId: "1:101176711301:web:395b628fe4cdb75c2eb1ec",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message received:", payload);

  const title = payload.notification?.title || "Last-Minute Life Saver";
  const options = {
    body: payload.notification?.body || "You have an urgent task!",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: payload.data?.taskId || "lmls-notification",
    requireInteraction: true,
  };

  self.registration.showNotification(title, options);
});