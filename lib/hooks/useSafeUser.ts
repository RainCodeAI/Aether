'use client'

// Thin wrapper around Clerk's useUser that returns a null user gracefully
// when ClerkProvider is not in the tree (e.g. before real API keys are set).
// Switch back to importing useUser directly once keys are configured.

import { useUser } from '@clerk/nextjs'

export function useSafeUser() {
  try {
    return useUser()
  } catch {
    return { user: null, isLoaded: true, isSignedIn: false }
  }
}
