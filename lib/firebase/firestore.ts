import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, onSnapshot,
  Timestamp, Query, DocumentData, deleteField,
} from 'firebase/firestore'
import { db } from './config'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ShiftType = 'day' | 'night' | 'overlap'
export type OfferStatus = 'in_progress' | 'selected' | 'confirmed'

export interface DayOff {
  date: string   // YYYY-MM-DD
  shift: ShiftType
}

export interface ReplacementDay {
  date: string   // YYYY-MM-DD
  shifts: ShiftType[]
}

export interface Offer {
  id?: string
  ownerUid: string
  ownerName: string
  ownerCode: string       // 6 digits — only returned to admin
  ownerStation: string
  status: OfferStatus
  offerMonth: string      // YYYY-MM
  daysOff: DayOff[]
  replacementDays: ReplacementDay[]
  selectorUid?: string
  selectorName?: string
  selectorCode?: string
  selectorStation?: string
  confirmedByName?: string
  confirmedByEmail?: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
  confirmedAt?: Timestamp
}

export interface Station {
  id?: string
  name: string
  active: boolean
  createdAt?: Timestamp
}

// ─── Offers ───────────────────────────────────────────────────────────────────

const offersCol = () => collection(db, 'offers')

/** Returns true if ALL daysOff dates are in the past — offer should be hidden */
function isExpired(offer: Offer): boolean {
  if (!offer.daysOff?.length) return false
  const today = new Date().toISOString().split('T')[0]
  return offer.daysOff.every(d => d.date < today)
}

/** Get all in_progress offers (for All Offers page) — expired ones are filtered out */
export async function getInProgressOffers(stationFilter?: string): Promise<Offer[]> {
  let q: Query<DocumentData> = query(
    offersCol(),
    where('status', '==', 'in_progress'),
    orderBy('createdAt', 'desc')
  )
  if (stationFilter) {
    q = query(
      offersCol(),
      where('status', '==', 'in_progress'),
      where('ownerStation', '==', stationFilter),
      orderBy('createdAt', 'desc')
    )
  }
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Offer))
    .filter(o => !isExpired(o))
}

/** Subscribe to in_progress offers in real-time */
export function subscribeToInProgressOffers(
  callback: (offers: Offer[]) => void,
  stationFilter?: string,
  monthFilter?: string
) {
  let q: Query<DocumentData> = query(
    offersCol(),
    where('status', '==', 'in_progress'),
    orderBy('createdAt', 'desc')
  )
  if (stationFilter) {
    q = query(
      offersCol(),
      where('status', '==', 'in_progress'),
      where('ownerStation', '==', stationFilter),
      orderBy('createdAt', 'desc')
    )
  }
  return onSnapshot(q, snap => {
    let offers = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as Offer))
      .filter(o => !isExpired(o))
    if (monthFilter) offers = offers.filter(o => o.offerMonth === monthFilter)
    callback(offers)
  })
}

/** Get offers created by a specific user (My Offers page) */
export async function getMyOffers(uid: string): Promise<Offer[]> {
  const q = query(offersCol(), where('ownerUid', '==', uid), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Offer))
}

/** Get offers selected by a specific user (Selected Offers page — includes confirmed) */
export async function getSelectedOffers(uid: string): Promise<Offer[]> {
  // Query by selectorUid only (no inequality filter) — avoids index/compat issues.
  // Client page renders both 'selected' (can cancel) and 'confirmed' (final) correctly.
  const q = query(
    offersCol(),
    where('selectorUid', '==', uid),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Offer))
}

