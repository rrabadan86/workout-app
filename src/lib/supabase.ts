import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key, {
    auth: {
        flowType: 'implicit',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        // Bypassa o Navigator LockManager para evitar deadlock
        lock: async (name: string, acquireTimeout: number, fn: () => Promise<any>) => {
            return await fn();
        },
    },
});
