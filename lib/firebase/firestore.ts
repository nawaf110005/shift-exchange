import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, onSnapshot,
  Timestamp, Query, DocumentData, deleteField,
} from 'firebase/firestore'
import { db } from './config'

export type ShiftType = 'day' | 'night' | 'overlap'
export type OfferStatus = 'in_progress' | 'selected' | 'confirmed'

export interface DayOff {
  date: string
  shift: ShiftType
}

export interface ReplacementDay {
  date: string
  shifts: ShiftType[]
}

export interface Offer {
  id?: string
  ownerUid: string
  ownerName: string
  ownerCode: string
  ownerStation: string
  status: OfferStatus
  offerMonth: string
  daysOff: DayOff[]
  replacementDays: ReplacementDay[]
  selectorUid?: string
  selectorName?: string
  selectorCode?: string
  selectorStation?: string
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

const offersCol = () => collection(db, 'offers')

function isExpired(offer: Offer): boolean {
  if (!offer.daysOff?.length) return false
  const today = new Date().toISOString().split('T')[0]
  return offer.daysOff.every(d => d.date < today)
}

export async function getInProgressOffers(stationFilter?: string): Promise<Offer[]> {
  let q: Query<DocumentData> = query(offersCol(), where('status', '==', 'in_progress'), orderBy('createdAt', 'desc'))
  if (stationFilter) q = query(offersCol(), where('status', '==', 'in_progress'), where('ownerStation', '==', stationFilter), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Offer)).filter(o => !isExpired(o))
}

export function subscribeToInProgressOffers(callback: (offers: Offer[]) => void, stationFilter?: string, monthFilter?: string) {
  let q: Query<DocumentData> = query(offersCol(), where('status', '==', 'in_progress'), orderBy('createdAt', 'desc'))
  if (stationFilter) q = query(offersCol(), where('status', '==', 'in_progress'), where('ownerStation', '==', stationFilter), orderBy('createdAt', 'desc'))
  return onSnapshot(q, snap => {
    let offers = snap.docs.map(d => ({ id: d.id, ...d.data() } as Offer)).filter(o => !isExpired(o))
    if (monthFilter) offers = offers.filter(o => o.offerMonth === monthFilter)
    callback(offers)
  })
}

export async function getMyOffers(uid: string): Promise<Offer[]> {
  const q = query(offersCol(), where('ownerUid', '==', uid), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Offer))
}

export async function getSelectedOffers(uid: string): Promise<Offer[]> {
  const q = query(offersCol(), where('selectorUid', '==', uid), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Offer))
}

export async function getOffer(id: string): Promise<Offer | null> {
  const snap = await getDoc(doc(db, 'offers', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Offer
}

export async function hasActiveOfferForMonth(uid: string, offerMonth: string): Promise<boolean> {
  const q = query(offersCol(), where('ownerUid', '==', uid), where('offerMonth', '==', offerMonth), where('status', 'in', ['in_progress', 'selected']), limit(1))
  const snap = await getDocs(q)
  return !snap.empty
}

export async function createOffer(offer: Omit<Offer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(offersCol(), { ...offer, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  return ref.id
}

export async function updateOffer(id: string, updates: Partial<Offer>): Promise<void> {
  await updateDoc(doc(db, 'offers', id), { ...updates, updatedAt: serverTimestamp() })
}

export async function deleteOffer(id: string): Promise<void> {
  await deleteDoc(doc(db, 'offers', id))
}

export async function getAllOffersAdmin(filters: { status?: OfferStatus; station?: string; month?: string } = {}): Promise<Offer[]> {
  let q: Query<DocumentData> = query(offersCol(), orderBy('createdAt', 'desc'))
  const conditions: any[] = []
  if (filters.status) conditions.push(where('status', '==', filters.status))
  if (filters.station) conditions.push(where('ownerStation', '==', filters.station))
  if (filters.month) conditions.push(where('offerMonth', '==', filters.month))
  if (conditions.length > 0) q = query(offersCol(), ...conditions, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Offer))
}

const stationsCol = () => collection(db, 'stations')

export async function getStations(activeOnly = true): Promise<Station[]> {
  let q: Query<DocumentData> = query(stationsCol(), orderBy('name'))
  if (activeOnly) q = query(stationsCol(), where('active', '==', true), orderBy('name'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Station))
}

export async function createStation(name: string): Promise<string> {
  const ref = await addDoc(stationsCol(), { name, active: true, createdAt: serverTimestamp() })
  return ref.id
}

export async function toggleStation(id: string, active: boolean): Promise<void> {
  await updateDoc(doc(db, 'stations', id), { active })
}

export async function getOffersForMonth(offerMonth: string): Promise<Offer[]> {
  const q = query(offersCol(), where('status', '==', 'in_progress'), where('offerMonth', '==', offerMonth), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Offer))
}

export function computeMatchScore(myDaysOff: DayOff[], myReplacementDays: ReplacementDay[], other: Offer): number {
  function shiftScore(wanted: ShiftType, available: ShiftType[]): number {
    if (available.includes(wanted)) return 1
    if (available.includes('overlap') && (wanted === 'day' || wanted === 'night')) return 0.75
    if (wanted === 'overlap' && (available.includes('day') || available.includes('night'))) return 0.5
    return 0
  }
  const validMyDays = myDaysOff.filter(d => d.date)
  let myScore = 0
  if (validMyDays.length > 0) {
    for (const myDay of validMyDays) {
      const theirRep = other.replacementDays.find(r => r.date === myDay.date)
      myScore += theirRep ? shiftScore(myDay.shift, theirRep.shifts) : 0
    }
    myScore = myScore / validMyDays.length
  }
  const validTheirDays = other.daysOff.filter(d => d.date)
  let theirScore = 0
  if (validTheirDays.length > 0) {
    for (const theirDay of validTheirDays) {
      const myRep = myReplacementDays.find(r => r.date === theirDay.date)
      theirScore += myRep ? shiftScore(theirDay.shift, myRep.shifts) : 0
    }
    theirScore = theirScore / validTheirDays.length
  }
  return Math.round(((myScore + theirScore) / 2) * 100)
}

export async function getUserProfile(uid: string) {
  const snap = await getDoc(doc(db, 'userProfiles', uid))
  return snap.exists() ? snap.data() : null
}

export async function selectOfferDirect(offerId: string, selectorUid: string, selectorName: string, selectorCode: string, selectorStation: string): Promise<void> {
  await updateDoc(doc(db, 'offers', offerId), { status: 'selected', selectorUid, selectorName, selectorCode, selectorStation, updatedAt: serverTimestamp() })
}

export async function cancelSelectionDirect(offerId: string): Promise<void> {
  await updateDoc(doc(db, 'offers', offerId), { status: 'in_progress', selectorUid: deleteField(), selectorName: deleteField(), selectorCode: deleteField(), selectorStation: deleteField(), updatedAt: serverTimestamp() })
}

export async function ownerAcceptOffer(offerId: string): Promise<void> {
  await updateDoc(doc(db, 'offers', offerId), { status: 'confirmed', confirmedAt: serverTimestamp(), updatedAt: serverTimestamp() })
}

export async function ownerRejectOffer(offerId: string): Promise<void> {
  await updateDoc(doc(db, 'offers', offerId), { status: 'in_progress', selectorUid: deleteField(), selectorName: deleteField(), selectorCode: deleteField(), selectorStation: deleteField(), updatedAt: serverTimestamp() })
}
