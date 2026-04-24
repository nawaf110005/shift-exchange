import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'

admin.initializeApp()
const db = admin.firestore()

// ─── Admin check via Firestore (consistent with security rules) ───────────────
async function assertAdmin(uid: string | undefined): Promise<void> {
  if (!uid) throw new HttpsError('unauthenticated', 'يجب تسجيل الدخول أولاً')
  const profile = await db.collection('userProfiles').doc(uid).get()
  if (!profile.exists || profile.data()?.isAdmin !== true) {
    throw new HttpsError('permission-denied', 'هذه العملية للمسؤولين فقط')
  }
}

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
<<<<<<< HEAD
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
=======
export const selectOffer = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'يجب تسجيل الدخول أولاً')

  const { offerId, selectorName, selectorCode, selectorStation } = request.data as SelectOfferInput
  const selectorUid = request.auth.uid

  if (!offerId || !selectorName || !selectorCode || !selectorStation)
    throw new HttpsError('invalid-argument', 'جميع الحقول مطلوبة')
  if (!validateCode(selectorCode))
    throw new HttpsError('invalid-argument', 'رقم الموظف يجب أن يكون 6 أرقام')

  const offerRef   = db.collection('offers').doc(offerId)
  const profileRef = db.collection('userProfiles').doc(selectorUid)
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f

  try {
    await db.runTransaction(async (t) => {
      const offerSnap   = await t.get(offerRef)
      const profileSnap = await t.get(profileRef)

<<<<<<< HEAD
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

=======
      if (!offerSnap.exists) throw new HttpsError('not-found', 'العرض غير موجود')

      const offer = offerSnap.data()!

      if (offer.status !== 'in_progress')
        throw new HttpsError('failed-precondition', 'هذا العرض غير متاح للاختيار')

      if (offer.ownerUid === selectorUid)
        throw new HttpsError('permission-denied', 'لا يمكنك اختيار عرضك الخاص')

      const currentCount = profileSnap.exists ? (profileSnap.data()!.activeSelectionCount ?? 0) : 0
      if (currentCount >= 20)
        throw new HttpsError('resource-exhausted', 'وصلت للحد الأقصى من العروض المختارة (20 عرض)')

      t.update(offerRef, {
        status: 'selected', selectorUid, selectorName, selectorCode, selectorStation,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      if (profileSnap.exists) {
        t.update(profileRef, {
          activeSelectionCount: admin.firestore.FieldValue.increment(1),
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        })
      } else {
        t.set(profileRef, {
          uid: selectorUid, activeSelectionCount: 1,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        })
      }
    })
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
    return { success: true, message: 'تم اختيار العرض بنجاح' }
  } catch (err) {
    if (err instanceof HttpsError) throw err
    console.error('selectOffer error:', err)
    throw new HttpsError('internal', 'حدث خطأ، يرجى المحاولة مجدداً')
  }
})

// ─── cancelSelection ──────────────────────────────────────────────────────────
<<<<<<< HEAD
/**
 * Atomically undo a selection (revert to in_progress).
 * Only the selector can do this while status == selected.
 */
export const cancelSelection = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'يجب تسجيل الدخول أولاً')
  }
=======
export const cancelSelection = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'يجب تسجيل الدخول أولاً')
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f

  const { offerId } = request.data as CancelSelectionInput
  const callerUid   = request.auth.uid

<<<<<<< HEAD
  if (!offerId) {
    throw new HttpsError('invalid-argument', 'معرّف العرض مطلوب')
  }
