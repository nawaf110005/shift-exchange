'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import arLocale from '@fullcalendar/core/locales/ar'
import { Offer } from '@/lib/firebase/firestore'
import { useMemo } from 'react'

interface Props {
  offers:         Offer[]
  myUid:          string
  onSelectOffer:  (offer: Offer) => void
}

const SHIFT_COLORS: Record<string, string> = {
  day:     '#2E86AB',
  night:   '#1B3A6B',
  overlap: '#E67E22',
}

export default function OfferCalendar({ offers, myUid, onSelectOffer }: Props) {
  // Build calendar events from offers
  const events = useMemo(() => {
    const evts: any[] = []
    offers.forEach(offer => {
      offer.daysOff.forEach(d => {
        evts.push({
          id:              `${offer.id}-${d.date}-${d.shift}`,
          title:           `${offer.ownerStation} · ${offer.ownerName.split(' ')[0]}`,
          date:            d.date,
          backgroundColor: SHIFT_COLORS[d.shift] || '#888',
          borderColor:     SHIFT_COLORS[d.shift] || '#888',
          extendedProps:   { offer, shift: d.shift },
        })
      })
    })
    return evts
  }, [offers])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={arLocale}
        direction="rtl"
        events={events}
        eventClick={(info) => {
          const offer: Offer = info.event.extendedProps.offer
          if (offer.ownerUid !== myUid) {
            onSelectOffer(offer)
          }
        }}
        eventContent={(info) => (
          <div className="px-1 py-0.5 text-xs text-white truncate cursor-pointer">
            {info.event.title}
          </div>
        )}
        headerToolbar={{
          start:  'prev,next',
          center: 'title',
          end:    'today',
        }}
        height="auto"
        buttonText={{ today: 'اليوم', month: 'شهر' }}
      />

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-gray-600">
        <span className="font-medium">نوع الدوام:</span>
        {Object.entries({ day: 'صباحي', night: 'مسائي', overlap: 'تداخل' }).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: SHIFT_COLORS[key] }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
