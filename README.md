# Last-Minute Life Saver

> An AI-powered productivity companion that proactively helps students and professionals plan, prioritize, and complete tasks before deadlines are missed.


## The Problem

Students, professionals, and entrepreneurs frequently miss deadlines, assignments, meetings, bill payments, interviews, and important commitments. Existing productivity tools rely on **passive reminders that are easy to ignore** and do little to help users actually complete their tasks.

---

## ✨ The Solution

Last-Minute Life Saver moves beyond traditional reminders by using **Google Gemini AI** to proactively analyze your workload, understand your calendar, and guide you toward completing tasks before it's too late — even when your browser tab is closed.

---

## 🎯 Key Features

### 🤖 AI-Powered Task Prioritization
- Gemini AI analyzes every task across multiple factors: deadline proximity, estimated effort, priority level, and category urgency
- Assigns a risk score (1–100) to each task with a human-readable reason
- Automatically flags tasks as `safe`, `at_risk`, `high_risk`, or `overdue`
- Recommends the single most important task to work on right now with a suggested focus session duration

### 📅 Google Calendar Integration
- Connect your Google Calendar with one click via OAuth
- Syncs upcoming events and identifies free work windows automatically
- AI Focus Plan avoids scheduling work during busy calendar slots
- Context-aware notifications suggest the best task to work on when a free window opens

### 🔔 Context-Aware Push Notifications (works even when tab is closed)
- **Calendar-aware nudges:** fires when a free work window starts, recommending the highest-priority task that fits
- **Deadline-risk nudges:** fires when Gemini flags a task as high-risk or overdue, using the AI's own reasoning as the notification text
- **Backend push scheduler:** runs server-side every 5 minutes via Firebase Cloud Messaging (FCM) — delivers real OS notifications to desktop and Android phones even when the app is fully closed
- **Service Worker:** background script that receives FCM messages and displays them as native notifications

### 🎙️ Voice-Enabled AI Chat
- Speak naturally to the AI coach using the browser's built-in Web Speech API
- Real-time speech-to-text conversion appears in the input field
- Zero extra APIs or packages — works natively in Chrome and Edge
- Same AI context (your tasks + calendar) powers every voice or typed query

### 📊 Daily AI Focus Plan
- Generates an hour-by-hour execution timeline for your day
- Incorporates real Google Calendar events as busy blocks
- Includes focus sessions, breaks, and buffer time
- Updates on demand with a single click

---

## 🛠️ Technologies Used

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and production builds
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Firebase SDK** for authentication and Firestore
- **Web Speech API** for voice input (built into browser)

### Backend
- **Node.js** with **Express.js**
- **TypeScript** compiled with `tsx`
- **Firebase Admin SDK** for server-side Firestore access
- **Google Gemini AI** (`gemini-2.5-flash`) for all AI features
- **Firebase Cloud Messaging (FCM)** for push notifications
- **Google Calendar API** for calendar sync

### Infrastructure & Services
- **Firebase Auth** — Google Sign-In
- **Cloud Firestore** — real-time database
- **Firebase Cloud Messaging** — push notification delivery
- **Render** — full-stack deployment (always-on via UptimeRobot)
- **UptimeRobot** — keep-alive monitoring

### Google Technologies
- Google Gemini AI (gemini-2.5-flash)
- Firebase Authentication
- Cloud Firestore
- Firebase Cloud Messaging (FCM)
- Google Calendar API
- Google OAuth 2.0

---

## 🏃 Running Locally

### Prerequisites
- Node.js 18+
- A Firebase project with Authentication and Firestore enabled
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com)
- Google Calendar API enabled in your Google Cloud project

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/Darakhshan-dev/Last_Minute_Life_Saver.git
cd Last_Minute_Life_Saver
```

2. **Install dependencies**
```bash
npm install
```

3. **Create a `.env` file** in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
TZ=Asia/Kolkata
```

4. **Add `service-account.json`** (Firebase Admin credentials) to the root directory — download from Firebase Console → Project Settings → Service Accounts

5. **Run the development server**
```bash
npm run dev
```

6. Open `http://localhost:3000`

---

## 🏗️ Project Structure

```
Last-Minute-Life-Saver/
├── frontend/
│   └── src/
│       ├── components/      # React UI components
│       │   ├── Dashboard.tsx
│       │   ├── AIChat.tsx   # Voice-enabled AI chat
│       │   ├── FocusPlan.tsx
│       │   └── ...
│       ├── context/         # Auth context
│       ├── hooks/
│       │   └── useFCMToken.ts  # FCM token registration
│       └── services/
│           ├── firebase.ts  # Firebase client config
│           └── api.ts       # Backend API calls
├── backend/
│   └── src/
│       ├── controllers/     # Express route handlers
│       ├── services/
│       │   ├── geminiService.ts        # All Gemini AI logic
│       │   ├── calendarService.ts      # Google Calendar sync
│       │   ├── pushNotificationService.ts  # FCM push scheduler
│       │   ├── firebaseAdmin.ts        # Firebase Admin SDK
│       │   └── firestoreService.ts     # Firestore CRUD
│       └── routes/
├── public/
│   └── firebase-messaging-sw.js  # Service Worker for push notifications
└── server.ts                     # Express + Vite unified server
```

---

## 🤖 How Gemini AI Is Used

| Feature | Gemini Role |
|---|---|
| Task Prioritization | Analyzes all tasks and assigns risk scores + reasons |
| Focus Plan | Generates hour-by-hour schedule avoiding calendar conflicts |
| AI Chat | Answers questions with full context of tasks + calendar |
| Subtask Generation | Breaks large tasks into actionable steps |
| Notifications | Risk classifications drive when notifications fire |

---
