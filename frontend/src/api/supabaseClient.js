import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xyzcompany.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_key'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    '⚠️ FixDesk Warning: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing from environment variables.' +
    ' Please configure your .env file with your Supabase credentials.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
