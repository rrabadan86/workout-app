'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, Trophy, Bell } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { UFitLogo } from '@/components/UFitLogo';

const SUPERVISOR_EMAIL = 'rodrigorabadan@gmail.com';

const BASE_NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/projects', label: 'Treinos' },
    { href: '/history', label: 'Histórico' },
    { href: '/community', label: 'Comunidade' },
    { href: '/compare', label: 'Comparar' },
    { href: '/challenges', label: 'Desafios', icon: true },
];

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { userId, logout } = useAuth();
    const { store, markNotificationRead, markAllNotificationsRead } = useStore();

    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const bellRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowUserMenu(false);
            }
            if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    useEffect(() => {
        setShowMobileMenu(false);
    }, [pathname]);

    if (!userId) return null;

    const user = store.profiles.find((u) => u.id === userId);
    if (!user) return null;

    const isSupervisor = user.email === SUPERVISOR_EMAIL;

    const allNavItems = [...BASE_NAV_ITEMS];
    if (user.role === 'personal') {
        const treinosIdx = allNavItems.findIndex(i => i.href === '/projects');
        allNavItems.splice(treinosIdx + 1, 0, { href: '/students', label: 'Alunos' });
    }

    // Only show current user's notifications
    const myNotifications = store.notifications.filter(n => n.user_id === userId);
    const unreadCount = myNotifications.filter(n => !n.read).length;

    function handleLogout() {
        logout();
        router.push('/');
    }

    function handleNotificationClick(notif: typeof myNotifications[number]) {
        markNotificationRead(notif.id);
        if (notif.reference_id) {
            router.push(`/challenges/${notif.reference_id}`);
        }
        setShowNotifications(false);
    }

    function NotifIcon(type: string) {
        if (type === 'rank_top1') return '🥇';
        if (type === 'rank_down') return '📉';
        return '🔔';
    }

    function NavLink({ href, label, icon }: { href: string; label: string; icon?: boolean }) {
        const isActive = pathname.startsWith(href) && (href !== '/dashboard' || pathname === '/dashboard');
        return (
            <a href={href}
                className={`font-bold font-roboto text-sm flex items-center gap-1.5 transition-colors ${isActive ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}>
                {icon && <Trophy size={16} className={isActive ? 'text-primary' : 'text-slate-400'} />}
                {label}
            </a>
        );
    }

    function MobileNavLink({ href, label, icon }: { href: string; label: string; icon?: boolean }) {
        const isActive = pathname.startsWith(href) && (href !== '/dashboard' || pathname === '/dashboard');
        return (
            <a href={href}
                className={`flex items-center gap-2 px-6 py-3.5 font-bold text-sm transition-colors ${isActive ? 'text-primary bg-blue-50/50' : 'text-slate-700 hover:text-primary hover:bg-slate-50'}`}
                onClick={() => setShowMobileMenu(false)}>
                {icon && <Trophy size={18} className={isActive ? 'text-primary' : 'text-slate-400'} />}
                {label}
            </a>
        );
    }

    return (
        <>
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-50 px-6 lg:px-12 py-4">
                <div className="max-w-[1440px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-12">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/dashboard')}>
                            <UFitLogo width={40} height={40} className="drop-shadow-sm -ml-2" />
                            <h2 className="text-2xl font-extrabold font-inter tracking-tight text-slate-900" style={{ letterSpacing: '-1px' }}>
                                <span className="text-blue-600">u</span><span className="text-cyan-500">Fit</span>
                            </h2>
                        </div>

                        {/* Desktop nav */}
                        <nav className="hidden md:flex items-center gap-8">
                            {allNavItems.map(({ href, label, icon }) => (
                                <NavLink key={href} href={href} label={label} icon={icon} />
                            ))}
                        </nav>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Mobile hamburger button */}
                        <button
                            className="md:hidden size-10 flex items-center justify-center bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors"
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                            aria-label="Menu"
                        >
                            {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
                        </button>

                        {/* 🔔 Bell Notification Button */}
                        <div className="relative" ref={bellRef}>
                            <button
                                className="relative size-10 flex items-center justify-center bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors"
                                onClick={() => {
                                    setShowNotifications(prev => !prev);
                                    setShowUserMenu(false);
                                }}
                                aria-label="Notificações"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black leading-none size-4 flex items-center justify-center rounded-full">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute top-[120%] right-0 bg-white border border-slate-100 shadow-xl rounded-2xl min-w-[300px] max-w-[340px] flex flex-col z-50 shadow-slate-200/50 overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                                        <span className="font-bold text-sm text-slate-800">Notificações</span>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={() => markAllNotificationsRead(userId)}
                                                className="text-xs text-blue-500 hover:underline font-semibold"
                                            >
                                                Marcar todas como lidas
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-[360px] overflow-y-auto flex flex-col divide-y divide-slate-50">
                                        {myNotifications.length === 0 ? (
                                            <div className="py-8 text-center text-slate-400 text-sm font-medium">
                                                Nenhuma notificação por enquanto 🎉
                                            </div>
                                        ) : myNotifications.map(notif => (
                                            <button
                                                key={notif.id}
                                                onClick={() => handleNotificationClick(notif)}
                                                className={`flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors w-full ${!notif.read ? 'bg-blue-50/40' : ''}`}
                                            >
                                                <span className="text-lg shrink-0 mt-0.5">{NotifIcon(notif.type)}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-bold leading-tight ${notif.read ? 'text-slate-600' : 'text-slate-900'}`}>{notif.title}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">{notif.message}</p>
                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        {new Date(notif.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                {!notif.read && (
                                                    <span className="size-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Profile avatar + dropdown */}
                        <div className="relative" ref={menuRef}>
                            <div
                                className={`size-10 rounded-xl ${user.photo_url ? 'bg-transparent hover:opacity-80' : 'bg-slate-200 hover:bg-slate-300'} overflow-hidden flex items-center justify-center cursor-pointer font-bold font-inter text-slate-600 shrink-0 select-none transition-all`}
                                title={user.name}
                                onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
                            >
                                {user.photo_url ? (
                                    <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    user.name.charAt(0).toUpperCase()
                                )}
                            </div>
                            {showUserMenu && (
                                <div className="absolute top-[120%] right-0 bg-white border border-slate-100 shadow-xl rounded-2xl py-2 min-w-[160px] flex flex-col z-50 shadow-slate-200/50">
                                    {isSupervisor && (
                                        <a href="/exercises" className={`px-5 py-3 text-sm font-bold transition-colors border-b border-slate-50 ${pathname.startsWith('/exercises') ? 'text-primary bg-slate-50/50' : 'text-slate-600 hover:text-primary hover:bg-slate-50'}`} onClick={() => setShowUserMenu(false)}>
                                            Exercícios
                                        </a>
                                    )}
                                    <a href="/profile" className={`px-5 py-3 text-sm font-bold transition-colors border-b border-slate-50 ${pathname.startsWith('/profile') ? 'text-primary bg-slate-50/50' : 'text-slate-600 hover:text-primary hover:bg-slate-50'}`} onClick={() => setShowUserMenu(false)}>
                                        Perfil
                                    </a>
                                    {isSupervisor && (
                                        <a href="/usuarios" className={`px-5 py-3 text-sm font-bold transition-colors border-b border-slate-50 ${pathname.startsWith('/usuarios') ? 'text-primary bg-slate-50/50' : 'text-slate-600 hover:text-primary hover:bg-slate-50'}`} onClick={() => setShowUserMenu(false)}>
                                            Usuários
                                        </a>
                                    )}
                                    <button
                                        className="px-5 py-3 text-sm font-bold transition-colors text-rose-500 hover:text-rose-600 hover:bg-rose-50 text-left flex items-center gap-2"
                                        onClick={() => { setShowUserMenu(false); handleLogout(); }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                                        Sair
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile menu dropdown */}
            {showMobileMenu && (
                <div className="md:hidden fixed inset-0 top-[73px] z-40 bg-black/20 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)}>
                    <nav
                        className="bg-white border-b border-slate-100 shadow-xl py-2 animate-in slide-in-from-top-2 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {allNavItems.map(({ href, label, icon }) => (
                            <MobileNavLink key={href} href={href} label={label} icon={icon} />
                        ))}
                    </nav>
                </div>
            )}
        </>
    );
}
