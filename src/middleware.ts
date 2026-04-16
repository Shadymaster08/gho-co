import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // If Supabase env vars are missing (e.g. preview deploy without vars), pass through.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const { pathname } = request.nextUrl

    if (user && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/portal', request.url))
    }

    if (!user && (pathname.startsWith('/portal') || pathname.startsWith('/order'))) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (pathname.startsWith('/admin')) {
      if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile?.role !== 'admin') {
        return NextResponse.redirect(new URL('/portal', request.url))
      }
    }
  } catch {
    // Middleware must never crash — fail open so the page still loads.
    return NextResponse.next({ request })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
