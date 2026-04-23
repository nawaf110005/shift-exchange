import { DayOff, ReplacementDay } from '../firebase/firestore'
import { addMonths, format, isAfter, isBefore, parseISO, startOfDay } from 'date-fns'

export interface ValidationError {
  field: string
  message: string
}

/** Validate employee code: exactly 6 numeric digits */
export function validateEmployeeCode(code: string): string | null {
  if (!code) return 'رقم الموظف مطلوب'
  if (!/^\d{6}$/.test(code)) return 'رقم الموظف يجب أن يكون 6 أرقام فقط'
  return null
}

/** Validate offer days off */
export function validateDaysOff(days: DayOff[]): string | null {
  if (!days || days.length === 0) return 'يجب اختيار يوم واحد على الأقل'

  const today = startOfDay(new Date())
  const maxDate = addMonths(today, 2)

  for (const d of days) {
    const date = parseISO(d.date)
    if (isBefore(date, today)) return `التاريخ ${d.date} قبل اليوم`
    if (isAfter(date, maxDate)) return `التاريخ ${d.date} يتجاوز شهرين من الآن`
    if (!d.shift) return 'يجب تحديد نوع الدوام لكل يوم'
  }
  return null
}

/** Validate replacement days */
export function validateReplacementDays(days: ReplacementDay[], offerMonth: string): string | null {
  if (!days || days.length === 0) return 'يجب اختيار يوم بديل واحد على الأقل'
  if (days.length > 16) return 'الحد الأقصى 16 يوم بديل'

  for (const d of days) {
    const month = d.date.substring(0, 7) // YYYY-MM
    if (month !== offerMonth) return `اليوم ${d.date} خارج نطاق الشهر المطلوب`
    if (!d.shifts || d.shifts.length === 0) return 'يجب اختيار نوع دوام واحد على الأقل لكل يوم بديل'
  }
  return null
}

/** Get YYYY-MM from a date */
export function getOfferMonth(date: Date = new Date()): string {
  return format(date, 'yyyy-MM')
}

/** Get human-readable shift label in Arabic */
export function shiftLabel(shift: string): string {
  const labels: Record<string, string> = {
    day:     'صباحي',
    night:   'مسائي',
    overlap: 'تداخل',
  }
  return labels[shift] || shift
}

/** Format offer status in Arabic */
export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    in_progress: 'متاح',
    selected:    'تم الاختيار',
    confirmed:   'مؤكد',
  }
  return labels[status] || status
}

/** Get status badge color */
export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    in_progress: 'bg-green-100 text-green-800',
    selected:    'bg-orange-100 text-orange-800',
    confirmed:   'bg-gray-100 text-gray-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
