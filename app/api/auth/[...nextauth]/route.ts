import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { supabase } from '@/utils/supabase';
import { ALL_SCOPES } from '@/utils/googleScopes';

// Helper function to update tokens in Supabase
async function updateSupabaseTokens(userId: string, tokens: { 
  access_token: string; 
  refresh_token?: string; 
  expires_at: number 
}) {
  console.log('Updating tokens for user:', userId);
  
  // First verify the user exists
  const { data: existingUser } = await supabase
    .from('user_auth')
    .select('user_id')
    .eq('user_id', userId)
    .single();

  if (!existingUser) {
    console.error('❌ No user found with ID:', userId);
    return false;
  }

  const updateData = {
    access_token: tokens.access_token,
    ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
    expires_at: tokens.expires_at,
    updated_at: new Date().toISOString()
  };

  console.log('Updating with data:', {
    userId,
    hasAccessToken: !!updateData.access_token,
    hasRefreshToken: !!updateData.refresh_token,
    expires_at: new Date(updateData.expires_at * 1000).toISOString()
  });

  const { error } = await supabase
    .from('user_auth')
    .update(updateData)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating tokens in Supabase:', error);
    return false;
  }

  console.log('✅ Successfully updated tokens for user:', userId);
  return true;
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            ...ALL_SCOPES
          ].join(' ')
        }
      }
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  debug: true,
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn callback - User ID:', user.id);
      
      if (!account || !user) {
        console.error('❌ Missing account or user data');
        return false;
      }

      if (!account.access_token || !account.refresh_token) {
        console.error('❌ Missing required tokens');
        return false;
      }

      try {
        // Calculate expires_at in seconds since epoch
        const expires_at = account.expires_at 
          ? account.expires_at 
          : Math.floor(Date.now() / 1000 + (account.expires_in || 3600));

        const authData = {
          user_id: user.id,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at,
          provider: account.provider,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log('Initial auth data:', {
          user_id: authData.user_id,
          provider: authData.provider,
          expires_at: new Date(authData.expires_at * 1000).toISOString()
        });

        const { error } = await supabase
          .from('user_auth')
          .upsert(authData, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('❌ Supabase error:', error);
          return false;
        }

        return true;
      } catch (error) {
        console.error('❌ Unexpected error:', error);
        return false;
      }
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.accessToken = token.accessToken;
        session.error = token.error;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        console.log('JWT callback - Initial sign in. User ID:', user.id);
        
        const expires_at = account.expires_at 
          ? account.expires_at 
          : Math.floor(Date.now() / 1000 + (account.expires_in || 3600));

        return {
          ...token,
          userId: user.id, // Store the user ID explicitly
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: expires_at
        };
      }

      // Return previous token if the access token has not expired yet
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires * 1000) {
        return token;
      }

      // Access token has expired, try to refresh it
      if (token.refreshToken) {
        console.log('JWT callback - Refreshing token for user:', token.userId || token.sub);
        
        try {
          const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_ID!,
              client_secret: process.env.GOOGLE_SECRET!,
              grant_type: 'refresh_token',
              refresh_token: token.refreshToken as string,
            }),
          });

          const tokens = await response.json();

          if (!response.ok) throw tokens;

          const expires_at = Math.floor(Date.now() / 1000 + (tokens.expires_in || 3600));

          // Use the stored userId if available, fallback to sub
          const userId = token.userId || token.sub;
          console.log('Refreshing tokens for user:', userId);

          // Update tokens in Supabase
          const updated = await updateSupabaseTokens(userId as string, {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at
          });

          if (!updated) {
            throw new Error('Failed to update tokens in Supabase');
          }

          return {
            ...token,
            accessToken: tokens.access_token,
            accessTokenExpires: expires_at,
            // Fall back to old refresh token if new one is not provided
            refreshToken: tokens.refresh_token ?? token.refreshToken,
          };
        } catch (error) {
          console.error('Error refreshing access token:', error);
          return {
            ...token,
            error: 'RefreshAccessTokenError',
          };
        }
      }

      return token;
    },
  },
  events: {
    async signOut({ token }) {
      if (token?.sub) {
        console.log('SignOut event - Removing tokens for user:', token.sub);
        // Remove tokens from Supabase when user signs out
        const { error } = await supabase
          .from('user_auth')
          .delete()
          .eq('user_id', token.sub);

        if (error) {
          console.error('Error removing tokens on signOut:', error);
        }
      }
    },
  },
});

export { handler as GET, handler as POST }; 