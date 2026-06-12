import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  where,
  getDocs,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const auth = getAuth(app)
export const db = getFirestore(app)

// ── Auth ────────────────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ hd: 'nitgoa.ac.in' })
  const result = await signInWithPopup(auth, provider)
  const email = result.user.email ?? ''
  if (!email.endsWith('@nitgoa.ac.in')) {
    await signOut(auth)
    throw new Error('Only @nitgoa.ac.in accounts are allowed.')
  }
  return result.user
}

export async function logOut() {
  await signOut(auth)
}

// ── Rides ───────────────────────────────────────────────────────────────────

export async function postRide(data) {
  return addDoc(collection(db, 'rides'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

export function subscribeRides(callback) {
  const q = query(collection(db, 'rides'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  )
}

export async function deleteRide(rideId) {
  await deleteDoc(doc(db, 'rides', rideId))
}

// ── Requests ─────────────────────────────────────────────────────────────────

export async function sendRequest(rideId, requester) {
  return addDoc(collection(db, 'rides', rideId, 'requests'), {
    ...requester,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
}

export function subscribeRequests(rideId, callback) {
  const q = query(
    collection(db, 'rides', rideId, 'requests'),
    orderBy('createdAt', 'asc')
  )
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  )
}

export async function updateRequestStatus(rideId, requestId, status) {
  await updateDoc(doc(db, 'rides', rideId, 'requests', requestId), { status })
}

// ── Messages ─────────────────────────────────────────────────────────────────

export function convoId(emailA, emailB) {
  return [emailA, emailB].sort().join('__')
}

export async function sendMessage(cid, from, text) {
  return addDoc(collection(db, 'conversations', cid, 'messages'), {
    from,
    text,
    createdAt: serverTimestamp(),
  })
}

export function subscribeMessages(cid, callback) {
  const q = query(
    collection(db, 'conversations', cid, 'messages'),
    orderBy('createdAt', 'asc')
  )
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  )
}

export function subscribeConversations(userEmail, callback) {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userEmail)
  )
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  )
}

export async function ensureConversation(cid, emailA, emailB, rideRoute) {
  const ref = doc(db, 'conversations', cid)
  const existing = await getDocs(
    query(collection(db, 'conversations'), where('__name__', '==', cid))
  )
  if (existing.empty) {
    const { setDoc } = await import('firebase/firestore')
    await setDoc(ref, {
      participants: [emailA, emailB],
      rideRoute,
      updatedAt: serverTimestamp(),
      lastMessage: '',
    })
  }
  return ref
}

// ── Alerts ───────────────────────────────────────────────────────────────────

export async function saveAlert(userEmail, alertData) {
  return addDoc(collection(db, 'users', userEmail, 'alerts'), {
    ...alertData,
    createdAt: serverTimestamp(),
  })
}

export function subscribeAlerts(userEmail, callback) {
  const q = query(collection(db, 'users', userEmail, 'alerts'))
  return onSnapshot(q, (snap) =>
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  )
}

export async function deleteAlert(userEmail, alertId) {
  await deleteDoc(doc(db, 'users', userEmail, 'alerts', alertId))
}

// ── Email alert trigger ───────────────────────────────────────────────────────

export async function triggerEmailAlerts(ride) {
  try {
    // Get all users who have alerts matching this ride
    const { getDocs, collection, query } = await import('firebase/firestore')
    const usersSnap = await getDocs(collection(db, 'users'))

    for (const userDoc of usersSnap.docs) {
      const userEmail = userDoc.id
      if (userEmail === ride.posterEmail) continue // skip poster

      const alertsSnap = await getDocs(collection(db, 'users', userEmail, 'alerts'))
      for (const alertDoc of alertsSnap.docs) {
        const a = alertDoc.data()
        const fm = !a.from || ride.from.toLowerCase().includes(a.from.toLowerCase())
        const tm = !a.to   || ride.to.toLowerCase().includes(a.to.toLowerCase())

        if (fm && tm) {
          // Send email notification
          await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to:         userEmail,
              rideFrom:   ride.from,
              rideTo:     ride.to,
              posterName: ride.posterName,
              time:       ride.time,
              date:       ride.date,
            })
          })
        }
      }
    }
  } catch (e) {
    console.error('Email alert error:', e)
  }
}
