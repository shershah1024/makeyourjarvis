import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/utils/auth';
import { supabase } from '@/utils/supabase';

// Disable middleware for this route
export const config = {
  api: {
    bodyParser: true,
  },
};

export async function POST(req: NextRequest) {
  try {
    console.log('Starting test endpoint...');

    // First, let's check what tokens we have in Supabase
    const { data: tokens, error: tokenError } = await supabase
      .from('user_auth')
      .select('*');

    console.log('Supabase query completed');
    console.log('Token error:', tokenError);
    console.log('Number of tokens found:', tokens?.length || 0);
    
    if (tokenError) {
      console.error('Error fetching tokens:', tokenError);
      return NextResponse.json(
        { error: 'Failed to fetch tokens', details: tokenError },
        { status: 500 }
      );
    }

    // If we have any tokens, use the first one
    if (!tokens || tokens.length === 0) {
      console.log('No tokens found in Supabase');
      return NextResponse.json(
        { error: 'No tokens found in database. Please ensure you are logged in and tokens are stored.' },
        { status: 401 }
      );
    }

    // Log the first token (safely)
    console.log('First token user_id:', tokens[0].user_id);
    console.log('First token provider:', tokens[0].provider);
    console.log('First token updated_at:', tokens[0].updated_at);

    // Get a valid access token for the first user
    const accessToken = await getValidAccessToken(tokens[0].user_id);
    console.log('Access token retrieved:', accessToken ? 'Yes (token exists)' : 'No (null token)');

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Failed to get valid access token' },
        { status: 401 }
      );
    }

    // Get the request body
    const presentationData = await req.json();
    console.log('Received presentation request:', JSON.stringify(presentationData, null, 2));

    // Make the request to your FastAPI backend
    console.log('Making request to FastAPI backend...');
    const response = await fetch('http://localhost:8000/presentations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(presentationData)
    });

    console.log('FastAPI response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('FastAPI error response:', errorData);
      return NextResponse.json(
        { 
          error: 'Failed to create presentation',
          status: response.status,
          details: errorData
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Successfully created presentation');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in presentation creation:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 