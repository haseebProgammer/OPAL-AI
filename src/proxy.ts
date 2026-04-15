import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: "opal-ai-auth-token",
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }

  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const publicRoutes = [
    '/auth/login',
    '/auth/donor/signup',
    '/auth/hospital/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/auth/role-select',
    '/auth/pending-approval', // Allow pending screen
    '/',
  ];

  const isPublic = publicRoutes.some(route => pathname === route || pathname.startsWith(route));

  // Not logged in — allow public, block protected
  if (!user) {
    if (!isPublic && pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
    return response;
  }

  // Logged in — Check Approval for Dashboards
  if (pathname.startsWith('/dashboard')) {
    const role = user.user_metadata?.role;

    // Admin always allowed
    if (role === 'admin' || user.email === "ranahaseeb9427@gmail.com") {
      return response;
    }

    // Check Donor Approval
    if (role === 'donor') {
      const { data } = await supabase
        .from('blood_donors')
        .select('approval_status')
        .eq('user_id', user.id)
        .single();
        
      if (data?.approval_status !== 'approved') {
        return NextResponse.redirect(new URL('/auth/pending-approval', request.url));
      }
    }

    // Check Hospital Approval
    if (role === 'hospital') {
      const { data } = await supabase
        .from('hospitals')
        .select('approval_status')
        .eq('user_id', user.id)
        .single();
        
      if (data?.approval_status !== 'approved') {
        return NextResponse.redirect(new URL('/auth/pending-approval', request.url));
      }
    }
  }

  // Default: allow everything, proxy handles session
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets|api).*)'],
};
