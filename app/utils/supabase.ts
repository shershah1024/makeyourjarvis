import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our auth table
export interface UserAuth {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  provider: string;
  created_at: string;
  updated_at: string;
} 