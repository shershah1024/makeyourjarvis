import { NextRequest, NextResponse } from 'next/server';
import { transformToDocumentRequest } from '@/utils/documentTransformer';
import { getServerSession } from 'next-auth';
import { supabase } from '@/utils/supabase';

const DOCUMENT_SERVICE_URL = process.env.DOCUMENT_SERVICE_URL || 'http://localhost:8000';

interface UserAuth {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  provider: string;
  created_at: string;
  updated_at: string;
}

async function refreshGoogleToken(refreshToken: string) {
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
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const tokens = await response.json();
    return {
      access_token: tokens.access_token,
      expires_at: Math.floor(Date.now() / 1000 + (tokens.expires_in || 3600)),
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get the session using Next Auth
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in to continue' },
        { status: 401 }
      );
    }

    // Get the user's tokens
    const { data: userAuth, error: tokenError } = await supabase
      .from('user_auth')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (tokenError || !userAuth) {
      return NextResponse.json(
        { error: 'No valid token found' },
        { status: 401 }
      );
    }

    const auth = userAuth as UserAuth;

    // Check if token is expired or will expire soon (within 5 minutes)
    const isExpiredOrExpiringSoon = auth.expires_at < (Date.now() / 1000) + 300;

    if (isExpiredOrExpiringSoon && auth.refresh_token) {
      try {
        // Refresh the token
        const newTokens = await refreshGoogleToken(auth.refresh_token);
        
        // Update the tokens in Supabase
        const { error: updateError } = await supabase
          .from('user_auth')
          .update({
            access_token: newTokens.access_token,
            expires_at: newTokens.expires_at,
            updated_at: new Date().toISOString(),
          })
          .eq('id', auth.id); // Using the primary key for the update

        if (updateError) {
          throw updateError;
        }

        // Update the auth object with new tokens
        auth.access_token = newTokens.access_token;
        auth.expires_at = newTokens.expires_at;
      } catch (error) {
        console.error('Failed to refresh token:', error);
        return NextResponse.json(
          { error: 'Failed to refresh authentication' },
          { status: 401 }
        );
      }
    }

    // First, generate the report
    const reportResponse = await fetch('http://localhost:3000/api/report-generator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(await req.json()),
    });

    if (!reportResponse.ok) {
      throw new Error('Failed to generate report');
    }

    const report = await reportResponse.json();

    // Transform the report into the document format
    const documentRequest = transformToDocumentRequest(report);

    // Send to the document service with just the user-id
    const documentResponse = await fetch(`${DOCUMENT_SERVICE_URL}/documents/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': auth.user_id
      },
      body: JSON.stringify(documentRequest),
    });

    if (!documentResponse.ok) {
      const errorData = await documentResponse.json().catch(() => null);
      throw new Error(
        `Failed to create document: ${errorData?.error || documentResponse.statusText}`
      );
    }

    const document = await documentResponse.json();

    return NextResponse.json({
      success: true,
      document,
      report // Include the original report for reference
    });

  } catch (error) {
    console.error('[Document Creation] Process failed:', error);
    
    // Handle different types of errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to create document',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
} 