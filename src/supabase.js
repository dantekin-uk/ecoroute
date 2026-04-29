import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pjlttfbgrhqjgucksvof.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbHR0ZmJncmhxamd1Y2tzdm9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyODg1MzYsImV4cCI6MjA4Mzg2NDUzNn0.DIwsidMdtDVKa2mqDONERL3XpY0ccwpwW_JKI9Xlul4';

export const supabase = createClient(supabaseUrl, supabaseKey);