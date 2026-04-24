import * as XLSX from 'xlsx'
import { Offer } from '../firebase/firestore'
import { shiftLabel } from './validation'

const ARABIC_MONTHS: Record<string, string> = {
  '01':'يناير','02':'فبراير','03':'مارس','04':'أبريل',
  '05':'مايو','06':'يونيو','07':'يوليو','08':'أغسطس',
  '09':'سبتمبر','10':'أكتوبر','11':'نوفمبر','12':'ديسمبر',
}

/** Full date string: "صباحي - 25 أبريل 2026" */
function formatDayShiftFull(date: string, shift: string): string {
  const [yyyy, mm, dd] = date.split('-')
  return `${shiftLabel(shift)} - ${parseInt(dd)} ${ARABIC_MONTHS[mm]} ${yyyy}`
}

/** Format all daysOff entries (one per line) with full shift + full date */
function formatDaysOffFull(days: Offer['daysOff']): string {
  return days.map(d => formatDayShiftFull(d.date, d.shift)).join('\n')
}

/** Format selectedReplacementDay with full shift names + full date */
function formatReplacementDayFull(day?: Offer['selectedReplacementDay']): string {
  if (!day) return ''
  const [yyyy, mm, dd] = day.date.split('-')
  const dateStr = `${parseInt(dd)} ${ARABIC_MONTHS[mm]} ${yyyy}`
  if (!day.shifts?.length) return dateStr
  return `${day.shifts.map(shiftLabel).join('، ')} - ${dateStr}`
}

export function exportOffersToExcel(offers: Offer[], filename = 'تقرير_تبديل_الدوام') {
  const rows = offers.map(o => ({
    'صاحب العرض':             o.ownerName,
    'رقم الموظف':              o.ownerCode,
    'المركز':                  o.ownerStation,
    'يوم الطلب':               formatDaysOffFull(o.daysOff),
    'البديل':                  o.claimerName || o.selectorName || '',
    'رقم الموظف (البديل)':     o.claimerEmployeeNumber || o.selectorCode || '',
    'مركز البديل':             o.claimerStation || o.selectorStation || '',
    'يوم التبديل':             formatReplacementDayFull(o.selectedReplacementDay),
    'اسم الأدمن المؤكد':       o.confirmedByName || '',
    'إيميل الأدمن المؤكد':     o.confirmedByEmail || '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)

  ws['!cols'] = [
    { wch: 22 }, // صاحب العرض
    { wch: 14 }, // رقم الموظف
    { wch: 16 }, // المركز
    { wch: 32 }, // يوم الطلب
    { wch: 22 }, // البديل
    { wch: 18 }, // رقم الموظف (البديل)
    { wch: 18 }, // مركز البديل
    { wch: 32 }, // يوم التبديل
    { wch: 24 }, // اسم الأدمن المؤكد
    { wch: 30 }, // إيميل الأدمن المؤكد
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'العروض')

  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
}
