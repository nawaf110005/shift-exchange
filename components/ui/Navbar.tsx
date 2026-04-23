'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { onAuth, isAdmin as checkAdmin, signInWithGoogle, logOut, ensureAnonymousAuth } from '@/lib/firebase/auth'
import { User } from 'firebase/auth'
import { CalendarDays, ListChecks, Bookmark, ShieldCheck, LogIn, LogOut } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { href: '/offers',    label: 'العروض',  icon: CalendarDays },
  { href: '/my-offers', label: 'عروضي',   icon: ListChecks   },
  { href: '/selected',  label: 'مختارة',  icon: Bookmark     },
]

export default function Navbar() {
  const pathname = usePathname()
  const [user,         setUser]         = useState<User | null>(null)
  const [admin,        setAdmin]        = useState(false)
  const [signingIn,    setSigningIn]    = useState(false)
  const [authReady,    setAuthReady]    = useState(false)

  useEffect(() => {
    // Ensure there is always at least an anonymous session on app load
    ensureAnonymousAuth()

    return onAuth(async (u) => {
      setUser(u)
      setAuthReady(true)
      // Anonymous users are never admin
      if (u && !u.isAnonymous) setAdmin(await checkAdmin())
      else setAdmin(false)
    })
  }, [])

  const isActive = (href: string) => pathname.includes(href)

  const allItems = [
    ...navItems,
    ...(admin ? [{ href: '/admin', label: 'إدارة', icon: ShieldCheck }] : []),
  ]

  async function handleSignIn() {
    setSigningIn(true)
    try { await signInWithGoogle() }
    catch (e: any) {
      if (e?.code !== 'auth/popup-closed-by-user') console.error(e)
    } finally { setSigningIn(false) }
  }

  async function handleSignOut() {
    await logOut()
  }

  return (
    <>
      {/* ── Desktop top bar ── */}
      <nav className="hidden md:block bg-[#1B3A6B] text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">

            {/* Logo + sponsor */}
            <div className="flex flex-col leading-tight">
              <Link href="/offers" className="flex items-center gap-2 font-bold text-xl">
                <CalendarDays className="w-6 h-6 text-[#2E86AB]" />
                <span>تبادل الدوام</span>
              </Link>
              <span className="text-[10px] text-blue-300 mr-8">برعاية عبدالله الرزيقي</span>
            </div>

            {/* Nav links + auth */}
            <div className="flex items-center gap-1">
              {allItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive(href)
                      ? href === '/admin' ? 'bg-amber-500 text-white' : 'bg-[#2E86AB] text-white'
                      : href === '/admin' ? 'text-amber-300 hover:bg-white/10' : 'text-blue-100 hover:bg-white/10'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}

              {/* Auth button — show sign-in for anonymous or unauthenticated */}
              {authReady && (
                user && !user.isAnonymous ? (
                  <div className="flex items-center gap-2 mr-2 border-r border-white/20 pr-3">
                    {user.photoURL && (
                      <img src={user.photoURL} alt={user.displayName || ''}
                        className="w-8 h-8 rounded-full border-2 border-white/30" />
                    )}
                    <button onClick={handleSignOut}
                      className="flex items-center gap-1.5 text-xs text-blue-200 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                      <LogOut className="w-3.5 h-3.5" />
                      خروج
                    </button>
                  </div>
                ) : (
                  <button onClick={handleSignIn} disabled={signingIn}
                    className="flex items-center gap-2 mr-2 bg-white text-[#1B3A6B] px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors disabled:opacity-60">
                    <LogIn className="w-4 h-4" />
                    {signingIn ? 'جارٍ تسجيل الدخول…' : 'دخول بـ Google'}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile top header ── */}
      <header className="md:hidden bg-[#1B3A6B] text-white sticky top-0 z-50 shadow-md"
              style={{ paddingTop: 'var(--safe-top)' }}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex flex-col leading-tight">
            <Link href="/offers" className="flex items-center gap-2 font-bold text-lg">
              <CalendarDays className="w-5 h-5 text-[#2E86AB]" />
              <span>تبادل الدوام</span>
            </Link>
            <span className="text-[9px] text-blue-300 mr-7">برعاية عبدالله الرزيقي</span>
          </div>

          {/* Mobile auth */}
          {authReady && (
            user && !user.isAnonymous ? (
              <div className="flex items-center gap-2">
                {user.photoURL && (
                  <img src={user.photoURL} alt=""
                    className="w-7 h-7 rounded-full border border-white/30" />
                )}
                <button onClick={handleSignOut}
                  className="p-2 text-blue-200 hover:text-white rounded-lg">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={handleSignIn} disabled={signingIn}
                className="flex items-center gap-1.5 text-xs bg-white text-[#1B3A6B] px-2.5 py-1.5 rounded-full font-semibold disabled:opacity-60">
                <LogIn className="w-3.5 h-3.5" />
                {signingIn ? '…' : 'دخول'}
              </button>
            )
          )}
        </div>
      </header>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 bottom-nav">
        <div className="grid"
             style={{ gridTemplateColumns: `repeat(${allItems.length}, 1fr)` }}>
          {allItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex flex-col items-center justify-center gap-0.5 pt-2 pb-1 text-[10px] font-medium transition-colors min-h-[56px]',
                isActive(href)
                  ? href === '/admin' ? 'text-amber-500' : 'text-[#1B3A6B]'
                  : 'text-gray-400'
              )}
            >
              <Icon className={clsx('w-5 h-5 transition-all', isActive(href) && 'scale-110')} />
              <span>{label}</span>
              {isActive(href) && (
                <span className={clsx(
                  'w-1 h-1 rounded-full mb-0.5',
                  href === '/admin' ? 'bg-amber-500' : 'bg-[#1B3A6B]'
                )} />
              )}
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
