import {
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth'
import { auth } from './config'

const googleProvider = new GoogleAuthProvider()

/** Sign in anonymously — used for all regular (non-admin) users */
export async function signInAnon(): Promise<User> {
  const result = await signInAnonymously(auth)
  return result.user
}

/** Sign in with Google — admin login flow */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}

/** Sign out any user */
export async function logOut(): Promise<void> {
  await signOut(auth)
}

/** Check if current user has admin role via custom claims */
export async function isAdmin(): Promise<boolean> {
  const user = auth.currentUser
  if (!user) return false
  // Force refresh to get latest custom claims
  const token = await user.getIdTokenResult(true)
  return token.claims['role'] === 'admin'
}

/** Subscribe to auth changes */
export function onAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

/** Get current user UID, sign in anonymously if not logged in */
export async function ensureAnonymousAuth(): Promise<string> {
  if (auth.currentUser) return auth.currentUser.uid
  const user = await signInAnon()
  return user.uid
}
