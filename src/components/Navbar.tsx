'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';

const SUPERVISOR_EMAIL = 'rodrigorabadan@gmail.com';

const NAV_ITEMS = [
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

    if (!userId) return null;

    const user = store.users.find((u) => u.id === userId);
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
                        <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white shrink-0">
                            <span className="material-symbols-outlined font-bold">bolt</span>
                        </div>
                        <h2 className="text-2xl font-extrabold font-inter tracking-tight text-slate-900 uppercase">FitSync</h2>
                    </div>

                    <nav className="hidden md:flex items-center gap-8">
                        {NAV_ITEMS.map(({ href, label }) => {
                            const isActive = pathname.startsWith(href) && (href !== '/dashboard' || pathname === '/dashboard');
                            return (
                                <a key={href} href={href}
                                    className={`font-bold font-roboto text-sm transition-colors ${isActive ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}>
                                    {label}
                                </a>
                            );
                        })}
                        {isSupervisor && (
                            <a href="/exercises" className={`font-bold text-sm transition-colors ${pathname.startsWith('/exercises') ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}>
                                Exercícios
                            </a>
                        )}
                        {isSupervisor && (
                            <a href="/admin" className={`font-bold text-sm transition-colors ${pathname.startsWith('/admin') ? 'text-primary' : 'text-slate-400 hover:text-primary'}`}>
                                Admin
                            </a>
                        )}
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    <button className="size-10 flex items-center justify-center bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors shrink-0" onClick={handleLogout} title="Sair">
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                    </button>
                    <div className="size-10 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center cursor-pointer font-bold font-inter text-slate-600 shrink-0" title={user.name}>
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                </div>
            </div>
        </header>
    );
}