/** Get single offer by ID */
export async function getOffer(id: string): Promise<Offer | null> {
  const snap = await getDoc(doc(db, 'offers', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Offer
}

/** Check if user already has an active offer for a given month */
export async function hasActiveOfferForMonth(uid: string, offerMonth: string): Promise<boolean> {
  const q = query(
    offersCol(),
    where('ownerUid', '==', uid),
    where('offerMonth', '==', offerMonth),
    where('status', 'in', ['in_progress', 'selected']),
    limit(1)
  )
  const snap = await getDocs(q)
  return !snap.empty
}

/** Return the first active offer a user has for a given month (or null if none) */
export async function getActiveOfferForMonth(uid: string, offerMonth: string): Promise<Offer | null> {
  const q = query(
    offersCol(),
    where('ownerUid', '==', uid),
    where('offerMonth', '==', offerMonth),
    where('status', 'in', ['in_progress', 'selected']),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Offer
}

/** Create a new offer */
export async function createOffer(offer: Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(offersCol(), {
    ...offer,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

/** Update an existing offer (owner edit) */
export async function updateOffer(id: string, updates: Partial<Offer>): Promise<void> {
  await updateDoc(doc(db, 'offers', id), {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

/** Delete an offer */
export async function deleteOffer(id: string): Promise<void> {
  await deleteDoc(doc(db, 'offers', id))
}

// ─── Admin Queries ────────────────────────────────────────────────────────────

/** Admin: get all offers with optional filters.
 *  Default (no status) returns 'selected' + 'confirmed'.
 *  All queries sort client-side — no composite index required.
 */
export async function getAllOffersAdmin(filters: {
  status?: OfferStatus
  station?: string
  month?: string
} = {}): Promise<Offer[]> {
  const conditions: ReturnType<typeof where>[] = []

  if (filters.status) {
    conditions.push(where('status', '==', filters.status))
  } else {
    // Default: show selected & confirmed (the ones that need admin attention)
    conditions.push(where('status', 'in', ['selected', 'confirmed']))
  }

  if (filters.station) conditions.push(where('ownerStation', '==', filters.station))
  if (filters.month)   conditions.push(where('offerMonth',   '==', filters.month))

  // No orderBy → no composite index needed; sort client-side instead
  const q = query(offersCol(), ...conditions)
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Offer))
    .sort((a, b) => {
      const ta = (a.createdAt as any)?.toMillis?.() ?? 0
      const tb = (b.createdAt as any)?.toMillis?.() ?? 0
      return tb - ta
    })
}

// ─── Stations ─────────────────────────────────────────────────────────────────

const stationsCol = () => collection(db, 'stations')

export async function getStations(activeOnly = true): Promise<Station[]> {
  let q: Query<DocumentData> = query(stationsCol(), orderBy('name'))
  if (activeOnly) {
    q = query(stationsCol(), where('active', '==', true), orderBy('name'))
  }
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Station))
}

export async function createStation(name: string): Promise<string> {
  const ref = await addDoc(stationsCol(), {
    name,
    active: true,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateStation(id: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'stations', id), { name })
}

export async function deleteStation(id: string): Promise<void> {
  await deleteDoc(doc(db, 'stations', id))
}

export async function toggleStation(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'stations', id), { active })
}

// ─── User Profiles (admin) ────────────────────────────────────────────────────

export interface UserProfile {
  uid: string
  displayName?: string
  email?: string
  photoURL?: string
  isAdmin: boolean
  createdAt?: Timestamp
}

/** Admin: fetch all user profiles (security rule allows admin to list this collection) */
export async function getAllUserProfiles(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, 'userProfiles'))
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile))
}

// ─── Matching ─────────────────────────────────────────────────────────────────

/** Fetch all in_progress offers for a given month (for match preview) */
export async function getOffersForMonth(offerMonth: string): Promise<Offer[]> {
  // No orderBy — avoids requiring a composite index on (status, offerMonth, createdAt).
  // Sort client-side instead.
  const q = query(
    offersCol(),
    where('status', '==', 'in_progress'),
    where('offerMonth', '==', offerMonth),
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Offer))
    .sort((a, b) => {
      const ta = (a.createdAt as any)?.toMillis?.() ?? 0
      const tb = (b.createdAt as any)?.toMillis?.() ?? 0
      return tb - ta
    })
}

/**
 * Compute match % between the user's draft offer and an existing offer.
 *
 * A date match between my أيام الطلب (daysOff) and their الأيام البديلة (replacementDays)
 * is the scoring gate. The percentage for each matched day is determined by shift compatibility:
 *
 *   - Same shift type          → 100%  (perfect)
 *   - 'overlap' covers day/night → 75%  (close)
 *   - day/night covers 'overlap' → 50%  (partial)
 *   - Date matches but shift incompatible → 0%
 *   - No date match at all       → 0%
 *
 * Overall score = average per-day score across all my requested days off.
 */
