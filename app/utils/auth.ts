import { supabase } from './supabase';
import { ALL_SCOPES } from '@/utils/googleScopes';

export interface TokenInfo {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export async function getStoredTokens(userId: string): Promise<TokenInfo | null> {
  console.log('Fetching stored tokens for user:', userId);
  const { data, error } = await supabase
    .from('user_auth')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error('Error fetching tokens:', error);
    return null;
  }

  console.log('Found tokens with expiration:', new Date(data.expires_at * 1000).toISOString());
  return data as TokenInfo;
}

export async function refreshGoogleToken(refreshToken: string): Promise<TokenInfo | null> {
  console.log('Attempting to refresh Google token...');
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
        refresh_token: refreshToken,
        scope: ALL_SCOPES.join(' '),
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh token. Status:', response.status);
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    console.log('Successfully refreshed token');
    
    // Calculate expires_at in seconds since epoch
    const expires_at = Math.floor(Date.now() / 1000) + data.expires_in;
    console.log('New token expires at:', new Date(expires_at * 1000).toISOString());

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken, // Use old refresh token if new one not provided
      expires_at,
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

export async function updateStoredTokens(userId: string, tokens: TokenInfo): Promise<boolean> {
  console.log('Updating tokens in Supabase for user:', userId);
  console.log('New expiration time:', new Date(tokens.expires_at * 1000).toISOString());
  
  // First get the existing record to preserve the provider field
  const { data: existingAuth, error: fetchError } = await supabase
    .from('user_auth')
    .select('provider')
    .eq('user_id', userId)
    .single();

  if (fetchError) {
    console.error('Error fetching existing auth record:', fetchError);
    return false;
  }

  if (!existingAuth?.provider) {
    console.error('No provider found in existing record');
    return false;
  }

  const { error } = await supabase
    .from('user_auth')
    .upsert({
      user_id: userId,
      ...tokens,
      provider: existingAuth.provider, // Preserve the existing provider
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

  if (error) {
    console.error('Error updating tokens in Supabase:', error);
    return false;
  }

  console.log('Successfully updated tokens in Supabase');
  return true;
}

export async function getValidAccessToken(userId: string): Promise<string | null> {
  console.log('Getting valid access token for user:', userId);
  const tokens = await getStoredTokens(userId);
  if (!tokens) {
    console.error('No tokens found for user');
    return null;
  }

  // Check if current token is expired or will expire soon (within 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  const isExpiringSoon = tokens.expires_at - 300 < now;
  console.log('Token expires at:', new Date(tokens.expires_at * 1000).toISOString());
  console.log('Current time:', new Date(now * 1000).toISOString());
  console.log('Token is expiring soon:', isExpiringSoon);

  if (isExpiringSoon && tokens.refresh_token) {
    console.log('Token needs refresh, attempting refresh...');
    // Refresh the token
    const newTokens = await refreshGoogleToken(tokens.refresh_token);
    if (newTokens) {
      // Update stored tokens
      const updated = await updateStoredTokens(userId, newTokens);
      if (!updated) {
        console.error('Failed to update tokens in Supabase');
        return null;
      }
      return newTokens.access_token;
    }
  }

  console.log('Using existing token');
  return tokens.access_token;
} 