import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('aura-token')?.value;

  // Protected routes
  const isProtectedRoute = 
    request.nextUrl.pathname.startsWith('/chat') || 
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/admin') ||
    request.nextUrl.pathname.startsWith('/user');

  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If hitting login or register while already authenticated, redirect to /chat
  const isAuthRoute = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register';
  
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all paths except static assets, api routes, and public images
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
