'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { getSession, setSession, clearSession } from '@/lib/store';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
    userId: string;
    ready: boolean;
    login: (uid: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
    userId: '',
    ready: false,
    login: () => { },
    logout: () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [userId, setUserId] = useState('');
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // 1. Carrega sessão local (login email/senha)
        const localSession = getSession();
        if (localSession) {
            setUserId(localSession);
            setReady(true);
            return;
        }

        // 2. Verifica se há sessão ativa do Supabase Auth (login Google/OAuth)
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user) {
                const authUserId = session.user.id;

                // Garante que o usuário existe em public.users (fallback caso trigger não rode)
                await supabase.from('users').upsert({
                    id: authUserId,
                    name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
                    email: session.user.email,
                    password: '',
                    friend_ids: [],
                }, { onConflict: 'id', ignoreDuplicates: true });

                setSession(authUserId);
                setUserId(authUserId);
            }
            setReady(true);
        });

        // 3. Listener para mudanças de auth (ex: redirect após login Google)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                const authUserId = session.user.id;

                // Garante que o usuário existe em public.users
                await supabase.from('users').upsert({
                    id: authUserId,
                    name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
                    email: session.user.email,
                    password: '',
                    friend_ids: [],
                }, { onConflict: 'id', ignoreDuplicates: true });

                setSession(authUserId);
                setUserId(authUserId);
            } else if (event === 'SIGNED_OUT') {
                clearSession();
                setUserId('');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = useCallback((uid: string) => {
        setSession(uid);
        setUserId(uid);
    }, []);

    const logout = useCallback(async () => {
        clearSession();
        setUserId('');
        // Também faz logout do Supabase Auth (para limpar sessão OAuth)
        await supabase.auth.signOut();
    }, []);

    return (
        <AuthContext.Provider value={{ userId, ready, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}