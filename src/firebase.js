import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getAuth, signInAnonymously } from 'firebase/auth'

// ─── Firebase configuration ─────────────────────────────────
// Replace these placeholder values with your actual Firebase
// project config from the Firebase Console.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'YOUR_PROJECT.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://YOUR_PROJECT-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'YOUR_PROJECT',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'YOUR_PROJECT.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000000000000:web:0000000000000000000000',
}

// ─── Initialize ──────────────────────────────────────────────
const app = initializeApp(firebaseConfig)
const db = getDatabase(app)
const auth = getAuth(app)

let authPromise = null
const OPTIONAL_AUTH_ERROR_CODES = new Set([
  'auth/configuration-not-found',
  'auth/operation-not-allowed',
  'auth/admin-restricted-operation',
])

export function ensureFirebaseSession({ optional = true } = {}) {
  if (auth.currentUser) return Promise.resolve(auth.currentUser)
  if (!authPromise) {
    authPromise = signInAnonymously(auth)
      .then((credential) => credential.user)
      .catch((error) => {
        if (optional && OPTIONAL_AUTH_ERROR_CODES.has(error?.code)) {
          return null
        }
        throw error
      })
      .finally(() => {
        authPromise = null
      })
  }
  return authPromise
}

export { app, db, auth }
