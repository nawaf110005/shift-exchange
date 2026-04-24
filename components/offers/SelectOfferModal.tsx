'use client'

import { useState, useEffect, useMemo } from 'react'
import { Offer, ReplacementDay, ShiftType, selectOfferDirect, getStations, Station } from '@/lib/firebase/firestore'
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
  day: 'صباحي', night: 'مسائي', overlap: 'أوفرلاب',
}

/** Return the YYYY-MM-DD string for the calendar day after dateStr */
function nextCalendarDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + 1)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

/**
 * Merge consecutive night-shift replacement days that represent the same
 * overnight shift (e.g. "2025-04-23 night" + "2025-04-24 night" → one entry
 * keeping the first date).  Any other combination is left unchanged.
 */
function mergeNightShifts(days: ReplacementDay[]): ReplacementDay[] {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date))
  const result: ReplacementDay[] = []
  const skip = new Set<number>()

  for (let i = 0; i < sorted.length; i++) {
    if (skip.has(i)) continue
    const cur = sorted[i]

    if (cur.shifts.includes('night') && i + 1 < sorted.length) {
      const nxt = sorted[i + 1]
      if (!skip.has(i + 1) && nxt.shifts.includes('night') && nxt.date === nextCalendarDay(cur.date)) {
        // Same overnight shift — keep first date entry, discard the next-day duplicate
        result.push(cur)
        skip.add(i + 1)
        continue
      }
    }

    result.push(cur)
  }

  return result
}

/** Format YYYY-MM-DD → Arabic day + month (e.g. "٢٣ أبريل") */
function formatArabicDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ar-EG-u-ca-gregory', { day: 'numeric', month: 'long' })
}

/** A single selectable (date + shift type) combination */
type ShiftOption = { date: string; shift: ShiftType }

/** Human-readable Arabic date label for a shift option */
function shiftOptionDateLabel(opt: ShiftOption): string {
  const dateStr = formatArabicDate(opt.date)
  // Night-shift options use a "ليلة" prefix to make the overnight nature clear
  if (opt.shift === 'night') return `ليلة ${dateStr}`
  return dateStr
}

export default function SelectOfferModal({ offer, onClose }: Props) {
  // Deduplicated display list — consecutive night entries for the same overnight shift
  // are collapsed into a single selectable option.
  const displayDays = useMemo(() => mergeNightShifts(offer.replacementDays), [offer.replacementDays])

  // Flatten each ReplacementDay into individual (date + shift) pairs so the
  // claimer picks exactly ONE combination, not an entire day with multiple shifts.
  const shiftOptions = useMemo<ShiftOption[]>(
    () => displayDays.flatMap(r => r.shifts.map(shift => ({ date: r.date, shift }))),
    [displayDays]
  )

  const [user,                   setUser]                   = useState<User | null>(getCurrentUser())
  const [loading,                setLoading]                = useState(false)
  const [done,                   setDone]                   = useState(false)
  const [selectedDay,            setSelectedDay]            = useState<ShiftOption | null>(
    shiftOptions.length === 1 ? shiftOptions[0] : null
  )
  const [stations,               setStations]               = useState<Station[]>([])
  // Always start empty — only pre-fill from auth if displayName is a non-empty string.
  // This forces every user (including signed-in Google users without a displayName) to
  // explicitly type their name before the Confirm button becomes enabled.
  const [claimerName,            setClaimerName]            = useState('')
  const [claimerStation,         setClaimerStation]         = useState('')
  const [claimerEmployeeNumber,  setClaimerEmployeeNumber]  = useState('')

  // Keep user in sync; pre-fill name only when auth provides a real display name.
  useEffect(() => {
    return onAuth((u) => {
      setUser(u)
      if (u?.displayName?.trim()) {
        setClaimerName(prev => prev || u.displayName!.trim())
      }
    })
  }, [])

  // Load available stations
  useEffect(() => {
    getStations().then(setStations)
  }, [])

  async function handleConfirm() {
    if (!selectedDay || !claimerStation || !claimerName.trim()) return

    // Block claim if claimer is from the same center AND their selected replacement
    // day matches any of the owner's requested days off (same date + same shift)
    if (
      claimerStation === offer.ownerStation &&
      offer.daysOff.some(d => d.date === selectedDay.date && d.shift === selectedDay.shift)
    ) {
      toast.error('لا يمكن قبول العرض، لديك نفس المناوبة والمركز')
      return
    }

    setLoading(true)
    // Wrap the chosen (date + shift) pair into the ReplacementDay shape expected by Firestore
    const chosenReplacementDay: ReplacementDay = { date: selectedDay.date, shifts: [selectedDay.shift] }
    try {
      await selectOfferDirect(
        offer.id!,
        user?.uid ?? '',
        user?.displayName || '',
        '',   // code — not required from selector
        '',   // legacy selectorStation — not used in new flow
        chosenReplacementDay,
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
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
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
        <div className="px-5 py-3 bg-blue-50 border-b flex-shrink-0">
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

        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-6">

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

              {/* Replacement day picker — claimer must choose exactly ONE date+shift combination */}
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  اختر <span className="font-semibold text-[#1B3A6B]">مناوبة بديلة واحدة</span> من الخيارات التي يعرضها صاحب العرض
                </p>
                {/* Scrollable list — only this section scrolls */}
                <div className="max-h-48 overflow-y-auto flex flex-col gap-1 rounded-xl border border-gray-200 p-1">
                  {shiftOptions.map((opt, i) => {
                    const isSelected = selectedDay?.date === opt.date && selectedDay?.shift === opt.shift
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedDay(opt)}
                        className={clsx(
                          'flex items-center gap-2 w-full text-right px-3 py-1.5 rounded-lg border text-sm transition-colors',
                          isSelected
                            ? 'bg-green-50 border-green-400 text-green-800 font-semibold'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50/50'
                        )}
                      >
                        {/* Radio indicator */}
                        <span className={clsx(
                          'flex-shrink-0 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center',
                          isSelected ? 'border-green-500' : 'border-gray-300'
                        )}>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-green-500 block" />}
                        </span>
                        <span className="flex-1">{shiftOptionDateLabel(opt)}</span>
                        <span className={clsx(
                          'text-xs px-1.5 py-0.5 rounded-full border',
                          isSelected
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        )}>
                          {shiftLabel[opt.shift] ?? opt.shift}
                        </span>
                      </button>
                    )
                  })}
                </div>
                {!selectedDay && (
                  <p className="text-xs text-red-500 mt-1.5">يرجى اختيار مناوبة للمتابعة</p>
                )}
              </div>

              {/* Station / Location — required */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  المركز / الموقع <span className="text-red-500">*</span>
                </label>
                <select
                  value={claimerStation}
                  onChange={(e) => setClaimerStation(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
                >
                  <option value="">اختر المركز</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
                {!claimerStation && (
                  <p className="text-xs text-red-500 mt-1">المركز مطلوب</p>
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

            </div>
          )}
        </div>

        {/* Sticky footer — confirm/cancel buttons */}
        <div
          className="flex-shrink-0 px-5 pt-3 bg-white border-t border-gray-100"
          style={{ paddingBottom: 'max(1.25rem, var(--safe-bottom))' }}
        >
          {!done && (
            <div className="flex gap-3">
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
          )}
        </div>
      </div>
    </div>
  )
}
