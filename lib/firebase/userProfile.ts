import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './config'

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * The user's manually-entered profile.
 * These fields are NEVER sourced from Google auth — always manually entered.
 */
export interface UserProfileData {
  name:           string  // manually entered full name (never from Google)
  employeeNumber: string  // optional, max 7 digits
  station:        string  // work center / مركز
}

// ─── localStorage (anonymous users) ──────────────────────────────────────────

const STORAGE_KEY = 'shiftex_profile'

/** Load profile from localStorage — used for anonymous users */
export function loadProfileFromLocal(): Partial<UserProfileData> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

/** Merge-save profile updates to localStorage */
export function saveProfileToLocal(updates: Partial<UserProfileData>): void {
  if (typeof window === 'undefined') return
  try {
    const existing = loadProfileFromLocal()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...updates }))
  } catch {}
}

// ─── Firestore (authenticated users) ─────────────────────────────────────────

/**
 * Load profile fields from Firestore.
 * We store them as `profileName`, `profileEmployeeNumber`, `profileStation`
 * to avoid collision with the Google auth `displayName` field.
 */
export async function loadProfileFromFirestore(uid: string): Promise<Partial<UserProfileData>> {
  try {
    const snap = await getDoc(doc(db, 'userProfiles', uid))
    if (!snap.exists()) return {}
    const d = snap.data()
    return {
      name:           d.profileName           ?? '',
      employeeNumber: d.profileEmployeeNumber ?? '',
      station:        d.profileStation        ?? '',
    }
  } catch { return {} }
}

/** Merge-save profile updates to Firestore */
export async function saveProfileToFirestore(
  uid:     string,
  updates: Partial<UserProfileData>,
): Promise<void> {
  const ref  = doc(db, 'userProfiles', uid)
  const snap = await getDoc(ref)

  const data: Record<string, string> = {}
  if (updates.name           !== undefined) data.profileName           = updates.name
  if (updates.employeeNumber !== undefined) data.profileEmployeeNumber = updates.employeeNumber
  if (updates.station        !== undefined) data.profileStation        = updates.station

  if (snap.exists()) {
    await updateDoc(ref, data)
  } else {
    // Document doesn't exist yet — create with safe defaults
    await setDoc(ref, { ...data, isAdmin: false })
  }
}

// ─── Unified public API ───────────────────────────────────────────────────────

/** Load the user's manually-entered profile (Firestore or localStorage). */
export async function loadUserProfile(
  uid:         string,
  isAnonymous: boolean,
): Promise<Partial<UserProfileData>> {
  return isAnonymous ? loadProfileFromLocal() : loadProfileFromFirestore(uid)
}

/** Save / merge updates into the user's profile (Firestore or localStorage). */
export async function saveUserProfile(
  uid:         string,
  isAnonymous: boolean,
  updates:     Partial<UserProfileData>,
): Promise<void> {
  if (isAnonymous) {
    saveProfileToLocal(updates)
  } else {
    await saveProfileToFirestore(uid, updates)
  }
}

/** Returns true when the profile has the required name and station fields. */
export function isProfileComplete(profile: Partial<UserProfileData>): boolean {
  return !!(profile.name?.trim() && profile.station?.trim())
}
