'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { getSession, setSession, clearSession } from '@/lib/store';

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
        setUserId(getSession() ?? '');
        setReady(true);
    }, []);

    const login = useCallback((uid: string) => {
        setSession(uid);
        setUserId(uid);
    }, []);

    const logout = useCallback(() => {
        clearSession();
        setUserId('');
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
