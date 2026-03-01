'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, ChevronRight, ChevronLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Feed from '@/components/Feed';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';

export default function DashboardPage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, loading } = useStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (ready && !userId) router.replace('/');
    }, [ready, userId, router]);

    const user = useMemo(() => store.profiles.find((u) => u.id === userId), [store.profiles, userId]);

    const myProjects = store.projects.filter((p) =>
        p.ownerId === userId ||
        p.sharedWith.includes(userId || '') ||
        p.prescribed_to === userId
    );

    // "Friends" = people who share projects with me + my linked personal/students
    const myFriendsIds = useMemo(() => {
        if (!userId) return [];
        const set = new Set<string>();
        if (user && user.friendIds) {
            user.friendIds.forEach(id => set.add(id));
        }
        store.projects.forEach(p => {
            if (p.ownerId === userId) {
                p.sharedWith.forEach(id => set.add(id));
            } else if (p.sharedWith.includes(userId)) {
                set.add(p.ownerId);
            }
        });
        store.projects.forEach(p => {
            if (p.prescribed_by === userId && p.prescribed_to) set.add(p.prescribed_to);
            if (p.prescribed_to === userId && p.prescribed_by) set.add(p.prescribed_by);
        });
        return Array.from(set);
    }, [store.projects, userId, user]);

    // Active friends — check-ins nos últimos 15 dias
    const topActive = useMemo(() => {
        if (!userId || !user) return [];
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

        const counts: Record<string, number> = {};
        store.feedEvents.forEach(e => {
            if (e.eventType.startsWith('WO_COMPLETED') && new Date(e.createdAt) >= fifteenDaysAgo) {
                counts[e.userId] = (counts[e.userId] || 0) + 1;
            }
        });

        // include self too
        const allRelevantIds = [...myFriendsIds, userId];
        const allRelevantUsers = store.profiles.filter(u => allRelevantIds.includes(u.id));
        return allRelevantUsers
            .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))
            .map(u => ({ ...u, workoutsCount: counts[u.id] || 0 }));
    }, [store.feedEvents, store.profiles, user, userId, myFriendsIds]);

    const activeProject = myProjects
        .filter(p => !p.prescribed_to || p.prescribed_to === userId)
        .sort((a, b) => b.startDate.localeCompare(a.startDate))[0];

    // Student count (for personal trainers)
    const myStudents = useMemo(() => {
        if (!userId || user?.role !== 'personal') return [];
        return store.profiles.filter(u =>
            store.projects.some(p => p.prescribed_by === userId && p.prescribed_to === u.id)
        );
    }, [store.profiles, store.projects, userId, user]);

    // Format Date helper
    const formatDateSafe = (dateStr: string) => {
        if (!dateStr) return '--';
        try {
            const [y, m, d] = dateStr.split('T')[0].split('-');
            if (!y || !m || !d) return dateStr;
            const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            return `${d} ${months[parseInt(m, 10) - 1]}`;
        } catch {
            return dateStr;
        }
    };

    if (!mounted || !ready || !userId || loading) return null;
    if (!user) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium font-roboto">Carregando dados...</p>
            </div>
        </div>
    );

    return (
        <>
            <Navbar />

            <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-12 py-6 lg:py-10 flex flex-col gap-6 lg:gap-8">

                {/* ─── TOP ROW: Amigos Mais Ativos ─── */}
                {topActive.length > 0 && (
                    <section className="bg-white rounded-2xl card-depth p-5 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-base font-extrabold font-inter text-slate-900">Amigos Mais Ativos</h2>
                                <p className="text-slate-400 text-[10px] font-bold font-montserrat uppercase tracking-wider mt-0.5">
                                    Check-ins nos últimos 15 dias
                                </p>
                            </div>
                            <button
                                className="text-primary font-bold font-montserrat text-xs hover:underline flex items-center gap-1"
                                onClick={() => router.push('/community')}
                            >
                                Ver Todos <ChevronRight size={13} />
                            </button>
                        </div>
                        {/* Horizontal scroll row */}
                        <div className="flex gap-4 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                            {topActive.map((u) => {
                                const firstName = u.name.split(' ')[0];
                                const isMe = u.id === userId;
                                return (
                                    <button
                                        key={u.id}
                                        className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
                                        onClick={() => router.push(isMe ? '/profile' : `/community?user=${u.id}`)}
                                    >
                                        <div className="relative">
                                            <div className={`size-14 sm:size-16 rounded-full ${u.workoutsCount > 0 ? 'story-ring' : 'bg-slate-100'} p-0.5 transition-transform group-hover:scale-105`}>
                                                <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-slate-100 flex items-center justify-center font-extrabold text-lg text-primary">
                                                    {u.photo_url ? (
                                                        <img src={u.photo_url} alt={u.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span>{u.name.charAt(0).toUpperCase()}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-xs font-bold font-inter text-slate-800 leading-tight max-w-[72px] truncate">
                                                {isMe ? 'Você' : firstName}
                                            </span>
                                            <span className="text-[10px] font-bold text-primary font-roboto">
                                                {u.workoutsCount} check-in{u.workoutsCount !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* ─── MAIN GRID: 2 colunas no desktop ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">

                    {/* ── LEFT: Feed ── */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        <div>
                            <h2 className="text-xl font-extrabold font-inter tracking-tight text-slate-900 mb-4">Atividade Recente</h2>
                            <Feed friendIds={myFriendsIds} myId={userId} />
                        </div>
                    </div>

                    {/* ── RIGHT: Sidebar ── */}
                    <aside className="lg:col-span-4 flex flex-col gap-4 order-first lg:order-none">

                        {/* Card: Treino Atual */}
                        <div
                            className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col gap-5 relative overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
                            onClick={() => router.push(activeProject ? `/projects/${activeProject.id}` : '/projects')}
                        >
                            {/* Decorative glow */}
                            <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/20 blur-3xl rounded-full pointer-events-none" />
                            <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />

                            <div className="relative z-10">
                                <p className="text-[10px] font-bold font-montserrat text-slate-400 uppercase tracking-widest mb-1">
                                    Treino Atual
                                </p>
                                {activeProject ? (
                                    <>
                                        <h3 className="text-2xl font-extrabold font-inter leading-tight line-clamp-2">
                                            {user?.role !== 'personal'
                                                ? activeProject.name.replace('✨ ', '').replace('✨', '')
                                                : activeProject.name}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-2">
                                            {activeProject.startDate && (
                                                <span className="text-xs font-bold text-slate-400">
                                                    Início {formatDateSafe(activeProject.startDate)}
                                                </span>
                                            )}
                                            {activeProject.endDate && (
                                                <>
                                                    <span className="text-slate-700">·</span>
                                                    <span className="text-xs font-bold text-slate-400">
                                                        Fim {formatDateSafe(activeProject.endDate)}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <h3 className="text-xl font-extrabold font-inter">Nenhum treino ativo</h3>
                                )}
                            </div>

                            <button
                                className="relative z-10 w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl font-bold font-montserrat text-sm transition-colors text-center"
                                onClick={(e) => { e.stopPropagation(); router.push(activeProject ? `/projects/${activeProject.id}` : '/projects'); }}
                            >
                                {activeProject ? 'Ver Detalhes' : 'Criar Treino'}
                            </button>
                        </div>

                        {/* Cards de Personal Trainer */}
                        {user.role === 'personal' && (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    className="bg-white rounded-2xl card-depth p-4 flex flex-col gap-1 hover:shadow-md transition-shadow text-left"
                                    onClick={() => router.push('/students')}
                                >
                                    <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center mb-1">
                                        <Users size={16} className="text-primary" />
                                    </div>
                                    <span className="text-2xl font-extrabold font-inter text-slate-900">{myStudents.length}</span>
                                    <span className="text-[10px] font-bold font-montserrat text-slate-400 uppercase tracking-wider">Alunos Ativos</span>
                                </button>
                                <button
                                    className="bg-primary/5 border-2 border-dashed border-primary/30 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 hover:bg-primary/10 transition-colors"
                                    onClick={() => router.push('/projects')}
                                >
                                    <Plus size={22} className="text-primary" />
                                    <span className="text-xs font-bold font-montserrat text-primary uppercase tracking-wide text-center">Criar Treino</span>
                                </button>
                            </div>
                        )}
                    </aside>
                </div>
            </main>

            {/* FAB - Start Workout (desktop only, mobile uses bottom nav) */}
            <div className="hidden md:block fixed bottom-8 right-8 z-50">
                <button
                    className="flex items-center justify-center gap-2 bg-primary text-white px-7 py-4 rounded-full font-extrabold font-montserrat shadow-2xl shadow-primary/30 hover:scale-105 transition-transform text-sm tracking-wide"
                    onClick={() => router.push('/projects')}
                >
                    INICIAR TREINO
                </button>
            </div>
        </>
    );
}
