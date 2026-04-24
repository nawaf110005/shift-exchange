'use client'

import { useState, useEffect } from 'react'
import { UserProfileData, saveUserProfile } from '@/lib/firebase/userProfile'
import { getStations, Station } from '@/lib/firebase/firestore'
import { Loader2, UserCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  uid:          string
  isAnonymous:  boolean
  initialData?: Partial<UserProfileData>
  onComplete:   (profile: UserProfileData) => void
  onSkip?:      () => void
}

export default function ProfileSetupModal({
  uid, isAnonymous, initialData, onComplete, onSkip,
}: Props) {
  const [name,           setName]           = useState(initialData?.name           || '')
  const [employeeNumber, setEmployeeNumber] = useState(initialData?.employeeNumber || '')
  const [station,        setStation]        = useState(initialData?.station        || '')
  const [stations,       setStations]       = useState<Station[]>([])
  const [loading,        setLoading]        = useState(false)

  useEffect(() => {
    getStations().then(setStations)
  }, [])

  async function handleSave() {
    if (!name.trim()) { toast.error('الاسم مطلوب'); return }
    if (!station)     { toast.error('المركز مطلوب'); return }

    setLoading(true)
    try {
      const profile: UserProfileData = {
        name:           name.trim(),
        employeeNumber: employeeNumber.trim(),
        station,
      }
      await saveUserProfile(uid, isAnonymous, profile)
      toast.success('تم حفظ ملفك الشخصي ✅')
      onComplete(profile)
    } catch {
      toast.error('حدث خطأ أثناء الحفظ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60">
      <div
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl"
        style={{ paddingBottom: 'max(0px, var(--safe-bottom))' }}
      >
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-4 border-b">
          <div className="flex items-center gap-2 mb-1">
            <UserCircle2 className="w-5 h-5 text-[#2E86AB]" />
            <h2 className="text-lg font-bold text-[#1B3A6B]">إعداد ملفك الشخصي</h2>
          </div>
          <p className="text-sm text-gray-500">
            أدخل معلوماتك مرة واحدة وسيتم ملء النماذج تلقائياً في المرات القادمة
          </p>
        </div>

        <div className="p-5 space-y-4">

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              الاسم <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="الاسم الكامل"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
            />
          </div>

          {/* Employee Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              رقم الموظف
              <span className="text-xs text-gray-400 font-normal mr-1">(اختياري)</span>
            </label>
            <input
              value={employeeNumber}
              onChange={e => setEmployeeNumber(e.target.value.replace(/\D/g, '').slice(0, 7))}
              placeholder="حتى 7 أرقام"
              maxLength={7}
              dir="ltr"
              type="tel"
              inputMode="numeric"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
            />
          </div>

          {/* Station */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              المركز <span className="text-red-500">*</span>
            </label>
            <select
              value={station}
              onChange={e => setStation(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
            >
              <option value="">اختر المركز</option>
              {stations.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl text-sm font-medium min-h-[48px] active:bg-gray-50 transition-colors"
              >
                لاحقاً
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-[#1B3A6B] text-white py-3 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px] active:bg-[#142D52] transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              حفظ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
