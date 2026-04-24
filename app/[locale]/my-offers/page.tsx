'use client'

import { useEffect, useState } from 'react'
import { getMyOffers, deleteOffer, ownerAcceptOffer, ownerRejectOffer, Offer } from '@/lib/firebase/firestore'
<<<<<<< HEAD
import { onAuth, signInWithGoogle, getCachedUid } from '@/lib/firebase/auth'
=======
import { onAuth, signInWithGoogle } from '@/lib/firebase/auth'
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
import { statusColor, statusLabel } from '@/lib/utils/validation'
import OfferForm from '@/components/offers/OfferForm'
import { Plus, Pencil, Trash2, ListChecks, Loader2, LogIn, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
<<<<<<< HEAD

import { User } from 'firebase/auth'

/** Returns true if ALL daysOff dates are yesterday or earlier */
function isExpired(offer: Offer): boolean {
  if (!offer.daysOff?.length) return false
  const today = new Date().toISOString().split('T')[0]
  return offer.daysOff.every(d => d.date < today)
}

export default function MyOffersPage() {
  // Use cached UID to avoid flash of loading spinner on refresh
  const hasCachedUser = typeof window !== 'undefined' ? !!getCachedUid() : false

  const [offers,    setOffers]    = useState<Offer[]>([])
  const [loading,   setLoading]   = useState(true)
  const [user,      setUser]      = useState<User | null | undefined>(hasCachedUser ? undefined : null)
=======
import { User } from 'firebase/auth'

export default function MyOffersPage() {
  const [offers,    setOffers]    = useState<Offer[]>([])
  const [loading,   setLoading]   = useState(true)
  const [user,      setUser]      = useState<User | null | undefined>(undefined)
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
  const [showForm,  setShowForm]  = useState(false)
  const [editing,   setEditing]   = useState<Offer | null>(null)
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)

  async function load(uid: string) {
    setLoading(true)
    const data = await getMyOffers(uid)
<<<<<<< HEAD

    // Auto-delete in_progress offers whose dates have all passed (unclaimed & expired)
    const toDelete = data.filter(o => o.status === 'in_progress' && isExpired(o))
    if (toDelete.length > 0) {
      await Promise.all(toDelete.map(o => deleteOffer(o.id!).catch(() => {})))
    }

    const active = data.filter(o => !toDelete.some(d => d.id === o.id))
    setOffers(active)
=======
    setOffers(data)
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
    setLoading(false)
  }

  useEffect(() => {
    return onAuth((u) => {
      setUser(u)
      if (u) load(u.uid)
      else setLoading(false)
    })
<<<<<<< HEAD
  // eslint-disable-next-line react-hooks/exhaustive-deps
=======
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
  }, [])

  async function handleSignIn() {
    setSigningIn(true)
    try { await signInWithGoogle() }
    catch (e: any) {
      if (e?.code !== 'auth/popup-closed-by-user') toast.error('فشل تسجيل الدخول')
    } finally { setSigningIn(false) }
  }

  async function handleDelete(offer: Offer) {
    if (!confirm('هل أنت متأكد من حذف هذا العرض؟')) return
    setDeleting(offer.id!)
    try {
      await deleteOffer(offer.id!)
      toast.success('تم حذف العرض')
      if (user) load(user.uid)
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    } finally {
      setDeleting(null)
    }
  }

  async function handleAccept(offer: Offer) {
    if (!confirm(`قبول اختيار ${offer.selectorName}؟ سيصبح العرض مؤكداً ولا يمكن التراجع.`)) return
    setAccepting(offer.id!)
    try {
<<<<<<< HEAD
      await ownerAcceptOffer(
        offer.id!,
        user?.displayName ?? undefined,
        user?.email ?? undefined,
      )
=======
      await ownerAcceptOffer(offer.id!)
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
      toast.success('✅ تم تأكيد التبادل')
      if (user) load(user.uid)
    } catch { toast.error('حدث خطأ') }
    finally { setAccepting(null) }
  }

  async function handleReject(offer: Offer) {
    if (!confirm(`رفض اختيار ${offer.selectorName}؟ سيعود العرض للقائمة.`)) return
    setRejecting(offer.id!)
    try {
      await ownerRejectOffer(offer.id!)
      toast.success('تم رفض الاختيار، العرض متاح مجدداً')
      if (user) load(user.uid)
    } catch { toast.error('حدث خطأ') }
    finally { setRejecting(null) }
  }

  function handleFormClose() {
    setShowForm(false)
    setEditing(null)
    if (user) load(user.uid)
  }

<<<<<<< HEAD
  // Still waiting for Firebase to restore session
=======
  // Still determining auth state
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
  if (user === undefined) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#2E86AB] border-t-transparent" />
      </div>
    )
  }

