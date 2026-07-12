'use client'

import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { useAuth } from '@clerk/nextjs'
import { ConvexReactClient } from 'convex/react'
import type { ReactNode } from 'react'

// Remains a no-op until NEXT_PUBLIC_CONVEX_URL is set (Phase 2).
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) return <>{children}</>
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  )
}
