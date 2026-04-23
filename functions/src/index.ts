import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

admin.initializeApp()
const db = admin.firestore()

// ─── Types ────────────────────────────────────────────────────────────────────

interface SelectOfferInput {
  offerId:         string
  selectorName:    string
  selectorCode:    string
  selectorStation: string
}

interface CancelSelectionInput {
  offerId: string
}

interface SetAdminClaimInput {
  email: string
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function validateCode(code: string): boolean {
  return /^\d{6}$/.test(code)
}

// ─── selectOffer ──────────────────────────────────────────────────────────────
/**
 * Atomically accept an offer.
 * Validates: offer is in_progress, caller ≠ owner, selector active count < 20.
 */
export const selectOffer = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'يجب تسجيل الدخول أولاً')
  }

  const { offerId, selectorName, selectorCode, selectorStation } =
    request.data as SelectOfferInput
  const selectorUid = request.auth.uid

  // Validate inputs
  if (!offerId || !selectorName || !selectorCode || !selectorStation) {
    throw new HttpsError('invalid-argument', 'جميع الحقول مطلوبة')
  }
  if (!validateCode(selectorCode)) {
    throw new HttpsError('invalid-argument', 'رقم الموظف يجب أن يكون 6 أرقام')
  }

  const offerRef      = db.collection('offers').doc(offerId)
  const profileRef    = db.collection('userProfiles').doc(selectorUid)

  try {
    await db.runTransaction(async (t) => {
      const offerSnap   = await t.get(offerRef)
      const profileSnap = await t.get(profileRef)

      if (!offerSnap.exists) {
        throw new HttpsError('not-found', 'العرض غير موجود')
      }

      const offer = offerSnap.data()!

      // Must be in_progress
      if (offer.status !== 'in_progress') {
        throw new HttpsError('failed-precondition', 'هذا العرض غير متاح للاختيار')
      }

      // Cannot select own offer
      if (offer.ownerUid === selectorUid) {
        throw new HttpsError('permission-denied', 'لا يمكنك اختيار عرضك الخاص')
      }

      // Check active selection limit (max 20)
      const currentCount = profileSnap.exists
        ? (profileSnap.data()!.activeSelectionCount ?? 0)
        : 0

      if (currentCount >= 20) {
        throw new HttpsError(
          'resource-exhausted',
          'وصلت للحد الأقصى من العروض المختارة (20 عرض)'
        )
      }

      // Update offer → selected
      t.update(offerRef, {
        status:          'selected',
        selectorUid,
        selectorName,
        selectorCode,
        selectorStation,
        updatedAt:       admin.firestore.FieldValue.serverTimestamp(),
      })

      // Increment / create user profile counter
      if (profileSnap.exists) {
        t.update(profileRef, {
          activeSelectionCount: admin.firestore.FieldValue.increment(1),
          lastSeen:             admin.firestore.FieldValue.serverTimestamp(),
        })
      } else {
        t.set(profileRef, {
          uid:                  selectorUid,
          activeSelectionCount: 1,
          createdAt:            admin.firestore.FieldValue.serverTimestamp(),
          lastSeen:             admin.firestore.FieldValue.serverTimestamp(),
        })
      }
    })

    return { success: true, message: 'تم اختيار العرض بنجاح' }
  } catch (err) {
    if (err instanceof HttpsError) throw err
    console.error('selectOffer error:', err)
    throw new HttpsError('internal', 'حدث خطأ، يرجى المحاولة مجدداً')
  }
})

// ─── cancelSelection ──────────────────────────────────────────────────────────
/**
 * Atomically undo a selection (revert to in_progress).
 * Only the selector can do this while status == selected.
 */
