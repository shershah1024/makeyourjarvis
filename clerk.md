Below is a detailed article that explains how to set up Clerk for authentication in a Next.js App Router application. The article covers installing the SDK, wrapping your application with the ClerkProvider, configuring middleware to protect routes, and accessing user and session data on both server and client sides.

Setting Up Clerk for Authentication in a Next.js App Router Application

Clerk provides a full-featured authentication solution that integrates seamlessly with Next.js. In this guide you’ll learn how to:

• Install and configure the Clerk SDK
• Wrap your application in the <ClerkProvider>
• Set up middleware to protect routes (including API routes)
• Access the current session and user data using Clerk’s server helpers
• Use client hooks to get authentication state

1. Installation and Initial Setup

First, create your Next.js app (if you haven’t already) and install the Clerk SDK:

npx create-next-app@latest my-clerk-app
cd my-clerk-app
npm install @clerk/nextjs

Next, add your Clerk environment variables (for example, in a .env.local file):

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key_here
CLERK_SECRET_KEY=your_secret_key_here
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

2. Wrapping Your App with <ClerkProvider>

In the Next.js App Router, the root layout is usually found in app/layout.tsx. Wrap your application with the <ClerkProvider> so that all pages have access to Clerk’s authentication context.

// app/layout.tsx
import type { Metadata } from 'next';
import { ClerkProvider, SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clerk Next.js App',
  description: 'A Next.js app with Clerk authentication',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header>
            <SignedOut>
              <SignInButton />
              <SignUpButton />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

3. Configuring Middleware

Create a middleware.ts file in your project root (or inside src if that’s your folder structure) to protect routes. By default, all routes will be public, so you need to opt in for protection. For example, the following middleware protects all routes except for static assets and internal Next.js files.

// middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware({
  // You can configure public routes if needed:
  publicRoutes: ['/', '/sign-in(.*)', '/sign-up(.*)'],
});

export const config = {
  matcher: [
    // Protect all routes except for Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run middleware for API routes
    '/(api|trpc)(.*)',
  ],
};

If you need to further control which routes are protected (for example using createRouteMatcher), you can refer to the Clerk documentation and Next.js matcher options [ ￼][ ￼].

4. Accessing User and Session Data on the Server

Within your Next.js server components, route handlers, or Server Actions you can use Clerk’s helpers. The auth() helper returns the authentication state, and currentUser() returns the full user object from Clerk’s backend API.

For example, to create a protected page:

// app/protected/page.tsx
import { auth, currentUser } from '@clerk/nextjs/server';

export default async function ProtectedPage() {
  const { userId } = await auth();

  if (!userId) {
    return <div>Please sign in to view this page.</div>;
  }

  const user = await currentUser();

  return <div>Welcome, {user?.firstName}!</div>;
}

And for an API route that returns user data:

// app/api/user/route.ts
import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  const user = await currentUser();
  return NextResponse.json({ user });
}

5. Accessing Authentication Data on the Client

On the client side, you can use hooks provided by Clerk to get authentication status and user data. For example, to display the current user’s first name:

// app/components/UserGreeting.tsx
'use client';
import { useUser } from '@clerk/nextjs';

export default function UserGreeting() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }
  if (!isSignedIn) {
    return <div>Please sign in to see your greeting.</div>;
  }

  return <div>Hello, {user.firstName}!</div>;
}

You can also use the useAuth hook to access session details like userId, sessionId, and helper functions.

// app/components/SessionInfo.tsx
'use client';
import { useAuth } from '@clerk/nextjs';

export default function SessionInfo() {
  const { isLoaded, isSignedIn, userId, sessionId, getToken } = useAuth();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }
  if (!isSignedIn) {
    return <div>Please sign in to view session information.</div>;
  }

  return (
    <div>
      <p>User ID: {userId}</p>
      <p>Session ID: {sessionId}</p>
    </div>
  );
}

6. Summary

By following these steps you now have:

• A Next.js app with Clerk integrated via the ClerkProvider
• Middleware configured to protect routes (both pages and API routes)
• Server-side helpers (auth() and currentUser()) to securely access user data
• Client-side hooks (useUser and useAuth) to render authentication-related UI

This setup ensures that only authenticated users can access protected pages and API routes while still allowing public access to your marketing or landing pages.

For further details, consult the official Clerk documentation on [reading session and user data][ ￼] and [Next.js middleware configuration][ ￼].