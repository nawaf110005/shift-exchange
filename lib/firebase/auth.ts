import {
  signInWithPopup,
  signInAnonymously as _signInAnonymously,
  linkWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './config'

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

<<<<<<< HEAD
// ─── localStorage UID cache (SSR-safe) ───────────────────────────────────────

function saveUid(uid: string) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem('uid', uid) } catch {}
}

function clearUid() {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem('uid') } catch {}
}

/**
 * Returns the last known UID from localStorage.
 * Pages use this to avoid showing a spinner on refresh when a user is already logged in.
 */
export function getCachedUid(): string | null {
  if (typeof window === 'undefined') return null
  try { return localStorage.getItem('uid') } catch { return null }
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Ensure the user is at least anonymously signed in.
 * Only creates a new anonymous session if there is truly no current user.
=======
/**
 * Ensure the user is at least anonymously signed in.
 * Called on app load — lets guests create offers without registering.
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
 */
export async function ensureAnonymousAuth(): Promise<void> {
  if (!auth.currentUser) {
    await _signInAnonymously(auth)
  }
}

/**
 * Sign in / upgrade to Google.
 *
 * - Anonymous user → links the anonymous account to Google (same UID, no migration needed).
 * - If that Google account already exists → falls back to normal sign-in and
 *   batch-migrates all offers from the old anonymous UID to the Google UID.
 * - Non-anonymous user → regular signInWithPopup.
 */
export async function signInWithGoogle(): Promise<User> {
  const currentUser  = auth.currentUser
  const anonymousUid = currentUser?.isAnonymous ? currentUser.uid : null

  let user: User

  if (currentUser?.isAnonymous) {
    try {
<<<<<<< HEAD
      // Happy path: link anonymous → Google (UID stays the same)
=======
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
      const result = await linkWithPopup(currentUser, googleProvider)
      user = result.user
    } catch (err: any) {
      const linkable = ['auth/credential-already-in-use', 'auth/email-already-in-use']
      if (linkable.includes(err.code)) {
<<<<<<< HEAD
        // Google account already exists — sign in normally then migrate offers
=======
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
        const credential = GoogleAuthProvider.credentialFromError(err)
        if (!credential) throw err
        const result = await signInWithCredential(auth, credential)
        user = result.user
<<<<<<< HEAD
        // Move offers from the old anonymous UID to the real Google UID
=======
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
        if (anonymousUid && anonymousUid !== user.uid) {
          const { migrateOffersToNewUid } = await import('./firestore')
          await migrateOffersToNewUid(anonymousUid, user.uid)
        }
      } else {
        throw err
      }
    }
  } else {
    const result = await signInWithPopup(auth, googleProvider)
    user = result.user
  }

<<<<<<< HEAD
  // Persist UID as stable token immediately
  saveUid(user.uid)

  // Upsert userProfile document
=======
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
  const ref  = doc(db, 'userProfiles', user.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: user.displayName,
      email:       user.email,
      photoURL:    user.photoURL,
      isAdmin:     false,
      createdAt:   serverTimestamp(),
    })
  }

  return user
}

/**
<<<<<<< HEAD
 * Sign out and clear the cached UID.
 * Re-initialises an anonymous session so the user can still browse.
 */
export async function logOut(): Promise<void> {
  clearUid()
  await signOut(auth)
  // Create a fresh anonymous session — don't let the app hang on null auth
  try { await _signInAnonymously(auth) } catch {}
=======
 * Sign out, then re-initialise an anonymous session so the user is never
 * fully unauthenticated (they can still browse and create draft offers).
 */
export async function logOut(): Promise<void> {
  await signOut(auth)
  await _signInAnonymously(auth)
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
}

/**
 * Check if the current user is admin (anonymous users are never admin).
 */
export async function isAdmin(): Promise<boolean> {
  const user = auth.currentUser
  if (!user || user.isAnonymous) return false
<<<<<<< HEAD
  try {
    const snap = await getDoc(doc(db, 'userProfiles', user.uid))
    return snap.exists() && snap.data()?.isAdmin === true
  } catch {
    return false
  }
}

/**
 * Subscribe to auth state changes.
 * Also keeps localStorage UID in sync as a stable token.
 */
export function onAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    if (user) saveUid(user.uid)
    else clearUid()
    callback(user)
  })
=======
  const snap = await getDoc(doc(db, 'userProfiles', user.uid))
  return snap.exists() && snap.data()?.isAdmin === true
}

/** Subscribe to auth state changes */
export function onAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
}

/** Get current user synchronously */
export function getCurrentUser(): User | null {
  return auth.currentUser
}
