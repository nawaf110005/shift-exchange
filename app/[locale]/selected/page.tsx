'use client'

import { useEffect, useState } from 'react'
import { getSelectedOffers, cancelSelectionDirect, Offer } from '@/lib/firebase/firestore'
import { onAuth, signInWithGoogle, getCachedUid } from '@/lib/firebase/auth'
import { statusColor, statusLabel } from '@/lib/utils/validation'
import { Bookmark, XCircle, Loader2, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'


import { User } from 'firebase/auth'

export default function SelectedOffersPage() {
  const hasCachedUser = typeof window !== 'undefined' ? !!getCachedUid() : false

  const [offers,    setOffers]    = useState<Offer[]>([])
  const [loading,   setLoading]   = useState(true)
  const [user,      setUser]      = useState<User | null | undefined>(hasCachedUser ? undefined : null)
  const [canceling, setCanceling] = useState<string | null>(null)
  const [signingIn, setSigningIn] = useState(false)

  async function load(uid: string) {
    setLoading(true)
    const data = await getSelectedOffers(uid)
    setOffers(data)
    setLoading(false)
  }

  useEffect(() => {
    return onAuth((u) => {
      setUser(u)
      if (u) load(u.uid)
      else   setLoading(false)
    })
  }, [])

  async function handleSignIn() {
    setSigningIn(true)
    try { await signInWithGoogle() }
    catch (e: any) {
      if (e?.code !== 'auth/popup-closed-by-user') toast.error('فشل تسجيل الدخول')
    } finally { setSigningIn(false) }
  }

  async function handleCancel(offerId: string) {
    if (!confirm('هل تريد إلغاء اختيارك لهذا العرض؟')) return
    setCanceling(offerId)
    try {
      await cancelSelectionDirect(offerId)
      toast.success('تم إلغاء الاختيار')
      if (user) load(user.uid)
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ')
    } finally {
      setCanceling(null)
    }
  }

  const shiftLabel: Record<string, string> = {
    day: 'صباحي', night: 'مسائي', overlap: 'أوفرلاب',
  }

  if (user === undefined) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#2E86AB] border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5">
        <Bookmark className="w-16 h-16 text-gray-300" />
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700 mb-1">تسجيل الدخول مطلوب</p>
          <p className="text-sm text-gray-400">سجّل دخولك لرؤية العروض التي اخترتها</p>
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
    <div className="pb-28">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B3A6B]">عروضي المختارة</h1>
        <p className="text-gray-500 text-sm mt-1">
          العروض التي اخترتها للتبديل · {offers.length}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#2E86AB] border-t-transparent" />
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Bookmark className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">لم تختر أي عروض بعد</p>
          <p className="text-sm mt-2">
            تصفح <a href="/ar/offers" className="text-[#2E86AB] hover:underline">العروض المتاحة</a> واختر ما يناسبك
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map(offer => {
            const repDay = offer.selectedReplacementDay

            return (
              <div key={offer.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                {/* ✓ Admin-confirmed banner */}
                {offer.status === 'confirmed' && (
                  <div className="bg-green-500 text-white text-center text-xs font-bold py-2 flex items-center justify-center gap-1.5 tracking-wide">
                    <span>✓</span><span>مؤكد من الإدارة</span>
                  </div>
                )}

                <div className="p-4">
                  {/* Top row: status badge + cancel button */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap', statusColor(offer.status))}>
                      {statusLabel(offer.status)}
                    </span>
                    {offer.status === 'selected' && (
                      <button
                        onClick={() => handleCancel(offer.id!)}
                        disabled={canceling === offer.id}
                        className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 border border-red-100 active:bg-red-100 px-3 py-2 rounded-xl transition-colors disabled:opacity-50 min-h-[36px]"
                      >
                        {canceling === offer.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <XCircle className="w-3.5 h-3.5" />
                        }
                        إلغاء الاختيار
                      </button>
                    )}
                  </div>

                  {/* ─── Section 1: عرضي ─────────────────────────────── */}
                  <p className="text-xs font-bold text-[#1B3A6B] mb-3">عرضي</p>

                  {/* أيام الطلب */}
                  <div className="mb-3">
                    <p className="text-[11px] text-gray-400 mb-1.5">أيام الطلب</p>
                    <div className="flex flex-wrap gap-1.5">
                      {offer.daysOff.map((d, i) => (
                        <span key={i} className="text-xs bg-red-50 text-red-700 border border-red-100 px-2.5 py-1 rounded-full">
                          {d.date} · {shiftLabel[d.shift] ?? d.shift}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* مركزي */}
                  <div className="mb-3">
                    <p className="text-[11px] text-gray-400 mb-1">مركزي</p>
                    <p className="text-sm font-semibold text-gray-800">{offer.ownerStation}</p>
                  </div>

                  {/* أيام البديل */}
                  <div>
                    <p className="text-[11px] text-gray-400 mb-1.5">أيام البديل</p>
                    <div className="flex flex-wrap gap-1.5">
                      {offer.replacementDays.map((r, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full">
                          {r.date}{r.shifts?.length > 0 ? ` · ${r.shifts.map(s => shiftLabel[s] ?? s).join('/')}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* ─── Section 2: المختار ───────────────────────────── */}
                  <div className="my-4 border-t border-gray-100" />
                  <p className="text-xs font-bold text-[#2E86AB] mb-3">المختار</p>

                  <div className="space-y-2.5">
                    {/* الاسم */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">الاسم</span>
                      <span className="text-xs font-semibold text-gray-800">{offer.ownerName || '—'}</span>
                    </div>
                    {/* المركز */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">المركز</span>
                      <span className="text-xs font-semibold text-gray-800">{offer.ownerStation || '—'}</span>
                    </div>
                    {/* المناوبة المتفق عليها */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] text-gray-400 shrink-0">المناوبة المتفق عليها</span>
                      {repDay ? (
                        <span className="text-xs font-semibold text-gray-800 text-left">
                          {repDay.date}
                          {repDay.shifts?.length > 0 && (
                            <span className="text-[10px] font-normal text-gray-500 mr-1">
                              {repDay.shifts.map(s => shiftLabel[s] ?? s).join(' · ')}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-gray-300 mt-4">
                    {offer.createdAt ? ((d: Date) => `${d.getDate()} ${['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][d.getMonth()]} ${d.getFullYear()}`)((offer.createdAt as any).toDate()) : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
