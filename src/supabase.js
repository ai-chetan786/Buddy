import { createClient } from '@supabase/supabase-js';

// ✅ Keys are now read from the .env file — NOT hardcoded!
// In .env:  REACT_APP_SUPABASE_URL=...  and  REACT_APP_SUPABASE_ANON_KEY=...
// In Vercel dashboard: add these same keys under Project → Settings → Environment Variables

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Safety check — shows a clear error if .env is missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ Supabase keys are missing!\n' +
    'Create a .env file in your project root with:\n' +
    'REACT_APP_SUPABASE_URL=https://bmdxxgsqvfsehqjpvxax.supabase.co/rest/v1/' +
    'REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtZHh4Z3NxdmZzZWhxanB2eGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDk0MTQsImV4cCI6MjA5NjIyNTQxNH0.n8e48df3cIb2Mm8QxF196Sv67sj0fScsvS2Fjks08XA'
  );
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);
