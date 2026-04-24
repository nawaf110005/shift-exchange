'use client'

import { useState, useEffect } from 'react'
import { Offer, ReplacementDay, selectOfferDirect, getStations, Station } from '@/lib/firebase/firestore'
import { getCurrentUser, onAuth } from '@/lib/firebase/auth'
import { X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { User } from 'firebase/auth'
import clsx from 'clsx'

interface Props {
  offer:   Offer
  onClose: () => void
}

const shiftLabel: Record<string, string> = {
  day: 'صباحي', night: 'مسائي', overlap: 'تداخل',
}

export default function SelectOfferModal({ offer, onClose }: Props) {
  const [user,                   setUser]                   = useState<User | null>(getCurrentUser())
  const [loading,                setLoading]                = useState(false)
  const [done,                   setDone]                   = useState(false)
  const [selectedDay,            setSelectedDay]            = useState<ReplacementDay | null>(
    offer.replacementDays.length === 1 ? offer.replacementDays[0] : null
  )
  const [stations,               setStations]               = useState<Station[]>([])
  const [claimerName,            setClaimerName]            = useState(getCurrentUser()?.displayName || '')
  const [claimerStation,         setClaimerStation]         = useState('')
  const [claimerEmployeeNumber,  setClaimerEmployeeNumber]  = useState('')

  // Keep user in sync; pre-fill name if it arrives after mount (e.g. slow auth init)
  useEffect(() => {
    return onAuth((u) => {
      setUser(u)
      if (u?.displayName) {
        setClaimerName(prev => prev || u.displayName!)
      }
    })
  }, [])

  // Load available stations
  useEffect(() => {
    getStations().then(setStations)
  }, [])

  async function handleConfirm() {
    if (!selectedDay || !claimerStation || !claimerName.trim()) return
    setLoading(true)
    try {
      await selectOfferDirect(
        offer.id!,
        user?.uid ?? '',
        user?.displayName || '',
        '',   // code — not required from selector
        '',   // legacy selectorStation — not used in new flow
        selectedDay,
        claimerStation,
        claimerEmployeeNumber || undefined,
        claimerName.trim(),
      )
      setDone(true)
      toast.success('تم اختيار العرض بنجاح ✅')
      setTimeout(onClose, 1400)
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ، يرجى المحاولة مجدداً')
      setLoading(false)
    }
  }

  const canConfirm = !!claimerName.trim() && !!selectedDay && !!claimerStation

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl"
        style={{ paddingBottom: 'max(1.25rem, var(--safe-bottom))' }}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-bold text-[#1B3A6B]">
            {done ? 'تم الاختيار!' : 'تأكيد اختيار العرض'}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-xl min-w-[40px] min-h-[40px] flex items-center justify-center disabled:opacity-40"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Offer summary */}
        <div className="px-5 py-3 bg-blue-50 border-b">
          <p className="text-sm text-gray-600 mb-1">
            عرض <span className="font-semibold text-[#1B3A6B]">{offer.ownerName}</span>
            {' '} — <span className="text-[#2E86AB]">{offer.ownerStation}</span>
          </p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {offer.daysOff.map((d, i) => (
              <span key={i} className="text-xs bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full">
                {d.date} · {shiftLabel[d.shift as string] ?? d.shift}
              </span>
            ))}
          </div>
        </div>

        <div className="px-5 py-6">

          {done ? (
            /* ── Success state ─────────────────────────────────────── */
            <div className="flex flex-col items-center gap-3 text-center py-4">
              <CheckCircle className="w-14 h-14 text-green-500" />
              <p className="text-base font-semibold text-green-700">تم اختيار العرض بنجاح!</p>
              <p className="text-sm text-gray-500">سيتواصل معك صاحب العرض للتأكيد</p>
            </div>
          ) : (
            /* ── Claim form — available to all users ───────────────── */
            <div className="space-y-5">

              {/* Claimer name — pre-filled from auth, always editable */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  الاسم <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={claimerName}
                  onChange={(e) => setClaimerName(e.target.value)}
                  placeholder="أدخل اسمك"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB] placeholder:text-gray-400"
                />
                {!claimerName.trim() && (
                  <p className="text-xs text-red-500 mt-1">الاسم مطلوب</p>
                )}
              </div>

              {/* Replacement day picker — claimer must choose exactly one */}
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  اختر <span className="font-semibold text-[#1B3A6B]">يومًا بديلًا واحدًا</span> من الأيام التي يعرضها صاحب العرض
                </p>
                <div className="flex flex-col gap-2">
                  {offer.replacementDays.map((r, i) => {
                    const isSelected = selectedDay?.date === r.date
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedDay(r)}
                        className={clsx(
                          'flex items-center gap-3 w-full text-right px-4 py-3 rounded-xl border text-sm transition-colors',
                          isSelected
                            ? 'bg-green-50 border-green-400 text-green-800 font-semibold'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50/50'
                        )}
                      >
                        {/* Radio indicator */}
                        <span className={clsx(
                          'flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center',
                          isSelected ? 'border-green-500' : 'border-gray-300'
                        )}>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-green-500 block" />}
                        </span>
                        <span className="flex-1">{r.date}</span>
                        <span className={clsx(
                          'text-xs px-2 py-0.5 rounded-full border',
                          isSelected
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        )}>
                          {r.shifts.map(s => shiftLabel[s] ?? s).join(' / ')}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {!selectedDay && (
                  <p className="text-xs text-red-500 mt-1.5">يرجى اختيار يوم للمتابعة</p>
                )}
              </div>

              {/* Station / Location — required */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  المحطة / الموقع <span className="text-red-500">*</span>
                </label>
                <select
                  value={claimerStation}
                  onChange={(e) => setClaimerStation(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
                >
                  <option value="">اختر المحطة</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
                {!claimerStation && (
                  <p className="text-xs text-red-500 mt-1">المحطة مطلوبة</p>
                )}
              </div>

              {/* Employee Number — optional */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  الرقم الوظيفي <span className="text-gray-400 font-normal">(اختياري)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={claimerEmployeeNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 7)
                    setClaimerEmployeeNumber(val)
                  }}
                  placeholder="أدخل الرقم الوظيفي"
                  maxLength={7}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB] placeholder:text-gray-400"
                />
              </div>

              {/* Notice */}
              <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  بعد تقديم طلبك، سيظهر العرض كـ «تم الاختيار» وينتظر قبول صاحبه.
                  يمكنك إلغاء اختيارك من صفحة «عروضي المختارة» قبل التأكيد النهائي.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 min-h-[48px]"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={loading || !canConfirm}
                  className="flex-1 bg-[#1B3A6B] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#142D52] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
                >
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CheckCircle className="w-4 h-4" />}
                  تأكيد الاختيار
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
