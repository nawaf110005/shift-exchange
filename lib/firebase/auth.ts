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

/**
 * Ensure the user is at least anonymously signed in.
 * Called on app load — lets guests create offers without registering.
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
      const result = await linkWithPopup(currentUser, googleProvider)
      user = result.user
    } catch (err: any) {
      const linkable = ['auth/credential-already-in-use', 'auth/email-already-in-use']
      if (linkable.includes(err.code)) {
        const credential = GoogleAuthProvider.credentialFromError(err)
        if (!credential) throw err
        const result = await signInWithCredential(auth, credential)
        user = result.user
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
 * Sign out, then re-initialise an anonymous session so the user is never
 * fully unauthenticated (they can still browse and create draft offers).
 */
export async function logOut(): Promise<void> {
  await signOut(auth)
  await _signInAnonymously(auth)
}

/**
 * Check if the current user is admin (anonymous users are never admin).
 */
export async function isAdmin(): Promise<boolean> {
  const user = auth.currentUser
  if (!user || user.isAnonymous) return false
  const snap = await getDoc(doc(db, 'userProfiles', user.uid))
  return snap.exists() && snap.data()?.isAdmin === true
}

/** Subscribe to auth state changes */
export function onAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

/** Get current user synchronously */
export function getCurrentUser(): User | null {
  return auth.currentUser
}
