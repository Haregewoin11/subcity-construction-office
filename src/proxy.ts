// src/proxy.ts
import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { updateSession } from '@/utils/supabase/middleware';

// 1. Configure the Internationalization Proxy
const intlProxy = createIntlMiddleware({
  locales: ['en', 'am'],
  defaultLocale: 'en',
  localePrefix: 'always'
});

/**
 * NEXT.JS 16 PROXY
 * This replaces the old 'middleware' function. 
 * It runs at the edge to handle routing and auth cookies.
 */
export async function proxy(request: NextRequest) {
  // A. REFRESH SUPABASE SESSION
  // This ensures the user's auth token is valid before the page renders.
  // We pass the request to updateSession which returns a response with fresh cookies.
  const authResponse = await updateSession(request);

  // B. HANDLE ROLE-BASED ACCESS (Optional but Recommended)
  const { pathname } = request.nextUrl;
  
  // If a user tries to access /admin without a session cookie, 
  // the updateSession logic will have already flagged it.
  // You can add specific role-checks here if needed.

  // C. RUN INTL ROUTING
  // We call the intlProxy, but we must ensure it preserves 
  // the headers/cookies from the authResponse.
  const response = intlProxy(request);

  // Sync the Supabase cookies into the Intl response
  authResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value);
  });

  return response;
}

// 2. Define exactly which paths this proxy should watch
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * 1. /api (handled by route handlers)
     * 2. /_next (Next.js internals)
     * 3. Static files (.svg, .png, .jpg, etc.)
     */
    '/((?!api|_next|static|.*\\..*).*)',
  ],
};