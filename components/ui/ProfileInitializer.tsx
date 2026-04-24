'use client'

import { useEffect, useState } from 'react'
import { User } from 'firebase/auth'
import { onAuth } from '@/lib/firebase/auth'
import {
  UserProfileData,
  loadUserProfile,
  isProfileComplete,
} from '@/lib/firebase/userProfile'
import ProfileSetupModal from './ProfileSetupModal'

/**
 * Mounts silently in the layout.
 * Waits for auth state, then checks if the user's profile is complete.
 * If not, shows the ProfileSetupModal.
 */
export default function ProfileInitializer() {
  const [user,      setUser]      = useState<User | null>(null)
  const [profile,   setProfile]   = useState<Partial<UserProfileData>>({})
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    return onAuth(async (u) => {
      setUser(u)
      if (!u) return

      const loaded = await loadUserProfile(u.uid, u.isAnonymous)
      setProfile(loaded)

      if (!isProfileComplete(loaded)) {
        setShowModal(true)
      }
    })
  }, [])

  if (!showModal || !user) return null

  return (
    <ProfileSetupModal
      uid={user.uid}
      isAnonymous={user.isAnonymous}
      initialData={profile}
      onComplete={(p) => {
        setProfile(p)
        setShowModal(false)
      }}
      onSkip={() => setShowModal(false)}
    />
  )
}
