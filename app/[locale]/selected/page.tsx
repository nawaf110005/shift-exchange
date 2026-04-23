'use client'

import { useEffect, useState } from 'react'
import { getSelectedOffers, Offer } from '@/lib/firebase/firestore'
import { ensureAnonymousAuth } from '@/lib/firebase/auth'
import { statusColor, statusLabel } from '@/lib/utils/validation'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase/config'
import { Bookmark, XCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

export default function SelectedOffersPage() {
  const [offers,    setOffers]    = useState<Offer[]>([])
  const [loading,   setLoading]   = useState(true)
  const [uid,       setUid]       = useState('')
  const [canceling, setCanceling] = useState<string | null>(null)

  async function load(userUid: string) {
    setLoading(true)
    const data = await getSelectedOffers(userUid)
    setOffers(data)
    setLoading(false)
  }

  useEffect(() => {
    ensureAnonymousAuth().then(u => {
      setUid(u)
      load(u)
    })
  }, [])

  async function handleCancel(offerId: string) {
    if (!confirm('هل تريد إلغاء اختيارك لهذا العرض؟')) return
    setCanceling(offerId)
    try {
      const fn = httpsCallable(functions, 'cancelSelection')
      await fn({ offerId })
      toast.success('تم إلغاء الاختيار')
      load(uid)
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ')
    } finally {
      setCanceling(null)
    }
  }

  const shiftLabel: Record<string, string> = {
    day: 'صباحي', night: 'مسائي', overlap: 'تداخل',
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1B3A6B]">عروضي المختارة</h1>
        <p className="text-gray-500 text-sm mt-1">
          العروض التي اخترتها للتبادل · {offers.length} / 20
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
        <div className="space-y-4">
          {offers.map(offer => (
            <div key={offer.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Status + station */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full', statusColor(offer.status))}>
                      {statusLabel(offer.status)}
                    </span>
                    <span className="text-sm text-gray-600 font-medium">{offer.ownerName}</span>
                    <span className="text-sm text-gray-400">· {offer.ownerStation}</span>
                  </div>

                  {/* Days off */}
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-1">أيام الطلب</p>
                    <div className="flex flex-wrap gap-1">
                      {offer.daysOff.map((d, i) => (
                        <span key={i} className="text-xs bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full">
                          {d.date} · {shiftLabel[d.shift]}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Replacement days count */}
                  <p className="text-xs text-gray-400">
                    {offer.replacementDays.length} يوم بديل متاح
                  </p>

                  {/* Confirmed notice */}
                  {offer.status === 'confirmed' && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                      <p className="text-xs text-green-700 font-medium">✅ تم تأكيد هذا التبادل من قِبل الإدارة</p>
                    </div>
                  )}

                  {/* Created date */}
                  <p className="text-xs text-gray-400 mt-2">
                    {offer.createdAt ? format((offer.createdAt as any).toDate(), 'dd MMM yyyy', { locale: ar }) : ''}
                  </p>
                </div>

                {/* Cancel button — only for selected (not confirmed) */}
                {offer.status === 'selected' && (
                  <button
                    onClick={() => handleCancel(offer.id!)}
                    disabled={canceling === offer.id}
                    className="flex items-center gap-1.5 text-xs bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 mr-4"
                  >
                    {canceling === offer.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <XCircle className="w-3.5 h-3.5" />
                    }
                    إلغاء الاختيار
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