export function computeMatchScore(
  myDaysOff: DayOff[],
  myReplacementDays: ReplacementDay[],
  other: Offer
): number {
  function shiftScore(wanted: ShiftType, available: ShiftType[]): number {
    if (available.includes(wanted)) return 1                                          // exact match → 100%
    if (available.includes('overlap') && (wanted === 'day' || wanted === 'night')) return 0.75  // overlap covers day/night → 75%
    if (wanted === 'overlap' && (available.includes('day') || available.includes('night'))) return 0.5  // partial overlap → 50%
    return 0
  }

  const validMyDays = myDaysOff.filter(d => d.date)
  if (validMyDays.length === 0) return 0

  let total = 0
  for (const myDay of validMyDays) {
    const theirRep = other.replacementDays.find(r => r.date === myDay.date)
    // Date match is the gate; shift compatibility sets the per-day score
    total += theirRep ? shiftScore(myDay.shift, theirRep.shifts) : 0
  }

  return Math.round((total / validMyDays.length) * 100)
}

// ─── UID Migration ───────────────────────────────────────────────────────────

/**
 * Migrate all offers owned by oldUid to newUid.
 * Called after an anonymous user successfully signs in with Google
 * and their Google account already exists (so the UID changes).
 */
export async function migrateOffersToNewUid(oldUid: string, newUid: string): Promise<void> {
  const q = query(offersCol(), where('ownerUid', '==', oldUid))
  const snap = await getDocs(q)
  await Promise.all(
    snap.docs.map(d =>
      updateDoc(doc(db, 'offers', d.id), {
        ownerUid:  newUid,
        updatedAt: serverTimestamp(),
      })
    )
  )
}

// ─── User Profiles ────────────────────────────────────────────────────────────

export async function getUserProfile(uid: string) {
  const snap = await getDoc(doc(db, 'userProfiles', uid))
  return snap.exists() ? snap.data() : null
}

// ─── Direct client-side offer actions (no Cloud Functions needed) ─────────────

/** Selector picks an in_progress offer directly via Firestore */
export async function selectOfferDirect(
  offerId: string,
  selectorUid: string,
  selectorName: string,
  selectorCode: string,
  selectorStation: string,
): Promise<void> {
  await updateDoc(doc(db, 'offers', offerId), {
    status: 'selected',
    selectorUid,
    selectorName,
    selectorCode,
    selectorStation,
    updatedAt: serverTimestamp(),
  })
}

/** Selector cancels their own selection directly via Firestore */
export async function cancelSelectionDirect(offerId: string): Promise<void> {
  await updateDoc(doc(db, 'offers', offerId), {
    status:          'in_progress',
    selectorUid:     deleteField(),
    selectorName:    deleteField(),
    selectorCode:    deleteField(),
    selectorStation: deleteField(),
    updatedAt:       serverTimestamp(),
  })
}

/** Owner accepts selector's choice → confirmed (also stores the admin/owner who confirmed) */
export async function ownerAcceptOffer(
  offerId: string,
  confirmedByName?: string,
  confirmedByEmail?: string,
): Promise<void> {
  await updateDoc(doc(db, 'offers', offerId), {
    status:           'confirmed',
    confirmedAt:      serverTimestamp(),
    updatedAt:        serverTimestamp(),
    ...(confirmedByName  ? { confirmedByName }  : {}),
    ...(confirmedByEmail ? { confirmedByEmail } : {}),
  })
}

/** Owner rejects selector's choice → back to in_progress */
export async function ownerRejectOffer(offerId: string): Promise<void> {
  await updateDoc(doc(db, 'offers', offerId), {
    status:          'in_progress',
    selectorUid:     deleteField(),
    selectorName:    deleteField(),
    selectorCode:    deleteField(),
    selectorStation: deleteField(),
    updatedAt:       serverTimestamp(),
  })
}
