import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])

// Valid Clerk keys start with pk_test_ or pk_live_. If the key is still a
// placeholder the proxy passes through so the app stays usable during setup.
// Real Clerk keys look like pk_test_<50+ base64 chars>. The placeholder
// "pk_test_replace_me" is only 18 chars — length check distinguishes them.
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''
const clerkReady = /^pk_(test|live)_/.test(clerkKey) && clerkKey.length > 40

export default clerkReady
  ? clerkMiddleware((auth, req) => {
      if (!isPublicRoute(req)) auth.protect()
    })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- required by NextMiddleware signature
  : function proxy(_req: NextRequest) {
      return NextResponse.next()
    }

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
