import {
    signInWithPopup,
      GoogleAuthProvider,
        signOut,
          onAuthStateChanged,
            User,
            } from 'firebase/auth'
            import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
            import { auth, db } from './config'

            const googleProvider = new GoogleAuthProvider()
            googleProvider.setCustomParameters({ prompt: 'select_account' })

            /** Sign in with Google — for ALL users (regular and admin) */
            export async function signInWithGoogle(): Promise<User> {
              const result = await signInWithPopup(auth, googleProvider)
                const user = result.user

                  // Upsert a basic userProfile so the user document exists
                    const ref = doc(db, 'userProfiles', user.uid)
                      const snap = await getDoc(ref)
                        if (!snap.exists()) {
                            await setDoc(ref, {
                                  displayName: user.displayName,
                                        email:       user.email,
                                              photoURL:    user.photoURL,
                                                    isAdmin:     false,
                                                          createdAt:   serverTimestamp(),
                                                              })
                                                                }

                                                                  return user
                                                                  }

                                                                  /** Sign out */
                                                                  export async function logOut(): Promise<void> {
                                                                    await signOut(auth)
                                                                    }

                                                                    /**
                                                                     * Check if the current user is admin.
                                                                      * Admin flag is stored in Firestore: userProfiles/{uid}.isAdmin === true
                                                                       * Set this manually in the Firebase console for trusted users.
                                                                        */
                                                                        export async function isAdmin(): Promise<boolean> {
                                                                          const user = auth.currentUser
                                                                            if (!user) return false
                                                                              const snap = await getDoc(doc(db, 'userProfiles', user.uid))
                                                                                return snap.exists() && snap.data()?.isAdmin === true
                                                                                }

                                                                                /** Subscribe to auth state changes */
                                                                                export function onAuth(callback: (user: User | null) => void) {
                                                                                  return onAuthStateChanged(auth, callback)
                                                                                  }

                                                                                  /** Get current user synchronously (null if not signed in) */
                                                                                  export function getCurrentUser(): User | null {
                                                                                    return auth.currentUser
                                                                                    }
}