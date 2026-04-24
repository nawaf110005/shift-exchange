'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Offer, DayOff, ReplacementDay, ShiftType,
  createOffer, updateOffer, getStations, Station,
  hasActiveOfferForMonth, getOffersForMonth, computeMatchScore,
} from '@/lib/firebase/firestore'
import { validateEmployeeCode, validateDaysOff, validateReplacementDays } from '@/lib/utils/validation'
import { X, Plus, Trash2, Loader2, Sparkles, MapPin, ArrowLeftCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import SelectOfferModal from '@/components/offers/SelectOfferModal'
import clsx from 'clsx'

const SHIFTS: { value: ShiftType; label: string }[] = [
  { value: 'day',     label: 'صباحي'  },
  { value: 'night',   label: 'مسائي'  },
  { value: 'overlap', label: 'تداخل'  },
]

interface MatchResult {
  offer: Offer
  score: number
}

interface Props {
  uid:          string
  displayName?: string | null  // from Google account
  offer?:       Offer | null
  onClose:      () => void
}

// ─── Match score colour ───────────────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 75) return { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (score >= 40) return { bar: 'bg-amber-400',   badge: 'bg-amber-50   text-amber-700   border-amber-200'   }
  return                 { bar: 'bg-gray-300',      badge: 'bg-gray-50    text-gray-500    border-gray-200'    }
}

// ─── Shift label map ──────────────────────────────────────────────────────────
const shiftLabel: Record<string, string> = { day: 'صباحي', night: 'مسائي', overlap: 'تداخل' }

