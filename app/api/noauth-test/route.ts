import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function GET(req: NextRequest) {
  try {
    console.log('Checking Supabase connection...');
    
    // Test Supabase connection
    const { data: tokens, error: tokenError } = await supabase
      .from('user_auth')
      .select('*');

    return NextResponse.json({
      supabaseConnection: !tokenError,
      tokenCount: tokens?.length || 0,
      error: tokenError,
      tokens: tokens?.map(t => ({
        user_id: t.user_id,
        provider: t.provider,
        updated_at: t.updated_at
      }))
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
} 