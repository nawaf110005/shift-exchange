'use client'

import { useState, useEffect } from 'react'
import {
  Offer, DayOff, ReplacementDay, ShiftType,
  createOffer, updateOffer, getStations, Station,
  hasActiveOfferForMonth,
} from '@/lib/firebase/firestore'
import { validateEmployeeCode, validateDaysOff, validateReplacementDays, getOfferMonth } from '@/lib/utils/validation'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, addMonths } from 'date-fns'

const SHIFTS: { value: ShiftType; label: string }[] = [
  { value: 'day',     label: 'صباحي'  },
  { value: 'night',   label: 'مسائي'  },
  { value: 'overlap', label: 'تداخل'  },
]

interface Props {
  uid:     string
  offer?:  Offer | null
  onClose: () => void
}

export default function OfferForm({ uid, offer, onClose }: Props) {
  const isEdit = !!offer

  const [name,            setName]            = useState(offer?.ownerName    || '')
  const [code,            setCode]            = useState(offer?.ownerCode    || '')
  const [station,         setStation]         = useState(offer?.ownerStation || '')
  const [daysOff,         setDaysOff]         = useState<DayOff[]>(offer?.daysOff || [{ date: '', shift: 'day' }])
  const [replacementDays, setReplacementDays] = useState<ReplacementDay[]>(offer?.replacementDays || [{ date: '', shifts: ['day'] }])
  const [stations,        setStations]        = useState<Station[]>([])
  const [loading,         setLoading]         = useState(false)

  // Date bounds
  const today   = format(new Date(), 'yyyy-MM-dd')
  const maxDate = format(addMonths(new Date(), 2), 'yyyy-MM-dd')

  useEffect(() => {
    getStations().then(setStations)
  }, [])

  // ─── Days Off helpers ─────────────────────────────────────────
  function addDayOff() {
    setDaysOff(d => [...d, { date: '', shift: 'day' }])
  }
  function removeDayOff(i: number) {
    setDaysOff(d => d.filter((_, idx) => idx !== i))
  }
  function updateDayOff(i: number, field: keyof DayOff, value: string) {
    setDaysOff(d => d.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item
    ))
  }

  // ─── Replacement Days helpers ─────────────────────────────────
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

  // ─── Submit ───────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate
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
    } catch (err) {
      toast.error('حدث خطأ، يرجى المحاولة مجدداً')
    } finally {
      setLoading(false)
    }
  }

  return (
    /* Full-screen on mobile, modal on desktop */
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
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl min-w-[40px] min-h-[40px] flex items-center justify-center">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Owner info — stacked on mobile, grid on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="الاسم الكامل"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2E86AB]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الموظف</label>
              <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                placeholder="6 أرقام" maxLength={6} dir="ltr" type="tel" inputMode="numeric"
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

          {/* Days off */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">أيام الطلب</label>
              <button type="button" onClick={addDayOff}
                className="flex items-center gap-1 text-sm text-[#2E86AB] font-medium px-3 py-1.5 rounded-lg bg-blue-50 min-h-[36px]">
                <Plus className="w-4 h-4" /> إضافة يوم
              </button>
            </div>
            <div className="space-y-2">
              {daysOff.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="date" value={d.date} min={today} max={maxDate}
                    onChange={e => updateDayOff(i, 'date', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-[#2E86AB]" />
                  <select value={d.shift} onChange={e => updateDayOff(i, 'shift', e.target.value)}
                    className="border border-gray-300 rounded-xl px-3 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#2E86AB]">
                    {SHIFTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  {daysOff.length > 1 && (
                    <button type="button" onClick={() => removeDayOff(i)}
                      className="p-2.5 text-gray-400 active:text-red-500 active:bg-red-50 rounded-xl transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
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
                        className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-colors min-h-[40px] ${
                          d.shifts.includes(s.value)
                            ? 'bg-[#1B3A6B] text-white'
                            : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                        }`}>
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
  )
}
