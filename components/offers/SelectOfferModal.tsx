'use client'

import { useState } from 'react'
import { Offer, getStations, Station } from '@/lib/firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase/config'
import { validateEmployeeCode } from '@/lib/utils/validation'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useEffect } from 'react'

interface Props {
  offer:   Offer
  onClose: () => void
}

export default function SelectOfferModal({ offer, onClose }: Props) {
  const [name,     setName]     = useState('')
  const [code,     setCode]     = useState('')
  const [station,  setStation]  = useState('')
  const [stations, setStations] = useState<Station[]>([])
  const [loading,  setLoading]  = useState(false)
  const [errors,   setErrors]   = useState<Record<string, string>>({})

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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const selectOffer = httpsCallable(functions, 'selectOffer')
      await selectOffer({
        offerId:         offer.id,
        selectorName:    name.trim(),
        selectorCode:    code.trim(),
        selectorStation: station,
      })
      toast.success('تم اختيار العرض بنجاح ✅')
      onClose()
    } catch (err: any) {
      const msg = err?.message || 'حدث خطأ، يرجى المحاولة مجدداً'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    /* On mobile: bottom sheet. On desktop: centered modal */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto"
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
        </div>

        {/* Form */}
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
      </div>
    </div>
  )
}
