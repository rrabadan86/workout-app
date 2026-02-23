'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, ListChecks, BarChart2, Users, ChevronRight, TrendingUp, FolderOpen, Clock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Feed from '@/components/Feed';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { formatDate } from '@/lib/utils';

export default function DashboardPage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store } = useStore();

    useEffect(() => {
        if (ready && !userId) router.replace('/');
    }, [ready, userId, router]);

    if (!ready || !userId) return null;

    const user = store.users.find((u) => u.id === userId);
    if (!user) return null;

    const myProjects = store.projects.filter((p) => p.ownerId === userId || p.sharedWith.includes(userId));
    const myStats = {
        exercises: store.exercises.length,
        projects: store.projects.filter((p) => p.ownerId === userId).length,
        shared: store.projects.filter((p) => p.sharedWith.includes(userId)).length,
        logs: store.logs.filter((l) => l.userId === userId).length,
    };

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="page-header" style={{ paddingTop: 40 }}>
                    <div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{greeting},</p>
                        <h1 className="page-title">{user.name} 💪</h1>
                    </div>
                    <button className="btn btn-primary" onClick={() => router.push('/projects')}>
                        <Dumbbell size={16} /> Iniciar Treino
                    </button>
                </div>

                <div className="grid-2" style={{ marginBottom: 32 }}>
                    {[
                        { value: myStats.exercises, label: 'Exercícios cadastrados', icon: ListChecks, cls: 'stat-icon-purple', href: '/exercises' },
                        { value: myStats.projects, label: 'Meus projetos', icon: FolderOpen, cls: 'stat-icon-green', href: '/projects' },
                        { value: myStats.shared, label: 'Projetos compartilhados', icon: Users, cls: 'stat-icon-pink', href: '/projects' },
                        { value: myStats.logs, label: 'Registros de treino', icon: TrendingUp, cls: 'stat-icon-orange', href: '/compare' },
                    ].map(({ value, label, icon: Icon, cls, href }) => (
                        <div key={label} className="stat-card" onClick={() => router.push(href)} style={{ cursor: 'pointer' }}>
                            <div className={`stat-icon ${cls}`}><Icon size={22} /></div>
                            <div>
                                <div className="stat-value">{value}</div>
                                <div className="stat-label">{label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Projetos Recentes</h2>
                        <a href="/projects" className="btn btn-ghost btn-sm">Ver todos <ChevronRight size={14} /></a>
                    </div>
                    {myProjects.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                            <FolderOpen size={36} color="var(--text-muted)" style={{ marginBottom: 12 }} />
                            <p style={{ color: 'var(--text-secondary)' }}>Nenhum projeto ainda. Crie seu primeiro projeto!</p>
                            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => router.push('/projects')}>Criar projeto</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {myProjects.slice(0, 3).map((p) => (
                                <div key={p.id} className="item-card" onClick={() => router.push(`/projects/${p.id}`)}>
                                    <div className="stat-icon stat-icon-purple" style={{ width: 40, height: 40 }}><FolderOpen size={18} /></div>
                                    <div className="item-card-info">
                                        <div className="item-card-title">{p.name}</div>
                                        <div className="item-card-sub">{store.workouts.filter((w) => w.projectId === p.id).length} treino(s)</div>
                                    </div>
                                    <ChevronRight size={18} color="var(--text-muted)" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* --- Feed Section --- */}
                <div style={{ marginBottom: 40 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Atividade Recente</h2>
                    </div>
                    <Feed friendIds={user.friendIds || []} myId={userId} />
                </div>

                <div className="grid-3" style={{ marginBottom: 40 }}>
                    {[
                        { label: 'Meus Exercícios', sub: 'Gerencie sua biblioteca', href: '/exercises', icon: ListChecks, cls: 'stat-icon-purple' },
                        { label: 'Comparar Evolução', sub: 'Compare com amigos', href: '/compare', icon: BarChart2, cls: 'stat-icon-green' },
                        { label: 'Projetos', sub: 'Crie e gerencie', href: '/projects', icon: FolderOpen, cls: 'stat-icon-pink' },
                        { label: 'Comunidade', sub: 'Encontre amigos', href: '/community', icon: Users, cls: 'stat-icon-orange', hideOnDesktop: true },
                        { label: 'Histórico', sub: 'Veja treinos passados', href: '/history', icon: Clock, cls: 'stat-icon-blue', hideOnDesktop: true },
                    ].map(({ label, sub, href, icon: Icon, cls, hideOnDesktop }) => (
                        <a key={href} href={href} className={`item-card ${hideOnDesktop ? 'hide-on-desktop' : ''}`}>
                            <div className={`stat-icon ${cls}`} style={{ width: 40, height: 40 }}><Icon size={18} /></div>
                            <div className="item-card-info">
                                <div className="item-card-title">{label}</div>
                                <div className="item-card-sub">{sub}</div>
                            </div>
                            <ChevronRight size={16} color="var(--text-muted)" />
                        </a>
                    ))}
                </div>
            </div>
        </>
    );
}
