import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // Log the request path
  console.log('Middleware processing request for:', request.nextUrl.pathname);
  
  // Skip API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Only protect specific routes that need authentication
  const protectedPaths = [
    '/dashboard',
    '/profile',
    '/settings'
  ];

  // Check if this is a protected route
  if (protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    console.log('Checking authentication for protected route');
    
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    });

    console.log('Token found:', token ? 'Yes' : 'No');
    if (token) {
      console.log('Token sub:', token.sub);
    }

    if (!token) {
      console.log('Authentication required - no token found');
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Only match specific protected routes
    '/dashboard/:path*',
    '/profile/:path*',
    '/settings/:path*',
    // Exclude API routes and Next.js static files
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 