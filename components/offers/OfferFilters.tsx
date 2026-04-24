'use client'

import { Station } from '@/lib/firebase/firestore'
import { SlidersHorizontal, X } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  stations:        Station[]
  selectedStation: string
  onStationChange: (v: string) => void
}

export default function OfferFilters({ stations, selectedStation, onStationChange }: Props) {
  return (
    <div className="mb-4">
      {/* Horizontally scrollable chip row — works great on mobile */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
        <div className="flex items-center gap-1 text-gray-400 text-xs flex-shrink-0">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>تصفية</span>
        </div>

        {/* All stations chip */}
        <button
          onClick={() => onStationChange('')}
          className={clsx(
            'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors min-h-[36px]',
            !selectedStation
              ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
              : 'bg-white text-gray-600 border-gray-300 hover:border-[#1B3A6B]'
          )}
        >
          الكل
        </button>

        {/* Station chips */}
        {stations.map(s => (
          <button
            key={s.id}
            onClick={() => onStationChange(selectedStation === s.name ? '' : s.name)}
            className={clsx(
              'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors min-h-[36px]',
              selectedStation === s.name
                ? 'bg-[#2E86AB] text-white border-[#2E86AB]'
                : 'bg-white text-gray-600 border-gray-300 hover:border-[#2E86AB]'
            )}
          >
            {s.name}
          </button>
        ))}

        {/* Clear chip */}
        {selectedStation && (
          <button
            onClick={() => onStationChange('')}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-full text-xs text-red-500 border border-red-200 bg-red-50 min-h-[36px]"
          >
            <X className="w-3 h-3" />
            مسح
          </button>
        )}
      </div>
    </div>
  )
}
