'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Dumbbell, LayoutDashboard, ListChecks, BarChart2, LogOut, Shield, FolderOpen, Users, Clock } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';

const SUPERVISOR_EMAIL = 'rodrigorabadan@gmail.com';

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/projects', label: 'Projetos', icon: FolderOpen },
    { href: '/compare', label: 'Comparar', icon: BarChart2 },
    { href: '/history', label: 'Histórico', icon: Clock },
    { href: '/community', label: 'Comunidade', icon: Users },
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
        <nav className="navbar">
            <div className="navbar-logo">
                <Dumbbell size={22} color="var(--accent)" />
                <span>FitSync</span>
            </div>

            <div className="navbar-links">
                {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                    <a key={href} href={href} className={`nav-link ${pathname.startsWith(href) ? 'active' : ''}`}>
                        <Icon size={14} style={{ display: 'inline', marginRight: 4 }} />
                        {label}
                    </a>
                ))}
                {isSupervisor && (
                    <>
                        <a href="/exercises" className={`nav-link ${pathname.startsWith('/exercises') ? 'active' : ''}`}>
                            <ListChecks size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Exercícios
                        </a>
                        <a href="/admin" className={`nav-link ${pathname.startsWith('/admin') ? 'active' : ''}`}
                            style={{ color: 'var(--accent)' }}>
                            <Shield size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Admin
                        </a>
                    </>
                )}
            </div>

            <div className="nav-user">
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{user.name}</span>
                <div className="avatar">{user.name[0].toUpperCase()}</div>
                <button className="btn-icon" onClick={handleLogout} title="Sair">
                    <LogOut size={16} />
                </button>
            </div>
        </nav>
    );
}
