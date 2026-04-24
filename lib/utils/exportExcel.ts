import * as XLSX from 'xlsx'
import { Offer } from '../firebase/firestore'
import { shiftLabel, statusLabel } from './validation'

function formatDaysOff(days: Offer['daysOff']): string {
  return days.map(d => `${d.date} (${shiftLabel(d.shift)})`).join('\n')
}

function formatReplacementDays(days: Offer['replacementDays']): string {
  return days.map(d => `${d.date}: ${d.shifts.map(shiftLabel).join('، ')}`).join('\n')
}

function formatTimestamp(ts: any): string {
  if (!ts) return ''
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  return date.toLocaleDateString('ar-SA', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export function exportOffersToExcel(offers: Offer[], filename = 'تقرير_تبديل_الدوام') {
  const rows = offers.map(o => ({
    'اسم صاحب العرض':      o.ownerName,
    'رقم الموظف':           o.ownerCode,
    'المحطة':               o.ownerStation,
    'أيام الطلب':           formatDaysOff(o.daysOff),
    'الأيام البديلة':       formatReplacementDays(o.replacementDays),
    'اسم المختار':          o.selectorName || '',
    'رقم موظف المختار':     o.selectorCode || '',
    'محطة المختار':         o.selectorStation || '',
    'الحالة':               statusLabel(o.status),
    'تاريخ الإنشاء':        formatTimestamp(o.createdAt),
    'تاريخ التأكيد':        formatTimestamp(o.confirmedAt),
    'اسم المعتمِد':          o.confirmedByName  || '',
    'بريد المعتمِد':         o.confirmedByEmail || '',
  }))

  const ws = XLSX.utils.json_to_sheet(rows)

  // RTL sheet direction
  ws['!cols'] = [
    { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 30 },
    { wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
    { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 28 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'العروض')

  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
}
