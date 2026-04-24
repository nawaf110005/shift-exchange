'use client'

import { useEffect, useState } from 'react'
import { getSelectedOffers, cancelSelectionDirect, Offer } from '@/lib/firebase/firestore'
import { onAuth, signInWithGoogle, getCachedUid } from '@/lib/firebase/auth'
import { statusColor, statusLabel } from '@/lib/utils/validation'
import { Bookmark, XCircle, Loader2, LogIn, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

import { User } from 'firebase/auth'

const shiftLabel: Record<string, string> = { day: 'صباحي', night: 'مسائي', overlap: 'أوفرلاب' }

type StatusFilter = 'all' | 'confirmed' | 'unconfirmed'

/**
 * In the selected page (claimer's view) the relevant work date is daysOff[0].date —
 * the day the claimer will work in the offer owner's place.
 * If that date has passed, the swap is done and we hide the offer.
 */
function isPastOffer(offer: Offer): boolean {
  const today = new Date().toISOString().split('T')[0]
  const dates: string[] = []
  if (offer.daysOff?.[0]?.date)          dates.push(offer.daysOff[0].date)
  if (offer.selectedReplacementDay?.date) dates.push(offer.selectedReplacementDay.date)
  if (dates.length === 0) return false
  const latest = dates.sort().at(-1)!
  return latest < today
}

export default function SelectedOffersPage() {
  const hasCachedUser = typeof window !== 'undefined' ? !!getCachedUid() : false

  const [offers,       setOffers]       = useState<Offer[]>([])
  const [loading,      setLoading]      = useState(true)
  const [user,         setUser]         = useState<User | null | undefined>(hasCachedUser ? undefined : null)
  const [canceling,    setCanceling]    = useState<string | null>(null)
  const [signingIn,    setSigningIn]    = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  // Set of offer IDs that are expanded (only relevant for confirmed cards)
  const [expandedIds,  setExpandedIds]  = useState<Set<string>>(new Set())

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

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Apply filters: remove past offers, then apply status tab
  const visibleOffers = offers
    .filter(o => !isPastOffer(o))
    .filter(o => {
      if (statusFilter === 'confirmed')   return o.status === 'confirmed'
      if (statusFilter === 'unconfirmed') return o.status !== 'confirmed'
      return true
    })

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
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#1B3A6B]">عروضي المختارة</h1>
        <p className="text-gray-500 text-sm mt-1">
          العروض التي اخترتها للتبديل · {visibleOffers.length}
        </p>
      </div>

      {/* ── Filter tabs ──────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
        {([
          { key: 'all',         label: 'الكل'      },
          { key: 'confirmed',   label: 'مؤكد'      },
          { key: 'unconfirmed', label: 'غير مؤكد'  },
        ] as { key: StatusFilter; label: string }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={clsx(
              'flex-1 py-2 rounded-lg text-sm font-medium transition-colors min-h-[36px]',
              statusFilter === tab.key
                ? 'bg-white text-[#1B3A6B] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#2E86AB] border-t-transparent" />
        </div>
      ) : visibleOffers.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Bookmark className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">لا توجد عروض{statusFilter !== 'all' ? ' في هذه الفئة' : ''}</p>
          {statusFilter === 'all' && (
            <p className="text-sm mt-2">
              تصفح <a href="/ar/offers" className="text-[#2E86AB] hover:underline">العروض المتاحة</a> واختر ما يناسبك
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleOffers.map(offer => {
            const repDay      = offer.selectedReplacementDay
            const isConfirmed = offer.status === 'confirmed'
            const isExpanded  = expandedIds.has(offer.id!)

            // The date the claimer (me) will work — i.e. the offer owner's daysOff date
            const myWorkDate      = offer.daysOff?.[0]
            const myWorkDateLabel = myWorkDate
              ? `${myWorkDate.date} · ${shiftLabel[myWorkDate.shift] ?? myWorkDate.shift}`
              : '—'

            // The day the offer owner works as my replacement
            const repDayShift = repDay?.shifts?.[0] ? shiftLabel[repDay.shifts[0]] ?? repDay.shifts[0] : ''

            return (
              <div key={offer.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                {/* ── Header row ─────────────────────────────────── */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                  <span className="text-sm font-bold text-gray-800">{offer.ownerName || '—'}</span>
                  <div className="flex items-center gap-2">
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
                        إلغاء
                      </button>
                    )}
                    {/* Expand/collapse for confirmed cards */}
                    {isConfirmed && (
                      <button
                        onClick={() => toggleExpanded(offer.id!)}
                        className="p-2 text-gray-400 active:text-[#2E86AB] rounded-xl transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                        title={isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Confirmed + collapsed: show only summary ───── */}
                {isConfirmed && !isExpanded ? (
                  <div className="px-4 pb-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
                      <p className="text-sm font-bold text-green-800">
                        🗓️ ستداوم في{' '}
                        <span className="underline underline-offset-2">{offer.ownerStation}</span>
                        {' '}يوم {myWorkDate?.date}
                        {myWorkDate && <span className="text-green-600"> · {shiftLabel[myWorkDate.shift] ?? myWorkDate.shift}</span>}
                      </p>
                      <button
                        onClick={() => toggleExpanded(offer.id!)}
                        className="mt-2 text-xs text-green-600 underline underline-offset-2"
                      >
                        عرض التفاصيل
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Full card details ─────────────────────────── */
                  <div className="px-4 pb-4">
                    {/* ── Their side (offer owner): red accent ────── */}
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3">

                      {/* يوم الطلب */}
                      <p className="text-[11px] font-bold text-red-500 mb-1.5">يوم الطلب</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {offer.daysOff.map((d, i) => (
                          <span key={i} className="text-xs bg-red-500 text-white px-2.5 py-1 rounded-full font-semibold">
                            {d.date} · {shiftLabel[d.shift] ?? d.shift}
                          </span>
                        ))}
                      </div>

                      {/* أيام البديل */}
                      <p className="text-[11px] font-bold text-blue-500 mb-1.5">أيام البديل</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {offer.replacementDays.map((r, i) => {
                          const isAgreed = repDay && r.date === repDay.date
                          return isAgreed ? (
                            <span key={i} className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                              <span>✓</span>
                              <span>{r.date}{r.shifts?.length > 0 ? ` · ${r.shifts.map(s => shiftLabel[s] ?? s).join('/')}` : ''}</span>
                            </span>
                          ) : (
                            <span key={i} className="text-xs bg-gray-100 text-gray-400 px-2.5 py-1 rounded-full">
                              {r.date}{r.shifts?.length > 0 ? ` · ${r.shifts.map(s => shiftLabel[s] ?? s).join('/')}` : ''}
                            </span>
                          )
                        })}
                      </div>

                      {/* مركز صاحب العرض */}
                      {offer.ownerStation && (
                        <p className="text-[11px] text-red-500 font-semibold">📍 مركزه: {offer.ownerStation}</p>
                      )}
                    </div>

                    {/* ── Divider with بدال ────────────────────────── */}
                    <div className="flex items-center gap-2 my-3">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs font-bold text-gray-400 px-2">بدال</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* ── My side (claimer): green ─────────────────── */}
                    <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] text-gray-400 font-medium bg-green-100 px-1.5 py-0.5 rounded">أنا</span>
                        <span className="text-sm font-bold text-gray-800">
                          {offer.claimerName || offer.selectorName || '—'}
                        </span>
                      </div>
                      {(offer.claimerStation || offer.selectorStation) && (
                        <p className="text-[11px] text-green-600 font-semibold mb-2">
                          📍 مركزي: {offer.claimerStation || offer.selectorStation}
                        </p>
                      )}
                      <p className="text-[11px] font-bold text-green-500 mb-1.5">يوم التبديل</p>
                      {repDay ? (
                        <span className="text-xs bg-green-600 text-white px-2.5 py-1 rounded-full font-semibold">
                          {repDay.date}{repDay.shifts?.length > 0 ? ` · ${repDay.shifts.map(s => shiftLabel[s] ?? s).join('/')}` : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>

                    {/* ── Swap summary notice (with shift type) ────── */}
                    {offer.ownerStation && myWorkDate && (
                      <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-center">
                        <p className="text-xs font-bold text-blue-800">
                          🗓️ ستداوم في{' '}
                          <span className="underline underline-offset-2">{offer.ownerStation}</span>
                          {' '}يوم {myWorkDate.date}
                          <span className="text-blue-600"> · {shiftLabel[myWorkDate.shift] ?? myWorkDate.shift}</span>
                        </p>
                      </div>
                    )}

                    <p className="text-[11px] text-gray-300 mt-3">
                      {offer.createdAt ? ((d: Date) => `${d.getDate()} ${['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'][d.getMonth()]} ${d.getFullYear()}`)((offer.createdAt as any).toDate()) : ''}
                    </p>
                  </div>
                )}

                {/* ── Footer: Admin confirmed banner ──────────── */}
                {isConfirmed && (
                  <div className="bg-green-500 text-white text-center text-xs font-bold py-2.5 flex items-center justify-center gap-1.5 tracking-wide">
                    <span>✓</span><span>مؤكد من الإدارة</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
