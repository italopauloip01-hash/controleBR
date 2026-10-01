import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vyipbnojljoitpmytzzm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5aXBibm9qbGpvaXRwbXl0enptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODE2MTAsImV4cCI6MjA4ODE1NzYxMH0.xkAAAAjNlr03_e57uZngw1JnuL_wXSY3Q6FnI4pROWE';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Capacitor does not use URL-based auth redirects
        storage: window.localStorage,
    }
});
