'use client';

import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import { supabase } from '@/utils/supabase';

export function useAuth() {
  const { data: session, status } = useSession();

  const handleSignOut = async () => {
    try {
      // First, delete the tokens from Supabase
      if (session?.user?.id) {
        const { error } = await supabase
          .from('user_auth')
          .delete()
          .eq('user_id', session.user.id);

        if (error) {
          console.error('Error removing tokens from Supabase:', error);
        }
      }

      // Then sign out from NextAuth
      await nextAuthSignOut({ callbackUrl: '/auth/signin' });
    } catch (error) {
      console.error('Error during sign out:', error);
      // Still attempt to sign out from NextAuth even if Supabase cleanup fails
      await nextAuthSignOut({ callbackUrl: '/auth/signin' });
    }
  };

  return {
    session,
    status,
    signIn: () => nextAuthSignIn('google', { callbackUrl: '/' }),
    signOut: handleSignOut,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
  };
} 