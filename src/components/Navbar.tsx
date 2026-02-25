'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { UFitLogo } from '@/components/UFitLogo';

const SUPERVISOR_EMAIL = 'rodrigorabadan@gmail.com';

const BASE_NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/projects', label: 'Treinos' },
    { href: '/compare', label: 'Comparar' },
    { href: '/history', label: 'Histórico' },
    { href: '/community', label: 'Comunidade' },
];

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { userId, logout } = useAuth();
    const { store } = useStore();

    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowUserMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    if (!userId) return null;

    const user = store.profiles.find((u) => u.id === userId);
    if (!user) return null;

    const isSupervisor = user.email === SUPERVISOR_EMAIL;

    function handleLogout() {
        logout();
        router.push('/');
    }

    return (
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-50 px-6 lg:px-12 py-4">
            <div className="max-w-[1440px] mx-auto flex items-center justify-between">
                <div className="flex items-center gap-12">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/dashboard')}>
                        <UFitLogo width={40} height={40} className="drop-shadow-sm -ml-2" />
                        <h2 className="text-2xl font-extrabold font-inter tracking-tight text-slate-900" style={{ letterSpacing: '-1px' }}>
                            <span className="text-blue-600">u</span><span className="text-cyan-500">Fit</span>
                        </h2>
                    </div>

                    <nav className="hidden md:flex items-center gap-8">
                        {BASE_NAV_ITEMS.map(({ href, label }) => {
                            const isActive = pathname.startsWith(href) && (href !== '/dashboard' || pathname === '/dashboard');
                            return (
                                <a key={href} href={href}
                                    className={`font-bold font-roboto text-sm transition-colors ${isActive ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}>
                                    {label}
                                </a>
                            );
                        })}
                        {user.role === 'personal' && (
                            <a href="/students"
                                className={`font-bold font-roboto text-sm transition-colors ${pathname.startsWith('/students') ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}>
                                Alunos
                            </a>
                        )}
                    </nav>
                </div>

                <div className="flex items-center gap-4 relative" ref={menuRef}>
                    <button className="size-10 flex items-center justify-center bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors shrink-0" onClick={handleLogout} title="Sair">
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                    </button>
                    <div
                        className={`size-10 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center cursor-pointer font-bold font-inter text-slate-600 shrink-0 select-none hover:bg-slate-300 transition-colors`}
                        title={user.name}
                        onClick={() => setShowUserMenu(!showUserMenu)}
                    >
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    {showUserMenu && (
                        <div className="absolute top-[120%] right-0 bg-white border border-slate-100 shadow-xl rounded-2xl py-2 min-w-[160px] flex flex-col z-50 shadow-slate-200/50">
                            {isSupervisor && (
                                <a href="/admin" className={`px-5 py-3 text-sm font-bold transition-colors border-b border-slate-50 ${pathname.startsWith('/admin') ? 'text-primary bg-slate-50/50' : 'text-slate-600 hover:text-primary hover:bg-slate-50'}`} onClick={() => setShowUserMenu(false)}>
                                    Admin
                                </a>
                            )}
                            {isSupervisor && (
                                <a href="/exercises" className={`px-5 py-3 text-sm font-bold transition-colors border-b border-slate-50 ${pathname.startsWith('/exercises') ? 'text-primary bg-slate-50/50' : 'text-slate-600 hover:text-primary hover:bg-slate-50'}`} onClick={() => setShowUserMenu(false)}>
                                    Exercícios
                                </a>
                            )}
                            <a href="/profile" className={`px-5 py-3 text-sm font-bold transition-colors ${pathname.startsWith('/profile') ? 'text-primary bg-slate-50/50' : 'text-slate-600 hover:text-primary hover:bg-slate-50'}`} onClick={() => setShowUserMenu(false)}>
                                Perfil
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
