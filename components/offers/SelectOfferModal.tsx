'use client'

import { useState, useEffect } from 'react'
<<<<<<< HEAD
import { Offer, selectOfferDirect } from '@/lib/firebase/firestore'
import { getCurrentUser, signInWithGoogle, onAuth } from '@/lib/firebase/auth'
import { X, Loader2, LogIn, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { User } from 'firebase/auth'
=======
import { Offer, getStations, Station, selectOfferDirect } from '@/lib/firebase/firestore'
import { validateEmployeeCode } from '@/lib/utils/validation'
import { getCurrentUser, signInWithGoogle } from '@/lib/firebase/auth'
import { X, Loader2, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f

interface Props {
  offer:   Offer
  onClose: () => void
}

export default function SelectOfferModal({ offer, onClose }: Props) {
<<<<<<< HEAD
  const [user,      setUser]      = useState<User | null>(getCurrentUser())
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [signingIn, setSigningIn] = useState(false)

  // Keep user in sync (e.g. after sign-in inside modal)
  useEffect(() => {
    return onAuth((u) => setUser(u))
  }, [])

  // Auto-select as soon as we have a real (non-anonymous) user and haven't already done so
  useEffect(() => {
    if (user && !user.isAnonymous && !done && !loading) {
      handleSelect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function handleSelect() {
    if (!user || user.isAnonymous) return
    setLoading(true)
    try {
      await selectOfferDirect(
        offer.id!,
        user.uid,
        user.displayName || '',
        '',   // code — not required from selector
        '',   // station — removed from user flow
      )
      setDone(true)
      toast.success('تم اختيار العرض بنجاح ✅')
      setTimeout(onClose, 1200)
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ، يرجى المحاولة مجدداً')
      setLoading(false)
    }
=======
  const currentUser = getCurrentUser()
  const [name,       setName]       = useState(currentUser?.displayName || '')
  const [code,       setCode]       = useState('')
  const [station,    setStation]    = useState('')
  const [stations,   setStations]   = useState<Station[]>([])
  const [loading,    setLoading]    = useState(false)
  const [signingIn,  setSigningIn]  = useState(false)
  const [errors,     setErrors]     = useState<Record<string, string>>({})

  useEffect(() => {
    getStations().then(setStations)
  }, [])

  function validate() {
    const errs: Record<string, string> = {}
    if (!name.trim())    errs.name    = 'الاسم مطلوب'
    if (!station)        errs.station = 'المحطة مطلوبة'
    const codeErr = validateEmployeeCode(code)
    if (codeErr)         errs.code   = codeErr
    setErrors(errs)
    return Object.keys(errs).length === 0
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
  }

  async function handleSignIn() {
    setSigningIn(true)
    try { await signInWithGoogle() }
    catch (e: any) {
      if (e?.code !== 'auth/popup-closed-by-user') toast.error('فشل تسجيل الدخول')
    } finally { setSigningIn(false) }
  }

<<<<<<< HEAD
=======
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Guard: only registered (non-anonymous) users can select offers
    if (!currentUser || currentUser.isAnonymous) return
    if (!validate()) return
    setLoading(true)
    try {
      await selectOfferDirect(
        offer.id!,
        currentUser.uid,
        name.trim(),
        code.trim(),
        station,
      )
      toast.success('تم اختيار العرض بنجاح ✅')
      onClose()
    } catch (err: any) {
      const msg = err?.message || 'حدث خطأ، يرجى المحاولة مجدداً'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
<<<<<<< HEAD
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl"
=======
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
           style={{ paddingBottom: 'max(1.25rem, var(--safe-bottom))' }}>
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-bold text-[#1B3A6B]">اختيار العرض</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl min-w-[40px] min-h-[40px] flex items-center justify-center">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Offer summary */}
        <div className="px-5 py-3 bg-blue-50 border-b">
          <p className="text-sm text-gray-600">
            عرض <span className="font-semibold text-[#1B3A6B]">{offer.ownerName}</span>
            {' '} — <span className="text-[#2E86AB]">{offer.ownerStation}</span>
          </p>
<<<<<<< HEAD
          <div className="flex flex-wrap gap-1 mt-2">
            {offer.daysOff.map((d, i) => (
              <span key={i} className="text-xs bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full">
                {d.date} · {{ day: 'صباحي', night: 'مسائي', overlap: 'تداخل' }[d.shift as 'day'|'night'|'overlap']}
              </span>
            ))}
          </div>
        </div>

        <div className="px-5 py-6">
          {/* Not logged in */}
          {!user && (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-gray-600">يجب تسجيل الدخول لاختيار العرض</p>
              <button onClick={handleSignIn} disabled={signingIn}
                className="flex items-center gap-2 bg-[#1B3A6B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 min-h-[44px]">
                <LogIn className="w-4 h-4" />
                {signingIn ? 'جارٍ تسجيل الدخول…' : 'دخول بـ Google'}
              </button>
            </div>
          )}

          {/* Anonymous — must register first */}
          {user?.isAnonymous && (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-gray-700 font-semibold">سجّل بـ Google أولاً لاختيار عرض</p>
              <p className="text-xs text-gray-500">التسجيل يحفظ عروضك وتحديداتك بشكل دائم</p>
              <button onClick={handleSignIn} disabled={signingIn}
                className="flex items-center gap-2 bg-[#1B3A6B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 min-h-[44px]">
                <LogIn className="w-4 h-4" />
                {signingIn ? 'جارٍ التسجيل…' : 'تسجيل الدخول بـ Google'}
              </button>
            </div>
          )}

          {/* Authenticated — auto-selecting, show progress/done state */}
          {user && !user.isAnonymous && (
            <div className="flex flex-col items-center gap-3 text-center py-4">
              {done ? (
                <>
                  <CheckCircle className="w-12 h-12 text-green-500" />
                  <p className="text-base font-semibold text-green-700">تم اختيار العرض بنجاح!</p>
                </>
              ) : (
                <>
                  <Loader2 className="w-10 h-10 animate-spin text-[#2E86AB]" />
                  <p className="text-sm text-gray-500">جارٍ تسجيل اختيارك…</p>
                </>
              )}
            </div>
          )}
        </div>
=======
        </div>

        {/* Not signed in at all */}
        {!currentUser && (
          <div className="px-5 py-6 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-gray-600">يجب تسجيل الدخول لاختيار العرض</p>
            <button onClick={handleSignIn} disabled={signingIn}
              className="flex items-center gap-2 bg-[#1B3A6B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 min-h-[44px]">
              <LogIn className="w-4 h-4" />
              {signingIn ? 'جارٍ تسجيل الدخول…' : 'دخول بـ Google'}
            </button>
          </div>
        )}

        {/* Anonymous user — must register first */}
        {currentUser?.isAnonymous && (
          <div className="px-5 py-6 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-gray-700 font-semibold">سجّل بـ Google أولاً لاختيار عرض</p>
            <p className="text-xs text-gray-500">التسجيل يحفظ عروضك وتحديداتك بشكل دائم</p>
            <button onClick={handleSignIn} disabled={signingIn}
              className="flex items-center gap-2 bg-[#1B3A6B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 min-h-[44px]">
              <LogIn className="w-4 h-4" />
              {signingIn ? 'جارٍ التسجيل…' : 'تسجيل الدخول بـ Google'}
            </button>
          </div>
        )}

        {/* Form — registered users only */}
        {currentUser && !currentUser.isAnonymous && (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">اسمك</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="الاسم الكامل"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2E86AB] focus:border-transparent"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم موظفك</label>
              <input
                type="tel"
                inputMode="numeric"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6 أرقام"
                maxLength={6}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2E86AB] focus:border-transparent"
                dir="ltr"
              />
              {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">محطتك</label>
              <select
                value={station}
                onChange={e => setStation(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2E86AB] bg-white"
              >
                <option value="">اختر المحطة</option>
                {stations.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
              {errors.station && <p className="text-red-500 text-xs mt-1">{errors.station}</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-300 text-gray-700 py-3.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors min-h-[52px]"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#1B3A6B] text-white py-3.5 rounded-xl text-sm font-semibold active:bg-[#142D52] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 min-h-[52px]"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                تأكيد الاختيار
              </button>
            </div>
          </form>
        )}
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
      </div>
    </div>
  )
}