=======
  if (!offerId) throw new HttpsError('invalid-argument', 'معرّف العرض مطلوب')
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f

  const offerRef   = db.collection('offers').doc(offerId)
  const profileRef = db.collection('userProfiles').doc(callerUid)

  try {
    await db.runTransaction(async (t) => {
      const offerSnap = await t.get(offerRef)
<<<<<<< HEAD

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
=======
      if (!offerSnap.exists) throw new HttpsError('not-found', 'العرض غير موجود')

      const offer = offerSnap.data()!
      if (offer.selectorUid !== callerUid)
        throw new HttpsError('permission-denied', 'ليس لديك صلاحية إلغاء هذا الاختيار')
      if (offer.status !== 'selected')
        throw new HttpsError('failed-precondition', 'لا يمكن إلغاء هذا العرض في حالته الحالية')

      t.update(offerRef, {
        status: 'in_progress',
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
        selectorUid:     admin.firestore.FieldValue.delete(),
        selectorName:    admin.firestore.FieldValue.delete(),
        selectorCode:    admin.firestore.FieldValue.delete(),
        selectorStation: admin.firestore.FieldValue.delete(),
<<<<<<< HEAD
        updatedAt:       admin.firestore.FieldValue.serverTimestamp(),
      })

      // Decrement user selection counter
      t.update(profileRef, {
        activeSelectionCount: admin.firestore.FieldValue.increment(-1),
        lastSeen:             admin.firestore.FieldValue.serverTimestamp(),
      })
    })

=======
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      t.update(profileRef, {
        activeSelectionCount: admin.firestore.FieldValue.increment(-1),
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
      })
    })
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
    return { success: true, message: 'تم إلغاء الاختيار بنجاح' }
  } catch (err) {
    if (err instanceof HttpsError) throw err
    console.error('cancelSelection error:', err)
    throw new HttpsError('internal', 'حدث خطأ، يرجى المحاولة مجدداً')
  }
})

// ─── grantAdminRole ───────────────────────────────────────────────────────────
<<<<<<< HEAD
/**
 * Grant admin role by setting isAdmin:true in userProfiles.
 * Only callable by existing admins. First admin must be set manually in Firestore console.
 */
