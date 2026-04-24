'use client'

import { useEffect, useState } from 'react'
import { signInWithGoogle, logOut, isAdmin as checkAdmin, onAuth } from '@/lib/firebase/auth'
import { getAllOffersAdmin, updateOffer, deleteOffer, ownerAcceptOffer, getStations, createStation, Offer, Station, OfferStatus } from '@/lib/firebase/firestore'
import { exportOffersToExcel } from '@/lib/utils/exportExcel'
import { statusColor, statusLabel } from '@/lib/utils/validation'
import { ShieldCheck, LogOut, Download, Trash2, CheckCircle, Loader2, Plus } from 'lucide-react'
import { User } from 'firebase/auth'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function AdminPage() {
  const [user,       setUser]       = useState<User | null>(null)
  const [admin,      setAdmin]      = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [offers,     setOffers]     = useState<Offer[]>([])
  const [stations,   setStations]   = useState<Station[]>([])
  const [newStation, setNewStation] = useState('')
<<<<<<< HEAD
  const [confirming, setConfirming] = useState<Record<string, boolean>>({})

  // Filters — default: current month, all action-needed statuses (selected + confirmed)
=======

  // Filters — default: current month, show selected + confirmed (action-needed offers)
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
  const [filterStatus,  setFilterStatus]  = useState<OfferStatus | ''>('')
  const [filterStation, setFilterStation] = useState('')
  const [filterMonth,   setFilterMonth]   = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    return onAuth(async (u) => {
      setUser(u)
      if (u) {
        const adminFlag = await checkAdmin()
        setAdmin(adminFlag)
        if (adminFlag) {
          loadOffers()
          getStations(false).then(setStations)
        }
      } else {
        setAdmin(false)
      }
      setLoading(false)
    })
  }, [])

  async function loadOffers() {
    const data = await getAllOffersAdmin({
      status:  filterStatus  as OfferStatus || undefined,
      station: filterStation || undefined,
      month:   filterMonth   || undefined,
    })
    setOffers(data)
  }

  async function handleGoogleLogin() {
    try {
      const u = await signInWithGoogle()
      const adminFlag = await checkAdmin()
      if (!adminFlag) {
        toast.error('ليس لديك صلاحيات إدارية. تواصل مع المسؤول لمنح الصلاحية.')
        await logOut()
        return
      }
      setAdmin(true)
      toast.success(`مرحباً ${u.displayName}`)
    } catch (err: any) {
      toast.error('فشل تسجيل الدخول')
    }
  }

  async function handleStatusChange(offerId: string, newStatus: OfferStatus) {
<<<<<<< HEAD
    if (newStatus === 'confirmed') {
      setConfirming(prev => ({ ...prev, [offerId]: true }))
    }
    try {
      if (newStatus === 'confirmed') {
        await ownerAcceptOffer(
          offerId,
          user?.displayName ?? undefined,
          user?.email ?? undefined,
        )
=======
    try {
      if (newStatus === 'confirmed') {
        await ownerAcceptOffer(offerId)
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
      } else {
        await updateOffer(offerId, { status: newStatus })
      }
      toast.success('تم تحديث الحالة')
      loadOffers()
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ')
<<<<<<< HEAD
    } finally {
      setConfirming(prev => { const n = { ...prev }; delete n[offerId]; return n })
=======
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
    }
  }

  async function handleDelete(offerId: string) {
    if (!confirm('هل أنت متأكد من حذف هذا العرض؟')) return
    try {
      await deleteOffer(offerId)
      toast.success('تم حذف العرض')
      loadOffers()
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    }
  }

  async function handleAddStation() {
    if (!newStation.trim()) return
    await createStation(newStation.trim())
    setNewStation('')
    getStations(false).then(setStations)
    toast.success('تمت إضافة المحطة')
  }

  // ── Login screen ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 className="w-10 h-10 animate-spin text-[#2E86AB]" />
      </div>
    )
  }

  if (!user || !admin) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white rounded-2xl shadow-xl p-8 text-center">
        <ShieldCheck className="w-16 h-16 mx-auto text-[#1B3A6B] mb-4" />
        <h1 className="text-2xl font-bold text-[#1B3A6B] mb-2">لوحة الإدارة</h1>
        <p className="text-gray-500 mb-6">سجّل الدخول بحساب Google المعتمد للمسؤول</p>
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 hover:border-[#2E86AB] text-gray-700 py-3 px-4 rounded-xl font-medium transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          تسجيل الدخول بـ Google
        </button>
      </div>
    )
  }

  // ── Admin Dashboard ─────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3A6B]">لوحة الإدارة</h1>
          <p className="text-gray-500 text-sm">{user.displayName} · {user.email}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => exportOffersToExcel(offers)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            تصدير Excel
          </button>
          <button
            onClick={() => logOut()}
            className="flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            خروج
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-500 mb-1">الحالة</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as OfferStatus | '')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2E86AB]">
            <option value="">مختارة + مؤكدة</option>
            <option value="in_progress">متاح</option>
            <option value="selected">تم الاختيار فقط</option>
            <option value="confirmed">مؤكد فقط</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">المحطة</label>
          <select value={filterStation} onChange={e => setFilterStation(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2E86AB]">
            <option value="">الكل</option>
            {stations.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">الشهر</label>
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]" />
        </div>
        <button onClick={loadOffers}
          className="bg-[#1B3A6B] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#142D52] transition-colors">
          بحث
        </button>
      </div>

      {/* Offers table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1B3A6B] text-white">
<<<<<<< HEAD
                {['صاحب العرض','رقم الموظف','المحطة','أيام الطلب','البديل','المختار','رقمه','الحالة','إجراءات'].map(h => (
=======
                {['صاحب العرض','رقم الموظف','المحطة','أيام الطلب','البديل','المختار','رقمه','محطته','الحالة','إجراءات'].map(h => (
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
                  <th key={h} className="text-right px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {offers.length === 0 ? (
<<<<<<< HEAD
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">لا توجد عروض</td></tr>
=======
                <tr><td colSpan={10} className="text-center py-10 text-gray-400">لا توجد عروض</td></tr>
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
              ) : offers.map((offer, i) => (
                <tr key={offer.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 font-medium text-[#1B3A6B]">{offer.ownerName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500" dir="ltr">{offer.ownerCode}</td>
                  <td className="px-4 py-3">{offer.ownerStation}</td>
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      {offer.daysOff.map((d,j) => (
                        <div key={j} className="text-xs text-gray-600">{d.date} · {{day:'ص',night:'م',overlap:'ت'}[d.shift]}</div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{offer.replacementDays.length} يوم</td>
                  <td className="px-4 py-3">{offer.selectorName || <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs" dir="ltr">{offer.selectorCode || '—'}</td>
<<<<<<< HEAD
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <span className={clsx('text-xs font-medium px-2 py-1 rounded-full', statusColor(offer.status))}>
                        {statusLabel(offer.status)}
                      </span>
                      {offer.status === 'confirmed' && offer.confirmedByName && (
                        <div className="text-[10px] text-gray-400 mt-1">
                          ✅ {offer.confirmedByName}
                          {offer.confirmedByEmail && <><br />{offer.confirmedByEmail}</>}
                        </div>
                      )}
                    </div>
=======
                  <td className="px-4 py-3 text-xs">{offer.selectorStation || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs font-medium px-2 py-1 rounded-full', statusColor(offer.status))}>
                      {statusLabel(offer.status)}
                    </span>
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {offer.status === 'selected' && (
<<<<<<< HEAD
                        <button
                          onClick={() => handleStatusChange(offer.id!, 'confirmed')}
                          disabled={!!confirming[offer.id!]}
                          className="flex items-center gap-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded-md transition-colors disabled:opacity-50">
                          {confirming[offer.id!]
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <CheckCircle className="w-3 h-3" />}
                          تأكيد
=======
                        <button onClick={() => handleStatusChange(offer.id!, 'confirmed')}
                          className="flex items-center gap-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded-md transition-colors">
                          <CheckCircle className="w-3 h-3" /> تأكيد
>>>>>>> 18ca2618bcc83ce8cf18fb87381ce48889546a7f
                        </button>
                      )}
                      {offer.status !== 'confirmed' && (
                        <button onClick={() => handleDelete(offer.id!)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Station management */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-bold text-[#1B3A6B] mb-4">إدارة المحطات</h2>
        <div className="flex gap-3 mb-4">
          <input value={newStation} onChange={e => setNewStation(e.target.value)}
            placeholder="اسم المحطة الجديدة"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]" />
          <button onClick={handleAddStation}
            className="flex items-center gap-2 bg-[#1B3A6B] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#142D52] transition-colors">
            <Plus className="w-4 h-4" /> إضافة
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {stations.map(s => (
            <span key={s.id}
              className={clsx('px-3 py-1.5 rounded-full text-sm font-medium border',
                s.active ? 'bg-blue-50 text-[#1B3A6B] border-blue-200' : 'bg-gray-50 text-gray-400 border-gray-200 line-through')}>
              {s.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
