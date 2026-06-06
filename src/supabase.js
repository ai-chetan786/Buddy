import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bmdxxgsqvfsehqjpvxax.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtZHh4Z3NxdmZzZWhxanB2eGF4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NDk0MTQsImV4cCI6MjA5NjIyNTQxNH0.n8e48df3cIb2Mm8QxF196Sv67sj0fScsvS2Fjks08XA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