export const grantAdminRole = onCall(async (request) => {
  await assertAdmin(request.auth?.uid)

  const { email } = request.data as SetAdminClaimInput
  if (!email) throw new HttpsError('invalid-argument', 'البريد الإلكتروني مطلوب')

=======
// Sets isAdmin:true in Firestore userProfiles (consistent with security rules).
// First admin must be set manually in Firestore console.
export const grantAdminRole = onCall(async (request) => {
  await assertAdmin(request.auth?.uid)
  const { email } = request.data as SetAdminClaimInput
  if (!email) throw new HttpsError('invalid-argument', 'البريد الإلكتروني مطلوب')
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
  try {
    const user = await admin.auth().getUserByEmail(email)
    await db.collection('userProfiles').doc(user.uid).set(
      { isAdmin: true, adminGrantedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    )
    return { success: true, message: `تم منح صلاحية الإدارة لـ ${email}` }
  } catch (err: any) {
<<<<<<< HEAD
    if (err?.code === 'auth/user-not-found') {
      throw new HttpsError('not-found', `المستخدم ${email} غير موجود`)
    }
=======
    if (err?.code === 'auth/user-not-found') throw new HttpsError('not-found', `المستخدم ${email} غير موجود`)
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
    throw new HttpsError('internal', 'حدث خطأ أثناء منح الصلاحية')
  }
})

// ─── adminConfirmOffer ────────────────────────────────────────────────────────
<<<<<<< HEAD
/**
 * Admin confirms a selected offer — moves it to 'confirmed' (terminal state).
 * Uses Firestore isAdmin check (consistent with security rules).
 */
=======
// Uses Firestore isAdmin check (consistent with security rules).
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
export const adminConfirmOffer = onCall(async (request) => {
  await assertAdmin(request.auth?.uid)

  const { offerId } = request.data as { offerId: string }
  if (!offerId) throw new HttpsError('invalid-argument', 'معرّف العرض مطلوب')

  const offerRef  = db.collection('offers').doc(offerId)
  const offerSnap = await offerRef.get()
<<<<<<< HEAD

  if (!offerSnap.exists) throw new HttpsError('not-found', 'العرض غير موجود')

  const offer = offerSnap.data()!

  if (offer.status !== 'selected') {
    throw new HttpsError('failed-precondition', 'يمكن تأكيد العروض المختارة فقط')
  }

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

  await db.collection('adminLogs').add({
    adminUid:  request.auth!.uid,
    action:    'confirm_offer',
    offerId,
    oldStatus: 'selected',
    newStatus: 'confirmed',
=======
  if (!offerSnap.exists) throw new HttpsError('not-found', 'العرض غير موجود')

  const offer = offerSnap.data()!
  if (offer.status !== 'selected')
    throw new HttpsError('failed-precondition', 'يمكن تأكيد العروض المختارة فقط')

  const profileRef = db.collection('userProfiles').doc(offer.selectorUid)
  await db.runTransaction(async (t) => {
    t.update(offerRef, {
      status: 'confirmed',
      confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt:   admin.firestore.FieldValue.serverTimestamp(),
    })
    t.update(profileRef, { activeSelectionCount: admin.firestore.FieldValue.increment(-1) })
  })

  await db.collection('adminLogs').add({
    adminUid: request.auth!.uid, action: 'confirm_offer', offerId,
    oldStatus: 'selected', newStatus: 'confirmed',
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  })

  return { success: true, message: 'تم تأكيد العرض بنجاح' }
})

// ─── adminResetOffer ──────────────────────────────────────────────────────────
<<<<<<< HEAD
/**
 * Admin resets a selected/confirmed offer back to in_progress.
 * Useful to undo mistakes before final confirmation.
 */
=======
// Resets a selected/confirmed offer back to in_progress (admin undo).
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
export const adminResetOffer = onCall(async (request) => {
  await assertAdmin(request.auth?.uid)

  const { offerId } = request.data as { offerId: string }
  if (!offerId) throw new HttpsError('invalid-argument', 'معرّف العرض مطلوب')

  const offerRef  = db.collection('offers').doc(offerId)
  const offerSnap = await offerRef.get()
<<<<<<< HEAD

  if (!offerSnap.exists) throw new HttpsError('not-found', 'العرض غير موجود')

  const offer = offerSnap.data()!
  const prevStatus = offer.status as string

  if (prevStatus === 'in_progress') {
    throw new HttpsError('failed-precondition', 'العرض متاح بالفعل')
  }
=======
  if (!offerSnap.exists) throw new HttpsError('not-found', 'العرض غير موجود')

  const offer     = offerSnap.data()!
  const prevStatus = offer.status as string
  if (prevStatus === 'in_progress') throw new HttpsError('failed-precondition', 'العرض متاح بالفعل')
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f

  const selectorUid = offer.selectorUid as string | undefined

  await db.runTransaction(async (t) => {
<<<<<<< HEAD
    // Reset offer to in_progress
    t.update(offerRef, {
      status:          'in_progress',
=======
    t.update(offerRef, {
      status: 'in_progress',
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
      selectorUid:     admin.firestore.FieldValue.delete(),
      selectorName:    admin.firestore.FieldValue.delete(),
      selectorCode:    admin.firestore.FieldValue.delete(),
      selectorStation: admin.firestore.FieldValue.delete(),
      confirmedAt:     admin.firestore.FieldValue.delete(),
      updatedAt:       admin.firestore.FieldValue.serverTimestamp(),
    })
<<<<<<< HEAD

    // If it was 'selected', the selector's count was incremented — decrement back
    if (prevStatus === 'selected' && selectorUid) {
      const profileRef = db.collection('userProfiles').doc(selectorUid)
      t.update(profileRef, {
        activeSelectionCount: admin.firestore.FieldValue.increment(-1),
      })
    }
    // If it was 'confirmed', the count was already decremented — no change needed
  })

  await db.collection('adminLogs').add({
    adminUid:  request.auth!.uid,
    action:    'reset_offer',
    offerId,
    oldStatus: prevStatus,
    newStatus: 'in_progress',
=======
    // Only decrement if was 'selected' (if 'confirmed', count was already decremented)
    if (prevStatus === 'selected' && selectorUid) {
      t.update(db.collection('userProfiles').doc(selectorUid), {
        activeSelectionCount: admin.firestore.FieldValue.increment(-1),
      })
    }
  })

  await db.collection('adminLogs').add({
    adminUid: request.auth!.uid, action: 'reset_offer', offerId,
    oldStatus: prevStatus, newStatus: 'in_progress',
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  })

  return { success: true, message: 'تمت إعادة تعيين العرض إلى متاح' }
<<<<<<< HEAD
})
=======
})
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
