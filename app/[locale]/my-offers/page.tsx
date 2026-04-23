'use client'

import { useEffect, useState } from 'react'
import { getMyOffers, deleteOffer, Offer } from '@/lib/firebase/firestore'
import { ensureAnonymousAuth } from '@/lib/firebase/auth'
import { statusColor, statusLabel } from '@/lib/utils/validation'
import OfferForm from '@/components/offers/OfferForm'
import { Plus, Pencil, Trash2, ListCheck, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

export default function MyOffersPage() {
  const [offers,   setOffers]   = useState<Offer[]>([])
  const [loading,  setLoading]  = useState(true)
  const [uid,      setUid]      = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState<Offer | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function load(userUid: string) {
    setLoading(true)
    const data = await getMyOffers(userUid)
    setOffers(data)
    setLoading(false)
  }

  useEffect(() => {
    ensureAnonymousAuth().then(u => { setUid(u); load(u) })
  }, [])

  async function handleDelete(offer: Offer) {
    if (!confirm('هل أنت متأكد من حذف هذا العرض؟')) return
    setDeleting(offer.id!)
    try {
      await deleteOffer(offer.id!)
      toast.success('تم حذف العرض')
      load(uid)
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    } finally {
      setDeleting(null)
    }
  }

  function handleFormClose() {
    setShowForm(false)
    setEditing(null)
    if (uid) load(uid)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1B3A6B]">عروضي</h1>
          <p className="text-gray-500 text-sm mt-0.5">{offers.length} عرض</p>
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

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#2E86AB] border-t-transparent" />
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <ListCheck className="w-14 h-14 mx-auto mb-4 opacity-30" />
          <p className="text-base mb-4">لم تنشئ أي عروض بعد</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-[#1B3A6B] text-white px-6 py-3 rounded-xl text-sm font-semibold active:bg-[#142D52] transition-colors min-h-[48px]"
          >
            إنشاء أول عرض
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map(offer => (
            <div key={offer.id} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 shadow-sm">
              {/* Status + meta row */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap', statusColor(offer.status))}>
                    {statusLabel(offer.status)}
                  </span>
                  <span className="text-sm text-gray-500 truncate">{offer.ownerStation}</span>
                  <span className="text-xs text-gray-400">{offer.offerMonth}</span>
                </div>

                {/* Action buttons — touch-friendly */}
                {offer.status !== 'confirmed' && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setEditing(offer); setShowForm(true) }}
                      className="p-2.5 text-gray-400 active:text-[#2E86AB] active:bg-blue-50 rounded-xl transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {offer.status !== 'selected' && (
                      <button
                        onClick={() => handleDelete(offer)}
                        disabled={deleting === offer.id}
                        className="p-2.5 text-gray-400 active:text-red-500 active:bg-red-50 rounded-xl transition-colors disabled:opacity-50 min-w-[40px] min-h-[40px] flex items-center justify-center"
                      >
                        {deleting === offer.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Days off chips */}
              <div className="mb-2">
                <p className="text-xs text-gray-400 mb-1.5">أيام الطلب</p>
                <div className="flex flex-wrap gap-1">
                  {offer.daysOff.map((d, i) => (
                    <span key={i} className="text-xs bg-red-50 text-red-700 border border-red-100 px-2 py-1 rounded-full">
                      {d.date} · {({ day:'صباحي', night:'مسائي', overlap:'تداخل' } as Record<string,string>)[d.shift]}
                    </span>
                  ))}
                </div>
              </div>

              {/* Selector notification */}
              {offer.selectorName && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-100 rounded-xl">
                  <p className="text-xs text-orange-700 font-medium">
                    ✋ اختاره: {offer.selectorName} — {offer.selectorStation}
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-2">
                {offer.createdAt ? format((offer.createdAt as any).toDate(), 'dd MMM yyyy', { locale: ar }) : ''}
              </p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <OfferForm uid={uid} offer={editing} onClose={handleFormClose} />
      )}
    </div>
  )
}
