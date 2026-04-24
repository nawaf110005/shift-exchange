'use client'

import { useEffect, useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { signInWithGoogle, logOut, isAdmin as checkAdmin, onAuth } from '@/lib/firebase/auth'
import {
  getAllOffersAdmin, updateOffer, deleteOffer, ownerAcceptOffer, cancelConfirmation,
  adminRejectOffer, adminUnrejectOffer,
  getStations, createStation, updateStation, deleteStation, toggleStation,
  getAllUserProfiles,
  Offer, Station, OfferStatus, UserProfile,
} from '@/lib/firebase/firestore'
import { exportOffersToExcel } from '@/lib/utils/exportExcel'
import { statusColor, statusLabel } from '@/lib/utils/validation'
import {
  ShieldCheck, LogOut, Download, Trash2, CheckCircle, Loader2, Plus,
  Pencil, Check, X, Eye, EyeOff, Search, Shield, ShieldOff, RefreshCw,
  XCircle,
} from 'lucide-react'
import { User } from 'firebase/auth'
import toast from 'react-hot-toast'
import clsx from 'clsx'

export default function AdminPage() {
  const [user,           setUser]           = useState<User | null>(null)
  const [admin,          setAdmin]          = useState(false)
  const [loading,        setLoading]        = useState(true)
  const [offers,         setOffers]         = useState<Offer[]>([])
  const [stations,       setStations]       = useState<Station[]>([])
  const [newStation,     setNewStation]     = useState('')
  const [confirming,     setConfirming]     = useState<Record<string, boolean>>({})
  const [cancelling,     setCancelling]     = useState<Record<string, boolean>>({})
  const [rejecting,      setRejecting]      = useState<Record<string, boolean>>({})
  const [editingStation, setEditingStation] = useState<{ id: string; name: string } | null>(null)
  const [stationSaving,  setStationSaving]  = useState(false)
  const [userProfiles,   setUserProfiles]   = useState<UserProfile[]>([])
  const [userSearch,     setUserSearch]     = useState('')
  const [adminLoading,   setAdminLoading]   = useState<Record<string, boolean>>({})
  const [usersLoading,   setUsersLoading]   = useState(false)
  // Confirm dialog — only shown when no valid name is saved in localStorage
  const [confirmModal,      setConfirmModal]      = useState<{ offerId: string } | null>(null)
  const [confirmNameInput,  setConfirmNameInput]  = useState('')

  // Filters — default: current month, action-needed statuses (selected + confirmed)
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
          loadUserProfiles()
        }
      } else {
        setAdmin(false)
      }
      setLoading(false)
    })
  }, [])

  async function loadOffers() {
    const data = await getAllOffersAdmin({
      status:  filterStatus as OfferStatus || undefined,
      station: filterStation || undefined,
      month:   filterMonth   || undefined,
    })
    setOffers(data)
  }

  async function loadUserProfiles() {
    setUsersLoading(true)
    try {
      const profiles = await getAllUserProfiles()
      // Only show users who have signed in with Google (have email)
      setUserProfiles(profiles.filter(p => p.email))
    } catch {
      toast.error('حدث خطأ أثناء تحميل المستخدمين')
    } finally {
      setUsersLoading(false)
    }
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

  async function handleStatusChange(offerId: string, newStatus: OfferStatus, adminNameOverride?: string) {
    if (newStatus === 'confirmed') {
      setConfirming(prev => ({ ...prev, [offerId]: true }))
    }
    try {
      if (newStatus === 'confirmed') {
        await ownerAcceptOffer(
          offerId,
          adminNameOverride ?? user?.displayName ?? undefined,
          user?.email ?? undefined,
        )
      } else {
        await updateOffer(offerId, { status: newStatus })
      }
      toast.success('تم تحديث الحالة')
      loadOffers()
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ')
    } finally {
      setConfirming(prev => { const n = { ...prev }; delete n[offerId]; return n })
    }
  }

  async function handleCancelConfirmation(offerId: string) {
    if (!confirm('هل أنت متأكد من إلغاء التأكيد؟')) return
    setCancelling(prev => ({ ...prev, [offerId]: true }))
    try {
      await cancelConfirmation(offerId)
      toast.success('تم إلغاء التأكيد')
      loadOffers()
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ')
    } finally {
      setCancelling(prev => { const n = { ...prev }; delete n[offerId]; return n })
    }
  }

  async function handleAdminReject(offerId: string) {
    if (!confirm('هل أنت متأكد من رفض هذا الطلب؟')) return
    setRejecting(prev => ({ ...prev, [offerId]: true }))
    try {
      await adminRejectOffer(offerId)
      toast.success('تم رفض العرض')
      loadOffers()
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ')
    } finally {
      setRejecting(prev => { const n = { ...prev }; delete n[offerId]; return n })
    }
  }

  async function handleAdminUnreject(offerId: string) {
    setRejecting(prev => ({ ...prev, [offerId]: true }))
    try {
      await adminUnrejectOffer(offerId)
      toast.success('تم إعادة العرض للقائمة')
      loadOffers()
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ')
    } finally {
      setRejecting(prev => { const n = { ...prev }; delete n[offerId]; return n })
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
    toast.success('تمت إضافة المركز')
  }

  async function handleSaveStation() {
    if (!editingStation || !editingStation.name.trim()) return
    setStationSaving(true)
    try {
      await updateStation(editingStation.id, editingStation.name.trim())
      setEditingStation(null)
      getStations(false).then(setStations)
      toast.success('تم تحديث اسم المركز')
    } catch {
      toast.error('حدث خطأ أثناء التحديث')
    } finally {
      setStationSaving(false)
    }
  }

  async function handleToggleStation(id: string, active: boolean) {
    try {
      await toggleStation(id, active)
      getStations(false).then(setStations)
      toast.success(active ? 'تم تفعيل المركز' : 'تم تعطيل المركز')
    } catch {
      toast.error('حدث خطأ')
    }
  }

  async function handleDeleteStation(id: string, name: string) {
    if (!confirm(`هل أنت متأكد من حذف مركز "${name}"؟`)) return
    try {
      await deleteStation(id)
      getStations(false).then(setStations)
      toast.success('تم حذف المركز')
    } catch {
      toast.error('حدث خطأ أثناء الحذف')
    }
  }

  async function handleGrantAdmin(email: string, uid: string) {
    setAdminLoading(prev => ({ ...prev, [uid]: true }))
    try {
      await updateDoc(doc(db, 'userProfiles', uid), {
        isAdmin: true,
        adminGrantedAt: serverTimestamp(),
      })
      toast.success(`تم منح صلاحية الإدارة لـ ${email}`)
      await loadUserProfiles()
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء منح الصلاحية')
    } finally {
      setAdminLoading(prev => { const n = { ...prev }; delete n[uid]; return n })
    }
  }

  async function handleRevokeAdmin(email: string, uid: string) {
    if (!confirm(`هل أنت متأكد من إلغاء صلاحية الإدارة من ${email}؟`)) return
    if (uid === user?.uid) {
      toast.error('لا يمكنك إلغاء صلاحيتك الخاصة')
      return
    }
    setAdminLoading(prev => ({ ...prev, [uid]: true }))
    try {
      await updateDoc(doc(db, 'userProfiles', uid), { isAdmin: false })
      toast.success(`تم إلغاء صلاحية الإدارة من ${email}`)
      await loadUserProfiles()
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء إلغاء الصلاحية')
    } finally {
      setAdminLoading(prev => { const n = { ...prev }; delete n[uid]; return n })
    }
  }

  const filteredUsers = userProfiles.filter(p =>
    !userSearch ||
    p.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    p.email?.toLowerCase().includes(userSearch.toLowerCase())
  )

  // ── Loading screen ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 className="w-10 h-10 animate-spin text-[#2E86AB]" />
      </div>
    )
  }

  // ── Login screen ────────────────────────────────────────────────
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
    <div className="pb-28">
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
            <option value="rejected">مرفوض فقط</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">المركز</label>
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
                {['صاحب العرض','رقم الموظف','المركز','أيام الطلب','البديل','المختار','رقمه','الحالة','إجراءات'].map(h => (
                  <th key={h} className="text-right px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {offers.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-gray-400">لا توجد عروض</td></tr>
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
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <div>{offer.replacementDays.length} يوم</div>
                    {offer.selectedReplacementDay && (
                      <div className="mt-1 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 text-[10px] text-blue-700 font-medium">
                        ✔ {offer.selectedReplacementDay.date}
                        {offer.selectedReplacementDay.shifts?.length > 0 && (
                          <span className="mr-1 font-normal">
                            · {offer.selectedReplacementDay.shifts.map(s => ({day:'ص',night:'م',overlap:'ت'} as Record<string,string>)[s] ?? s).join('/')}
                          </span>
                        )}
                        {offer.ownerStation && (
                          <span className="block font-normal text-blue-600 mt-0.5">{offer.ownerStation}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div>{offer.claimerName || offer.selectorName || <span className="text-gray-300">—</span>}</div>
                    {(offer.claimerStation || offer.selectorStation) && (
                      <div className="text-[10px] text-gray-400 mt-0.5">{offer.claimerStation || offer.selectorStation}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" dir="ltr">{offer.claimerEmployeeNumber || offer.selectorCode || '—'}</td>
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
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {offer.status === 'selected' && (
                        <button
                          onClick={() => {
                            const saved = typeof window !== 'undefined' ? (localStorage.getItem('admin_confirm_name') || '').trim() : ''
                            if (saved.length >= 3) {
                              handleStatusChange(offer.id!, 'confirmed', saved)
                            } else {
                              setConfirmNameInput('')
                              setConfirmModal({ offerId: offer.id! })
                            }
                          }}
                          disabled={!!confirming[offer.id!]}
                          className="flex items-center gap-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded-md transition-colors disabled:opacity-50">
                          {confirming[offer.id!]
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <CheckCircle className="w-3 h-3" />}
                          تأكيد
                        </button>
                      )}
                      {offer.status === 'confirmed' && (
                        <button
                          onClick={() => handleCancelConfirmation(offer.id!)}
                          disabled={!!cancelling[offer.id!]}
                          className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200 px-2 py-1 rounded-md transition-colors disabled:opacity-50">
                          {cancelling[offer.id!]
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <XCircle className="w-3 h-3" />}
                          إلغاء التأكيد
                        </button>
                      )}
                      {offer.status === 'rejected' ? (
                        <button
                          onClick={() => handleAdminUnreject(offer.id!)}
                          disabled={!!rejecting[offer.id!]}
                          className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 px-2 py-1 rounded-md transition-colors disabled:opacity-50">
                          {rejecting[offer.id!]
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <CheckCircle className="w-3 h-3" />}
                          إعادة
                        </button>
                      ) : offer.status !== 'confirmed' && (
                        <button
                          onClick={() => handleAdminReject(offer.id!)}
                          disabled={!!rejecting[offer.id!]}
                          className="flex items-center gap-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded-md transition-colors disabled:opacity-50">
                          {rejecting[offer.id!]
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <XCircle className="w-3 h-3" />}
                          رفض
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

      {/* ── Station Management ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        {/* Section header + add form */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-[#1B3A6B] mb-3">إدارة المراكز</h2>
          <div className="flex gap-3">
            <input
              value={newStation}
              onChange={e => setNewStation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddStation()}
              placeholder="اسم المركز الجديد"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
            />
            <button
              onClick={handleAddStation}
              disabled={!newStation.trim()}
              className="flex items-center gap-2 bg-[#1B3A6B] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#142D52] transition-colors disabled:opacity-40"
            >
              <Plus className="w-4 h-4" /> إضافة
            </button>
          </div>
        </div>

        {/* Stations table */}
        {stations.length === 0 ? (
          <p className="text-center text-gray-400 py-8">لا توجد مراكز</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase">
                  <th className="text-right px-5 py-3 font-medium">اسم المركز</th>
                  <th className="text-right px-5 py-3 font-medium">الحالة</th>
                  <th className="text-right px-5 py-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stations.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    {/* Name cell */}
                    <td className="px-5 py-3">
                      {editingStation?.id === s.id ? (
                        <input
                          value={editingStation!.name}
                          onChange={e => setEditingStation({ ...editingStation!, name: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveStation(); if (e.key === 'Escape') setEditingStation(null) }}
                          autoFocus
                          className="border border-[#2E86AB] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB] w-full max-w-xs"
                        />
                      ) : (
                        <span className={clsx('font-medium', !s.active && 'text-gray-400 line-through')}>
                          {s.name}
                        </span>
                      )}
                    </td>

                    {/* Status cell */}
                    <td className="px-5 py-3">
                      <span className={clsx(
                        'text-xs font-medium px-2.5 py-1 rounded-full',
                        s.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-400'
                      )}>
                        {s.active ? 'نشط' : 'معطل'}
                      </span>
                    </td>

                    {/* Actions cell */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {editingStation?.id === s.id ? (
                          <>
                            <button
                              onClick={handleSaveStation}
                              disabled={stationSaving}
                              className="flex items-center gap-1 text-xs bg-[#1B3A6B] text-white hover:bg-[#142D52] px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-50"
                            >
                              {stationSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              حفظ
                            </button>
                            <button
                              onClick={() => setEditingStation(null)}
                              className="flex items-center gap-1 text-xs border border-gray-300 text-gray-600 hover:bg-gray-100 px-2.5 py-1.5 rounded-md transition-colors"
                            >
                              <X className="w-3 h-3" /> إلغاء
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Edit */}
                            <button
                              onClick={() => setEditingStation({ id: s.id!, name: s.name })}
                              className="p-1.5 text-gray-400 hover:text-[#1B3A6B] hover:bg-blue-50 rounded-md transition-colors"
                              title="تعديل الاسم"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {/* Toggle active */}
                            <button
                              onClick={() => handleToggleStation(s.id!, !s.active)}
                              className={clsx(
                                'p-1.5 rounded-md transition-colors',
                                s.active
                                  ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
                                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                              )}
                              title={s.active ? 'تعطيل المركز' : 'تفعيل المركز'}
                            >
                              {s.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteStation(s.id!, s.name)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                              title="حذف المركز"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Admin Role Management ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Section header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-[#1B3A6B]">إدارة صلاحيات المسؤولين</h2>
            <p className="text-xs text-gray-400 mt-0.5">منح أو إلغاء صلاحية الإدارة للمستخدمين</p>
          </div>
          <button
            onClick={loadUserProfiles}
            disabled={usersLoading}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#1B3A6B] hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
          >
            <RefreshCw className={clsx('w-4 h-4', usersLoading && 'animate-spin')} />
            تحديث
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="بحث بالاسم أو البريد الإلكتروني"
              className="w-full pr-9 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
            />
          </div>
        </div>

        {/* Users table */}
        {usersLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-[#2E86AB]" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="text-center text-gray-400 py-8">
            {userSearch ? 'لا توجد نتائج للبحث' : 'لا يوجد مستخدمون'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase">
                  <th className="text-right px-5 py-3 font-medium">الاسم</th>
                  <th className="text-right px-5 py-3 font-medium">البريد الإلكتروني</th>
                  <th className="text-right px-5 py-3 font-medium">الصلاحية</th>
                  <th className="text-right px-5 py-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u, i) => {
                  const isSelf = u.uid === user?.uid
                  const isLoading = !!adminLoading[u.uid]
                  return (
                    <tr key={u.uid} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#1B3A6B]/10 flex items-center justify-center">
                              <span className="text-xs font-bold text-[#1B3A6B]">
                                {u.displayName?.[0] ?? '?'}
                              </span>
                            </div>
                          )}
                          <span className="font-medium text-gray-800">{u.displayName || '—'}</span>
                          {isSelf && (
                            <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">أنت</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500" dir="ltr">{u.email}</td>
                      <td className="px-5 py-3">
                        <span className={clsx(
                          'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit',
                          u.isAdmin
                            ? 'bg-[#1B3A6B]/10 text-[#1B3A6B]'
                            : 'bg-gray-100 text-gray-500'
                        )}>
                          {u.isAdmin
                            ? <><Shield className="w-3 h-3" /> مسؤول</>
                            : 'مستخدم'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {u.isAdmin ? (
                          <button
                            onClick={() => handleRevokeAdmin(u.email!, u.uid)}
                            disabled={isLoading || isSelf}
                            title={isSelf ? 'لا يمكنك إلغاء صلاحيتك الخاصة' : ''}
                            className="flex items-center gap-1.5 text-xs border border-red-200 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldOff className="w-3 h-3" />}
                            إلغاء الصلاحية
                          </button>
                        ) : (
                          <button
                            onClick={() => handleGrantAdmin(u.email!, u.uid)}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 text-xs bg-[#1B3A6B]/10 text-[#1B3A6B] hover:bg-[#1B3A6B]/20 px-3 py-1.5 rounded-md transition-colors disabled:opacity-40"
                          >
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                            منح الصلاحية
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Confirm-name dialog ─────────────────────────────────────────── */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#1B3A6B]">تأكيد التبديل</h3>
            <p className="text-sm text-gray-500">
              أدخل اسمك — سيُحفظ تلقائياً للمرات القادمة
            </p>
            <input
              type="text"
              value={confirmNameInput}
              onChange={e => setConfirmNameInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && confirmNameInput.trim().length >= 3) {
                  const name = confirmNameInput.trim()
                  localStorage.setItem('admin_confirm_name', name)
                  const { offerId } = confirmModal
                  setConfirmModal(null)
                  handleStatusChange(offerId, 'confirmed', name)
                }
              }}
              placeholder="الاسم الكامل (٣ أحرف على الأقل)"
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB]"
            />
            {confirmNameInput.trim().length > 0 && confirmNameInput.trim().length < 3 && (
              <p className="text-xs text-red-500 -mt-2">يجب أن يكون الاسم ٣ أحرف على الأقل</p>
            )}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  const name = confirmNameInput.trim()
                  if (name.length < 3) return
                  localStorage.setItem('admin_confirm_name', name)
                  const { offerId } = confirmModal
                  setConfirmModal(null)
                  handleStatusChange(offerId, 'confirmed', name)
                }}
                disabled={confirmNameInput.trim().length < 3}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
