'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { getSession, setSession, clearSession } from '@/lib/store';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
    userId: string;
    userEmail: string;
    ready: boolean;
    login: (uid: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
    userId: '',
    userEmail: '',
    ready: false,
    login: () => { },
    logout: () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [userId, setUserId] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // 1. Carrega sessão local (login email/senha)
        const localSession = getSession();
        if (localSession && !userId) {
            setUserId(localSession);
        }

        // 2. Verifica se há sessão ativa do Supabase Auth (login Google/OAuth)
        const initSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const authUserId = session.user.id;
                await supabase.from('profiles').upsert({
                    id: authUserId,
                    name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
                    email: session.user.email,
                    role: 'user',
                    onboarding_done: true,
                    photo_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null
                }, { onConflict: 'id', ignoreDuplicates: true });

                setSession(authUserId);
                setUserId(authUserId);
                setUserEmail(session.user.email || '');
            }
            setReady(true);
        };

        initSession();

        // 3. Listener para mudanças de auth (ex: redirect após login Google)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                const authUserId = session.user.id;

                // Garante que o usuário existe em public.profiles
                await supabase.from('profiles').upsert({
                    id: authUserId,
                    name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuário',
                    email: session.user.email,
                    role: 'user',
                    onboarding_done: true,
                    photo_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null
                }, { onConflict: 'id', ignoreDuplicates: true });

                setSession(authUserId);
                setUserId(authUserId);
                setUserEmail(session.user.email || '');
            } else if (event === 'SIGNED_OUT') {
                clearSession();
                setUserId('');
                setUserEmail('');
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
        setUserEmail('');
        await supabase.auth.signOut();
    }, []);

    return (
        <AuthContext.Provider value={{ userId, userEmail, ready, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}