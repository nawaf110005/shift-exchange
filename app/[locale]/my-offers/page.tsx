'use client'

import { useEffect, useState } from 'react'
import { getMyOffers, deleteOffer, ownerAcceptOffer, ownerRejectOffer, Offer } from '@/lib/firebase/firestore'
import { onAuth, signInWithGoogle, getCachedUid } from '@/lib/firebase/auth'
import { statusColor, statusLabel } from '@/lib/utils/validation'
import OfferForm from '@/components/offers/OfferForm'
import { Plus, Pencil, Trash2, ListChecks, Loader2, LogIn, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

import { User } from 'firebase/auth'

const shiftLabel: Record<string, string> = { day: 'صباحي', night: 'مسائي', overlap: 'أوفرلاب' }

type StatusFilter = 'all' | 'confirmed' | 'unconfirmed'

/** Returns true if ALL daysOff dates are yesterday or earlier */
function isExpired(offer: Offer): boolean {
  if (!offer.daysOff?.length) return false
  const today = new Date().toISOString().split('T')[0]
  return offer.daysOff.every(d => d.date < today)
}

/**
 * An offer is "past" (for display filtering) when the latest relevant date
 * has already passed — meaning the swap is fully complete or expired.
 * For claimed offers: the later of daysOff[0].date and selectedReplacementDay.date.
 * For unclaimed:      daysOff[0].date.
 */
function isPastOffer(offer: Offer): boolean {
  const today = new Date().toISOString().split('T')[0]
  const dates: string[] = []
  if (offer.daysOff?.[0]?.date)                     dates.push(offer.daysOff[0].date)
  if (offer.selectedReplacementDay?.date)            dates.push(offer.selectedReplacementDay.date)
  if (dates.length === 0)                            return false
  const latest = dates.sort().at(-1)!
  return latest < today
}

export default function MyOffersPage() {
  const hasCachedUser = typeof window !== 'undefined' ? !!getCachedUid() : false

  const [offers,        setOffers]        = useState<Offer[]>([])
  const [loading,       setLoading]       = useState(true)
  const [user,          setUser]          = useState<User | null | undefined>(hasCachedUser ? undefined : null)
  const [showForm,      setShowForm]      = useState(false)
  const [editing,       setEditing]       = useState<Offer | null>(null)
  const [deleting,      setDeleting]      = useState<string | null>(null)
  const [accepting,     setAccepting]     = useState<string | null>(null)
  const [rejecting,     setRejecting]     = useState<string | null>(null)
  const [signingIn,     setSigningIn]     = useState(false)
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>('all')
  // Set of offer IDs that are expanded (only relevant for confirmed cards)
  const [expandedIds,   setExpandedIds]   = useState<Set<string>>(new Set())

  async function load(uid: string) {
    setLoading(true)
    const data = await getMyOffers(uid)

    // Auto-delete in_progress offers whose dates have all passed (unclaimed & expired)
    const toDelete = data.filter(o => o.status === 'in_progress' && isExpired(o))
    if (toDelete.length > 0) {
      await Promise.all(toDelete.map(o => deleteOffer(o.id!).catch(() => {})))
    }

    const active = data.filter(o => !toDelete.some(d => d.id === o.id))
    setOffers(active)
    setLoading(false)
  }

  useEffect(() => {
    return onAuth((u) => {
      setUser(u)
      if (u) load(u.uid)
      else setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      await ownerAcceptOffer(offer.id!)
      toast.success('✅ تم تأكيد التبديل')
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

  // Still waiting for Firebase to restore session
  if (user === undefined) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#2E86AB] border-t-transparent" />
      </div>
    )
  }

  // Not logged in
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
    <div className="pb-28">
      {/* Guest banner */}
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
          <p className="text-gray-500 text-sm mt-0.5">{visibleOffers.length} عرض</p>
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
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#2E86AB] border-t-transparent" />
        </div>
      ) : visibleOffers.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <ListChecks className="w-14 h-14 mx-auto mb-4 opacity-30" />
          <p className="text-base mb-4">لا توجد عروض{statusFilter !== 'all' ? ' في هذه الفئة' : ''}</p>
          {statusFilter === 'all' && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-[#1B3A6B] text-white px-6 py-3 rounded-xl text-sm font-semibold active:bg-[#142D52] transition-colors min-h-[48px]"
            >
              إنشاء أول عرض
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleOffers.map(offer => {
            const otherName    = offer.claimerName    || offer.selectorName
            const otherStation = offer.claimerStation || offer.selectorStation
            const repDay       = offer.selectedReplacementDay
            const hasClaimer   = !!(otherName || otherStation || repDay)
            const isClaimed    = (offer.status === 'selected' || offer.status === 'confirmed') && hasClaimer
            const isConfirmed  = offer.status === 'confirmed'
            const isExpanded   = expandedIds.has(offer.id!)

            // Shift label for the agreed replacement day
            const repDayShift = repDay?.shifts?.[0] ? shiftLabel[repDay.shifts[0]] ?? repDay.shifts[0] : ''

            return (
              <div key={offer.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                {/* ── Header row ─────────────────────────────────── */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded">أنا</span>
                    <span className="text-sm font-bold text-gray-800">{offer.ownerName || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap', statusColor(offer.status))}>
                      {statusLabel(offer.status)}
                    </span>
                    {offer.status === 'in_progress' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditing(offer); setShowForm(true) }}
                          className="p-2 text-gray-400 active:text-[#2E86AB] active:bg-blue-50 rounded-xl transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(offer)}
                          disabled={deleting === offer.id}
                          className="p-2 text-gray-400 active:text-red-500 active:bg-red-50 rounded-xl transition-colors disabled:opacity-50 min-w-[36px] min-h-[36px] flex items-center justify-center"
                        >
                          {deleting === offer.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                    {/* Expand/collapse toggle for confirmed cards */}
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

                {/* ── Confirmed + collapsed: show only summary ───────── */}
                {isConfirmed && !isExpanded ? (
                  <div className="px-4 pb-4">
                    {/* Compact swap summary */}
                    {isClaimed && otherStation && repDay ? (
                      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
                        <p className="text-sm font-bold text-green-800">
                          🗓️ ستداوم في{' '}
                          <span className="underline underline-offset-2">{otherStation}</span>
                          {' '}يوم {repDay.date}
                          {repDayShift && <span className="text-green-600"> · {repDayShift}</span>}
                        </p>
                        <button
                          onClick={() => toggleExpanded(offer.id!)}
                          className="mt-2 text-xs text-green-600 underline underline-offset-2"
                        >
                          عرض التفاصيل
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-2">
                        <button
                          onClick={() => toggleExpanded(offer.id!)}
                          className="text-xs text-[#2E86AB] underline underline-offset-2"
                        >
                          عرض التفاصيل
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Full card details ─────────────────────────────── */
                  <div className="px-4 pb-4">
                    {/* ── My side: red accent ─────────────────────── */}
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
                          const isAgreed = isClaimed && repDay && r.date === repDay.date
                          return isAgreed ? (
                            <span key={i} className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                              <span>✓</span>
                              <span>{r.date}{r.shifts?.length > 0 ? ` · ${r.shifts.map(s => shiftLabel[s] ?? s).join('/')}` : ''}</span>
                            </span>
                          ) : (
                            <span key={i} className={clsx('text-xs px-2.5 py-1 rounded-full', isClaimed ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600 border border-blue-100')}>
                              {r.date}{r.shifts?.length > 0 ? ` · ${r.shifts.map(s => shiftLabel[s] ?? s).join('/')}` : ''}
                            </span>
                          )
                        })}
                      </div>

                      {/* مركزي */}
                      {offer.ownerStation && (
                        <p className="text-[11px] text-red-500 font-semibold">📍 مركزي: {offer.ownerStation}</p>
                      )}
                    </div>

                    {/* ── Divider with بدال ────────────────────────── */}
                    <div className="flex items-center gap-2 my-3">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs font-bold text-gray-400 px-2">بدال</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* ── Their side: green accent (only if claimed) ─ */}
                    {isClaimed ? (
                      <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-sm font-bold text-gray-800">{otherName}</span>
                        </div>
                        {otherStation && (
                          <p className="text-[11px] text-green-600 font-semibold mb-2">📍 مركزه: {otherStation}</p>
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
                    ) : (
                      <div className="rounded-xl border border-dashed border-gray-200 p-3 text-center">
                        <p className="text-xs text-gray-400">في انتظار من يختار</p>
                      </div>
                    )}

                    {/* ── Swap summary notice (with shift type) ──── */}
                    {isClaimed && otherStation && repDay && (
                      <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-center">
                        <p className="text-xs font-bold text-blue-800">
                          🗓️ ستداوم في{' '}
                          <span className="underline underline-offset-2">{otherStation}</span>
                          {' '}يوم {repDay.date}
                          {repDayShift && <span className="text-blue-600"> · {repDayShift}</span>}
                        </p>
                      </div>
                    )}

                    {/* Accept / Reject for pending selection */}
                    {offer.status === 'selected' && offer.selectorName && (
                      <div className="mt-3 pt-3 border-t border-orange-100">
                        <p className="text-xs text-orange-700 font-semibold mb-2">✋ طلب اختيار — هل تقبل؟</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAccept(offer)}
                            disabled={accepting === offer.id || rejecting === offer.id}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white text-xs font-semibold py-2.5 rounded-xl disabled:opacity-50"
                          >
                            {accepting === offer.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            قبول
                          </button>
                          <button
                            onClick={() => handleReject(offer)}
                            disabled={accepting === offer.id || rejecting === offer.id}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-semibold py-2.5 rounded-xl disabled:opacity-50"
                          >
                            {rejecting === offer.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                            رفض
                          </button>
                        </div>
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

      {showForm && user && (
        <OfferForm uid={user.uid} isAnonymous={user.isAnonymous} offer={editing} onClose={handleFormClose} />
      )}
    </div>
  )
}
