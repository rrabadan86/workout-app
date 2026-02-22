'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Dumbbell, LayoutDashboard, ListChecks, BarChart2, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/exercises', label: 'Exercícios', icon: ListChecks },
    { href: '/workouts', label: 'Treinos', icon: Dumbbell },
    { href: '/compare', label: 'Comparar', icon: BarChart2 },
];

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const { userId, logout } = useAuth();
    const { store } = useStore();

    if (!userId) return null;

    const user = store.users.find((u) => u.id === userId);
    if (!user) return null;

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