export default function OfferForm({ uid, displayName, offer, onClose }: Props) {
  const isEdit = !!offer

  const [name,            setName]            = useState(offer?.ownerName    || displayName || '')
  const [code,            setCode]            = useState(offer?.ownerCode    || '')
  const [station,         setStation]         = useState(offer?.ownerStation || '')
  // Always exactly one day off — take the first entry from existing offer, or a blank default
  const [daysOff,         setDaysOff]         = useState<DayOff[]>([offer?.daysOff?.[0] ?? { date: '', shift: 'day' }])
  const [replacementDays, setReplacementDays] = useState<ReplacementDay[]>(offer?.replacementDays || [{ date: '', shifts: ['day'] }])
  const [stations,        setStations]        = useState<Station[]>([])
  const [loading,         setLoading]         = useState(false)

  // Match state
  const [matches,        setMatches]        = useState<MatchResult[]>([])
  const [matchLoading,   setMatchLoading]   = useState(false)
  const [matchMonth,     setMatchMonth]     = useState('')
  const [selectingOffer, setSelectingOffer] = useState<Offer | null>(null)

  // Date bounds
  const today   = new Date().toISOString().split('T')[0]
  const maxDate = (() => { const d = new Date(); d.setMonth(d.getMonth() + 2); return d.toISOString().split('T')[0] })()

  useEffect(() => {
    getStations().then(setStations)
  }, [])

  // ─── Live match lookup ────────────────────────────────────────────────────
  const refreshMatches = useCallback(async (days: DayOff[], replacements: ReplacementDay[]) => {
    const firstValidDate = days.find(d => d.date)?.date
    if (!firstValidDate) { setMatches([]); setMatchMonth(''); return }

    const month = firstValidDate.substring(0, 7)

    setMatchLoading(true)
    try {
      const allOffers = await getOffersForMonth(month)
      // Exclude own offers
      const others = allOffers.filter(o => o.ownerUid !== uid && o.id !== offer?.id)

      const scored: MatchResult[] = others
        .map(o => ({ offer: o, score: computeMatchScore(days, replacements, o) }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)

      setMatches(scored)
      setMatchMonth(month)
    } finally {
      setMatchLoading(false)
    }
  }, [uid, offer?.id])

  // Debounced trigger: re-check whenever daysOff or replacementDays change
  useEffect(() => {
    const timer = setTimeout(() => refreshMatches(daysOff, replacementDays), 600)
    return () => clearTimeout(timer)
  }, [daysOff, replacementDays, refreshMatches])

  // ─── Day Off helper ───────────────────────────────────────────────────────
  function updateDayOff(i: number, field: keyof DayOff, value: string) {
    setDaysOff(d => d.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item
    ))
  }

  // ─── Replacement Days helpers ─────────────────────────────────────────────
  function addReplacement() {
    if (replacementDays.length >= 16) { toast.error('الحد الأقصى 16 يوم'); return }
    setReplacementDays(d => [...d, { date: '', shifts: ['day'] }])
  }
  function removeReplacement(i: number) {
    setReplacementDays(d => d.filter((_, idx) => idx !== i))
  }
  function updateReplacementDate(i: number, value: string) {
    setReplacementDays(d => d.map((item, idx) => idx === i ? { ...item, date: value } : item))
  }
  function toggleReplacementShift(i: number, shift: ShiftType) {
    setReplacementDays(d => d.map((item, idx) => {
      if (idx !== i) return item
      const shifts = item.shifts.includes(shift)
        ? item.shifts.filter(s => s !== shift)
        : [...item.shifts, shift]
      return { ...item, shifts: shifts.length === 0 ? [shift] : shifts }
    }))
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const codeErr = validateEmployeeCode(code)
    if (codeErr) { toast.error(codeErr); return }
    if (!name.trim()) { toast.error('الاسم مطلوب'); return }
    if (!station)     { toast.error('المحطة مطلوبة'); return }

    const daysErr = validateDaysOff(daysOff)
    if (daysErr) { toast.error(daysErr); return }

    const offerMonth = daysOff[0].date.substring(0, 7)
    const replErr = validateReplacementDays(replacementDays, offerMonth)
    if (replErr) { toast.error(replErr); return }

    if (!isEdit) {
      const duplicate = await hasActiveOfferForMonth(uid, offerMonth)
      if (duplicate) { toast.error('لديك عرض نشط لهذا الشهر بالفعل'); return }
    }

    setLoading(true)
    try {
      if (isEdit && offer?.id) {
        await updateOffer(offer.id, {
          ownerName:       name.trim(),
          ownerCode:       code.trim(),
          ownerStation:    station,
          daysOff,
          replacementDays,
        })
        toast.success('تم تحديث العرض')
      } else {
        await createOffer({
          ownerUid:        uid,
          ownerName:       name.trim(),
          ownerCode:       code.trim(),
          ownerStation:    station,
          status:          'in_progress',
          offerMonth,
          daysOff,
          replacementDays,
        })
        toast.success('تم إنشاء العرض بنجاح ✅')
      }
      onClose()
    } catch {
      toast.error('حدث خطأ، يرجى المحاولة مجدداً')
    } finally {
      setLoading(false)
    }
  }

  const hasValidDays = daysOff.some(d => d.date)

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[96vh] flex flex-col"
           style={{ paddingBottom: 'max(0px, var(--safe-bottom))' }}>

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <h2 className="text-lg font-bold text-[#1B3A6B]">
            {isEdit ? 'تعديل العرض' : 'إنشاء عرض جديد'}
          </h2>
          <button onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl min-w-[40px] min-h-[40px] flex items-center justify-center">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1">

          {/* Owner info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="الاسم الكامل"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2E86AB]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                رقم الموظف
                <span className="text-xs text-gray-400 font-normal mr-1">(اختياري)</span>
              </label>
              <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g,'').slice(0,7))}
                placeholder="حتى 7 أرقام" maxLength={7} dir="ltr" type="tel" inputMode="numeric"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2E86AB]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">المحطة</label>
              <select value={station} onChange={e => setStation(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#2E86AB]">
                <option value="">اختر المحطة</option>
                {stations.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Days off — exactly one day */}
          <div>
            <div className="mb-3">
              <label className="text-sm font-semibold text-gray-700">يوم الطلب</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" value={daysOff[0]?.date ?? ''} min={today} max={maxDate}
                onChange={e => updateDayOff(0, 'date', e.target.value)}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#2E86AB]" />
              <select value={daysOff[0]?.shift ?? 'day'} onChange={e => updateDayOff(0, 'shift', e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#2E86AB]">
                {SHIFTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Replacement days */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">
                الأيام البديلة <span className="text-gray-400 text-xs font-normal">({replacementDays.length}/16)</span>
              </label>
              <button type="button" onClick={addReplacement}
                className="flex items-center gap-1 text-sm text-[#2E86AB] font-medium px-3 py-1.5 rounded-lg bg-blue-50 min-h-[36px]">
                <Plus className="w-4 h-4" /> إضافة يوم
              </button>
            </div>
            <div className="space-y-2">
              {replacementDays.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="date" value={d.date}
                    onChange={e => updateReplacementDate(i, e.target.value)}
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#2E86AB]" />
                  <div className="flex gap-1">
                    {SHIFTS.map(s => (
                      <button key={s.value} type="button"
                        onClick={() => toggleReplacementShift(i, s.value)}
                        className={clsx(
                          'px-2.5 py-2 rounded-lg text-xs font-medium transition-colors min-h-[40px]',
                          d.shifts.includes(s.value)
                            ? 'bg-[#1B3A6B] text-white'
                            : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                        )}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  {replacementDays.length > 1 && (
                    <button type="button" onClick={() => removeReplacement(i)}
                      className="p-2.5 text-gray-400 active:text-red-500 active:bg-red-50 rounded-xl transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ─── Live Match Panel ─────────────────────────────────────── */}
          {hasValidDays && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              {/* Panel header */}
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[#2E86AB]" />
                <p className="text-sm font-semibold text-[#1B3A6B]">
                  عروض مطابقة محتملة
                </p>
                {matchLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400 mr-auto" />}
              </div>

              {!matchLoading && matches.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">
                  لا توجد عروض مطابقة لهذا الشهر حتى الآن
                </p>
              )}

              {matches.length > 0 && (
                <div className="space-y-2">
                  {matches.slice(0, 5).map(({ offer: m, score }) => {
                    const { bar, badge } = scoreColor(score)
                    return (
                      <div key={m.id}
                        className="bg-white rounded-xl border border-gray-100 px-3 py-2.5 shadow-sm">
                        {/* Top row: name + score badge */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{m.ownerName}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{m.ownerStation}</span>
                            </div>
                          </div>
                          <span className={clsx(
                            'text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0',
                            badge
                          )}>
                            {score}٪
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                          <div className={clsx('h-full rounded-full transition-all', bar)}
                               style={{ width: `${score}%` }} />
                        </div>

                        {/* Their requested days */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {m.daysOff.map((d, i) => (
                            <span key={i}
                              className="text-[10px] bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded-full">
                              {d.date.substring(5)} · {shiftLabel[d.shift]}
                            </span>
                          ))}
                        </div>

                        {/* Select this offer */}
                        <button
                          type="button"
                          onClick={() => setSelectingOffer(m)}
                          className="w-full flex items-center justify-center gap-1.5 bg-[#1B3A6B] text-white text-xs font-semibold py-2 rounded-lg active:bg-[#142D52] transition-colors min-h-[36px]"
                        >
                          <ArrowLeftCircle className="w-3.5 h-3.5" />
                          اختيار هذا العرض
                        </button>
                      </div>
                    )
                  })}

                  {matches.length > 5 && (
                    <p className="text-xs text-center text-gray-400 pt-1">
                      + {matches.length - 5} عروض أخرى في الصفحة الرئيسية
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-3.5 rounded-xl text-sm font-medium active:bg-gray-50 transition-colors min-h-[52px]">
              إلغاء
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-[#1B3A6B] text-white py-3.5 rounded-xl text-sm font-semibold active:bg-[#142D52] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 min-h-[52px]">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? 'حفظ التعديلات' : 'نشر العرض'}
            </button>
          </div>
        </form>
      </div>
    </div>

    {/* Select a matched offer directly from the form */}
    {selectingOffer && (
      <SelectOfferModal
        offer={selectingOffer}
        onClose={() => setSelectingOffer(null)}
      />
    )}
    </>
  )
}