<<<<<<< HEAD
  // Not logged in → show sign-in prompt directly (no hanging spinner)
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5">
        <ListChecks className="w-16 h-16 text-gray-300" />
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700 mb-1">تسجيل الدخول مطلوب</p>
          <p className="text-sm text-gray-400">سجّل دخولك لإنشاء وإدارة عروضك</p>
        </div>
        <button onClick={handleSignIn} disabled={signingIn}
          className="flex items-center gap-2 bg-[#1B3A6B] text-white px-6 py-3 rounded-xl text-sm font-semibold disabled:opacity-60 min-h-[48px]">
          <LogIn className="w-4 h-4" />
          {signingIn ? 'جارٍ تسجيل الدخول…' : 'دخول بـ Google'}
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Guest banner */}
=======
  return (
    <div>
      {/* Guest banner for anonymous users */}
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
      {user?.isAnonymous && (
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-sm text-amber-800">
            🔔 أنت تتصفح كضيف — سجّل دخولك بـ Google للاحتفاظ بعروضك بشكل دائم
          </p>
          <button onClick={handleSignIn} disabled={signingIn}
            className="flex items-center gap-2 bg-[#1B3A6B] text-white px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-60 whitespace-nowrap min-h-[36px]">
            <LogIn className="w-3.5 h-3.5" />
            {signingIn ? 'جارٍ التسجيل…' : 'دخول بـ Google'}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1B3A6B]">عروضي</h1>
          <p className="text-gray-500 text-sm mt-0.5">{offers.length} عرض</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 bg-[#1B3A6B] text-white px-4 py-2.5 rounded-xl text-sm font-semibold active:bg-[#142D52] transition-colors min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">إنشاء عرض جديد</span>
          <span className="sm:hidden">عرض جديد</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#2E86AB] border-t-transparent" />
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <ListChecks className="w-14 h-14 mx-auto mb-4 opacity-30" />
          <p className="text-base mb-4">لم تنشئ أي عروض بعد</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-[#1B3A6B] text-white px-6 py-3 rounded-xl text-sm font-semibold active:bg-[#142D52] transition-colors min-h-[48px]"
          >
            إنشاء أول عرض
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map(offer => (
            <div key={offer.id} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
<<<<<<< HEAD
              {/* Status + meta row */}
=======
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap', statusColor(offer.status))}>
                    {statusLabel(offer.status)}
                  </span>
                  <span className="text-sm text-gray-500 truncate">{offer.ownerStation}</span>
                  <span className="text-xs text-gray-400">{offer.offerMonth}</span>
                </div>
<<<<<<< HEAD

                {/* Action buttons — only for in_progress (non-expired) */}
=======
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
                {offer.status === 'in_progress' && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setEditing(offer); setShowForm(true) }}
                      className="p-2.5 text-gray-400 active:text-[#2E86AB] active:bg-blue-50 rounded-xl transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(offer)}
                      disabled={deleting === offer.id}
                      className="p-2.5 text-gray-400 active:text-red-500 active:bg-red-50 rounded-xl transition-colors disabled:opacity-50 min-w-[40px] min-h-[40px] flex items-center justify-center"
                    >
                      {deleting === offer.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

<<<<<<< HEAD
              {/* Days off chips */}
=======
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
              <div className="mb-2">
                <p className="text-xs text-gray-400 mb-1.5">أيام الطلب</p>
                <div className="flex flex-wrap gap-1">
                  {offer.daysOff.map((d, i) => (
                    <span key={i} className="text-xs bg-red-50 text-red-700 border border-red-100 px-2 py-1 rounded-full">
                      {d.date} · {({ day:'صباحي', night:'مسائي', overlap:'تداخل' } as Record<string,string>)[d.shift]}
                    </span>
                  ))}
                </div>
              </div>

<<<<<<< HEAD
              {/* Selector pending — accept / reject */}
              {offer.status === 'selected' && offer.selectorName && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl space-y-2">
                  <p className="text-xs text-orange-700 font-semibold">
                    ✋ طلب اختيار من: {offer.selectorName}
=======
              {offer.status === 'selected' && offer.selectorName && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl space-y-2">
                  <p className="text-xs text-orange-700 font-semibold">
                    ✋ طلب اختيار من: {offer.selectorName} — {offer.selectorStation}
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(offer)}
                      disabled={accepting === offer.id || rejecting === offer.id}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white text-xs font-semibold py-2 rounded-lg disabled:opacity-50"
                    >
                      {accepting === offer.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      قبول
                    </button>
                    <button
                      onClick={() => handleReject(offer)}
                      disabled={accepting === offer.id || rejecting === offer.id}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-semibold py-2 rounded-lg disabled:opacity-50"
                    >
                      {rejecting === offer.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      رفض
                    </button>
                  </div>
                </div>
              )}

<<<<<<< HEAD
              {/* Confirmed badge */}
              {offer.status === 'confirmed' && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-xs text-green-700 font-semibold">✅ تم تأكيد التبادل مع {offer.selectorName}</p>
                  {(offer as any).confirmedByName && (
                    <p className="text-xs text-green-600 mt-1">
                      اعتمد بواسطة: {(offer as any).confirmedByName} · {(offer as any).confirmedByEmail}
                    </p>
                  )}
=======
              {offer.status === 'confirmed' && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-xs text-green-700 font-semibold">✅ تم تأكيد التبادل مع {offer.selectorName}</p>
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
                </div>
              )}

              <p className="text-xs text-gray-400 mt-2">
                {offer.createdAt ? ((d: Date) => `${d.getDate()} ${['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][d.getMonth()]} ${d.getFullYear()}`)((offer.createdAt as any).toDate()) : ''}
              </p>
            </div>
          ))}
        </div>
      )}

      {showForm && user && (
        <OfferForm uid={user.uid} displayName={user.displayName ?? ''} offer={editing} onClose={handleFormClose} />
      )}
    </div>
  )
}
