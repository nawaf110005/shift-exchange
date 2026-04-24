'use client'

import { Offer } from '@/lib/firebase/firestore'
import { shiftLabel, statusColor, statusLabel } from '@/lib/utils/validation'
import { MapPin, Calendar, Clock, ChevronLeft } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  offer:    Offer
  myUid:    string
  onSelect: () => void
  compact?: boolean
}

export default function OfferCard({ offer, myUid, onSelect, compact = false }: Props) {
  const isOwn     = offer.ownerUid === myUid
  const canSelect = !isOwn && offer.status === 'in_progress'

  return (
    <div className={clsx(
      'bg-white rounded-2xl border border-gray-100 shadow-sm active:shadow-none transition-all card-touch',
      compact ? 'p-3' : 'p-4 sm:p-5'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-[#1B3A6B] text-base truncate">{offer.ownerName}</p>
          <div className="flex items-center gap-1 text-gray-500 text-sm mt-0.5">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{offer.ownerStation}</span>
          </div>
        </div>
        <span className={clsx(
          'text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap mr-2',
          statusColor(offer.status)
        )}>
          {statusLabel(offer.status)}
        </span>
      </div>

      {!compact && (
        <>
          {/* Days off */}
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              أيام الطلب
            </p>
            <div className="flex flex-wrap gap-1">
              {offer.daysOff.map((d, i) => (
                <span key={i} className="text-xs bg-red-50 text-red-700 border border-red-100 px-2 py-1 rounded-full">
                  {d.date} · {shiftLabel(d.shift)}
                </span>
              ))}
            </div>
          </div>

          {/* Replacement days */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1.5 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              الأيام البديلة
            </p>
            <div className="flex flex-wrap gap-1">
              {offer.replacementDays.slice(0, 3).map((d, i) => (
                <span key={i} className="text-xs bg-green-50 text-green-700 border border-green-100 px-2 py-1 rounded-full">
                  {d.date} · {d.shifts.map(shiftLabel).join('، ')}
                </span>
              ))}
              {offer.replacementDays.length > 3 && (
                <span className="text-xs text-gray-400 self-center">
                  +{offer.replacementDays.length - 3} أيام
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {/* Action button — min 48px height for touch */}
      {canSelect && (
        <button
          onClick={onSelect}
          className="w-full flex items-center justify-center gap-2 bg-[#1B3A6B] active:bg-[#142D52] text-white text-sm font-semibold py-3 rounded-xl transition-colors min-h-[48px]"
        >
          اختيار هذا العرض
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}
      {isOwn && (
        <div className="text-center text-xs text-gray-400 py-2">عرضك الخاص</div>
      )}
      {!canSelect && !isOwn && offer.status !== 'in_progress' && (
        <div className="text-center text-xs text-gray-400 py-2">
          {offer.status === 'selected' ? 'تم اختيار هذا العرض' : 'تم تأكيد العرض'}
        </div>
      )}
    </div>
  )
}