export const cancelSelection = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'يجب تسجيل الدخول أولاً')
  }

  const { offerId } = request.data as CancelSelectionInput
  const callerUid   = request.auth.uid

  if (!offerId) {
    throw new HttpsError('invalid-argument', 'معرّف العرض مطلوب')
  }

  const offerRef   = db.collection('offers').doc(offerId)
  const profileRef = db.collection('userProfiles').doc(callerUid)

  try {
    await db.runTransaction(async (t) => {
      const offerSnap = await t.get(offerRef)

      if (!offerSnap.exists) {
        throw new HttpsError('not-found', 'العرض غير موجود')
      }

      const offer = offerSnap.data()!

      // Must be the selector
      if (offer.selectorUid !== callerUid) {
        throw new HttpsError('permission-denied', 'ليس لديك صلاحية إلغاء هذا الاختيار')
      }

      // Must still be selected (not confirmed)
      if (offer.status !== 'selected') {
        throw new HttpsError('failed-precondition', 'لا يمكن إلغاء هذا العرض في حالته الحالية')
      }

      // Revert offer to in_progress and clear selector fields
      t.update(offerRef, {
        status:          'in_progress',
        selectorUid:     admin.firestore.FieldValue.delete(),
        selectorName:    admin.firestore.FieldValue.delete(),
        selectorCode:    admin.firestore.FieldValue.delete(),
        selectorStation: admin.firestore.FieldValue.delete(),
        updatedAt:       admin.firestore.FieldValue.serverTimestamp(),
      })

      // Decrement user selection counter
      t.update(profileRef, {
        activeSelectionCount: admin.firestore.FieldValue.increment(-1),
        lastSeen:             admin.firestore.FieldValue.serverTimestamp(),
      })
    })

    return { success: true, message: 'تم إلغاء الاختيار بنجاح' }
  } catch (err) {
    if (err instanceof HttpsError) throw err
    console.error('cancelSelection error:', err)
    throw new HttpsError('internal', 'حدث خطأ، يرجى المحاولة مجدداً')
  }
})

// ─── setAdminClaim ────────────────────────────────────────────────────────────
/**
 * Grant admin role to an email address.
 * Only callable by existing admins (or during initial setup).
 */
export const setAdminClaim = onCall(async (request) => {
  // Only existing admins can grant admin role (skip check for initial setup)
  const callerToken = request.auth?.token
  if (!callerToken || callerToken['role'] !== 'admin') {
    throw new HttpsError(
      'permission-denied',
      'فقط المسؤول يمكنه منح صلاحيات الإدارة'
    )
  }

  const { email } = request.data as SetAdminClaimInput
  if (!email) {
    throw new HttpsError('invalid-argument', 'البريد الإلكتروني مطلوب')
  }

  try {
    const user = await admin.auth().getUserByEmail(email)
    await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' })
    return { success: true, message: `تم منح صلاحية الإدارة لـ ${email}` }
  } catch (err: any) {
    if (err?.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', `المستخدم ${email} غير موجود`)
    }
    throw new HttpsError('internal', 'حدث خطأ أثناء منح الصلاحية')
  }
})

// ─── adminConfirmOffer ────────────────────────────────────────────────────────
/**
 * Admin confirms a selected offer — moves it to 'confirmed' (terminal state).
 */
export const adminConfirmOffer = onCall(async (request) => {
  const callerToken = request.auth?.token
  if (!callerToken || callerToken['role'] !== 'admin') {
    throw new HttpsError('permission-denied', 'هذه العملية للمسؤولين فقط')
  }

  const { offerId } = request.data as { offerId: string }
  if (!offerId) throw new HttpsError('invalid-argument', 'معرّف العرض مطلوب')

  const offerRef   = db.collection('offers').doc(offerId)
  const offerSnap  = await offerRef.get()

  if (!offerSnap.exists) throw new HttpsError('not-found', 'العرض غير موجود')

  const offer = offerSnap.data()!

  if (offer.status !== 'selected') {
    throw new HttpsError('failed-precondition', 'يمكن تأكيد العروض المختارة فقط')
  }

  // Move to confirmed and decrement selector's active count
  const profileRef = db.collection('userProfiles').doc(offer.selectorUid)

  await db.runTransaction(async (t) => {
    t.update(offerRef, {
      status:      'confirmed',
      confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt:   admin.firestore.FieldValue.serverTimestamp(),
    })
    t.update(profileRef, {
      activeSelectionCount: admin.firestore.FieldValue.increment(-1),
    })
  })

  // Log admin action
  await db.collection('adminLogs').add({
    adminUid:  request.auth!.uid,
    action:    'status_change',
    offerId,
    oldStatus: 'selected',
    newStatus: 'confirmed',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  })

  return { success: true, message: 'تم تأكيد العرض بنجاح' }
})
