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

    const logout = useCallback(async () => {
        clearSession();
        setUserId('');
        setUserEmail('');
        await supabase.auth.signOut();
    }, []);

    // ─── Auto-logout apos 4 horas de inatividade ───
    useEffect(() => {
        if (!userId) return; // Nao monitora se não estiver logado

        let timeoutId: NodeJS.Timeout;
        const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

        const resetTimer = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                console.log('[Auth] Usuário inativo por 4 horas. Fazendo logoff automático.');
                logout();
            }, FOUR_HOURS_MS);
        };

        // Inicia o timer
        resetTimer();

        // Escuta eventos de atividade
        const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

        // Usa debounce simples para não sobrecarregar o reset
        let throttleId: NodeJS.Timeout;
        const handleActivity = () => {
            if (throttleId) clearTimeout(throttleId);
            throttleId = setTimeout(resetTimer, 500);
        };

        events.forEach(evt => window.addEventListener(evt, handleActivity));

        return () => {
            clearTimeout(timeoutId);
            if (throttleId) clearTimeout(throttleId);
            events.forEach(evt => window.removeEventListener(evt, handleActivity));
        };
    }, [userId, logout]);

    useEffect(() => {
        // 1. Carrega sessão local (login email/senha)
        const localSession = getSession();
        if (localSession && !userId) {
            setUserId(localSession);
            // Se temos sessão local, marcamos como ready para evitar tela branca, 
            // enquanto o initSession valida no fundo.
            setReady(true);
        }

        // 2. Verifica se há sessão ativa do Supabase Auth (login Google/OAuth)
        const initSession = async () => {
            try {
                // Adiciona um timeout de 3 segundos para o getSession()
                const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 3000));
                const { data: { session } } = await Promise.race([
                    supabase.auth.getSession(),
                    timeout
                ]) as any;

                if (session?.user) {
                    const authUserId = session.user.id;
                    // Só fazemos o upsert em background se necessário, ou deixamos para o evento SIGNED_IN
                    setSession(authUserId);
                    setUserId(authUserId);
                    setUserEmail(session.user.email || '');
                }
            } catch (err) {
                console.warn('[Auth] Initialization issue (timeout or lock):', err);
            } finally {
                setReady(true);
            }
        };

        initSession();

        // 3. Listener para mudanças de auth (ex: redirect após login Google)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                const authUserId = session.user.id;
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

    return (
        <AuthContext.Provider value={{ userId, userEmail, ready, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}