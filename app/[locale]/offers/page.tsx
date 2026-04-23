'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { subscribeToInProgressOffers, getStations, Offer, Station } from '@/lib/firebase/firestore'
import { ensureAnonymousAuth } from '@/lib/firebase/auth'
import OfferCard from '@/components/offers/OfferCard'
import SelectOfferModal from '@/components/offers/SelectOfferModal'
import OfferFilters from '@/components/offers/OfferFilters'
import { CalendarDays, List } from 'lucide-react'
import clsx from 'clsx'

const OfferCalendar = dynamic(() => import('@/components/offers/OfferCalendar'), { ssr: false })

export default function OffersPage() {
  const [offers,   setOffers]   = useState<Offer[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [loading,  setLoading]  = useState(true)
  // Default to list on mobile (detected client-side)
  const [view,     setView]     = useState<'calendar' | 'list'>('list')
  const [station,  setStation]  = useState('')
  const [selected, setSelected] = useState<Offer | null>(null)
  const [myUid,    setMyUid]    = useState<string>('')

  useEffect(() => {
    ensureAnonymousAuth().then(uid => setMyUid(uid))
    getStations().then(setStations)
  }, [])

  useEffect(() => {
    setLoading(true)
    const unsub = subscribeToInProgressOffers((data) => {
      setOffers(data)
      setLoading(false)
    }, station || undefined)
    return unsub
  }, [station])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1B3A6B]">عروض تبادل الدوام</h1>
          <p className="text-gray-500 text-sm mt-0.5">{offers.length} عرض متاح</p>
        </div>

        {/* View toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setView('calendar')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px]',
              view === 'calendar'
                ? 'bg-white text-[#1B3A6B] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <CalendarDays className="w-4 h-4" />
            <span className="hidden sm:inline">تقويم</span>
          </button>
          <button
            onClick={() => setView('list')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[40px]',
              view === 'list'
                ? 'bg-white text-[#1B3A6B] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">قائمة</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <OfferFilters
        stations={stations}
        selectedStation={station}
        onStationChange={setStation}
      />

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#2E86AB] border-t-transparent" />
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <CalendarDays className="w-14 h-14 mx-auto mb-4 opacity-30" />
          <p className="text-base">لا توجد عروض متاحة حالياً</p>
        </div>
      ) : view === 'calendar' ? (
        <OfferCalendar offers={offers} onSelectOffer={setSelected} myUid={myUid} />
      ) : (
        /* Mobile: 1 col, tablet: 2 col, desktop: 3 col */
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map(offer => (
            <OfferCard
              key={offer.id}
              offer={offer}
              myUid={myUid}
              onSelect={() => setSelected(offer)}
            />
          ))}
        </div>
      )}

      {selected && (
        <SelectOfferModal
          offer={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
