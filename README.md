# NIT Goa RideShare

Campus ride pooling app for NIT Goa — built with Next.js, Firebase, and Tailwind CSS.

---

## Features
- Google sign-in restricted to @nitgoa.ac.in accounts
- Post and browse rides with real-time updates
- Search rides by From / To location
- Request seats — driver gets Accept / Reject controls
- In-app real-time messaging between riders and drivers
- Route alerts — get notified when a matching ride is posted
- Driver email shared only after acceptance

---

## Setup (StackBlitz → GitHub → Vercel)

### 1. Firebase project
1. Go to https://console.firebase.google.com
2. Create project → name it `nitgoa-rideshare`
3. **Authentication** → Sign-in method → Enable **Google**
4. **Firestore Database** → Create database → Start in **test mode**
5. **Project Settings** → Your apps → Add web app → copy the config values

### 2. Paste code into StackBlitz
1. Go to https://stackblitz.com → New project → Next.js
2. Replace each file with the files in this repo
3. Create a `.env.local` file (copy `.env.example`) and paste your Firebase values

### 3. Push to GitHub
In StackBlitz: GitHub icon → Connect to GitHub → Fork to GitHub

### 4. Deploy to Vercel
1. Go to https://vercel.com → Add New Project → Import your GitHub repo
2. Settings → Environment Variables → add all 6 `NEXT_PUBLIC_FIREBASE_*` keys
3. Deploy → your app is live at `your-app.vercel.app`

### 5. Apply Firestore security rules
In Firebase Console → Firestore → Rules tab → paste the contents of `firestore.rules` → Publish

---

## File structure
```
app/
  layout.js        — root HTML layout
  page.js          — main dashboard (all tabs wired together)
  globals.css      — Tailwind + shared component classes
components/
  AuthProvider.js  — Firebase auth context
  SignIn.js        — Google sign-in screen
  Topbar.js        — nav bar with tab switching
  Browse.js        — ride search and listing
  PostRide.js      — post a new ride form
  Messages.js      — real-time inbox and chat
  Alerts.js        — route alert management
  MyRides.js       — posted rides + accept/reject requests
lib/
  firebase.js      — all Firebase helpers (auth, rides, messages, alerts)
firestore.rules    — security rules (deploy in Firebase Console)
.env.example       — environment variable template
```
