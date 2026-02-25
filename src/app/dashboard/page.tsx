'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, ListChecks, BarChart2, Users, ChevronRight, TrendingUp, FolderOpen, Clock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Feed from '@/components/Feed';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';

export default function DashboardPage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store } = useStore();

    useEffect(() => {
        if (ready && !userId) router.replace('/');
    }, [ready, userId, router]);

    const user = store.users.find((u) => u.id === userId);
    const myProjects = store.projects.filter((p) => p.ownerId === userId || p.sharedWith.includes(userId || ''));

    // Find active friends (just top 4 friends who logged recently)
    const topActive = useMemo(() => {
        if (!userId || !user) return [];
        const counts: Record<string, number> = {};
        store.feedEvents.forEach(e => {
            if (e.eventType === 'WO_COMPLETED') counts[e.userId] = (counts[e.userId] || 0) + 1;
        });
        const allRelevantUsers = store.users.filter(u => user.friendIds?.includes(u.id) || u.id === user.id);
        const sorted = allRelevantUsers.sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0)).slice(0, 4);
        return sorted.map(u => ({ ...u, workoutsCount: counts[u.id] || 0 }));
    }, [store.feedEvents, store.users, user, userId]);

    const activeProject = myProjects.sort((a, b) => b.startDate.localeCompare(a.startDate))[0];

    // Other users to follow
    const peopleToFollow = useMemo(() => {
        if (!user) return [];
        return store.users.filter(u => u.id !== user.id && !user.friendIds?.includes(u.id)).slice(0, 3);
    }, [store.users, user]);

    // Calculate progress
    const progress = useMemo(() => {
        if (!activeProject || !activeProject.startDate || !activeProject.endDate) return 0;
        const start = new Date(activeProject.startDate).getTime();
        const end = new Date(activeProject.endDate).getTime();
        const now = new Date().getTime();

        if (now >= end) return 100;
        if (now <= start) return 0;
        if (end <= start) return 100; // fallback just in case
        return Math.round(((now - start) / (end - start)) * 100);
    }, [activeProject]);

    // Format Date helper
    const formatDateSafe = (dateStr: string) => {
        if (!dateStr) return '--';
        try {
            const [y, m, d] = dateStr.split('T')[0].split('-');
            if (!y || !m || !d) return dateStr;
            const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
        } catch (e) {
            return dateStr;
        }
    };

    // RULES OF HOOKS: All hooks must be called before conditional returns
    if (!ready || !userId) return null;
    if (!user) return null;

    return (
        <>
            <Navbar />

            <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 lg:px-12 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* 
                 * MOBILE ORDERING LOGIC (Using Flex/Grid Order):
                 * On mobile, grid items default to source order. We use order-{n} to re-arrange:
                 * 1. Active Project Widget (moved from aside)
                 * 2. Active Now (Amigos Mais Ativos)
                 * 3. People to Follow
                 * 4. Recent Activity
                 * 5. Quick Navigation Menu
                 * 
                 * On lg screens, we reset order (lg:order-none) because they are split into 2 columns.
                 */}

                {/* Main Feed Column (Left Side on Desktop) */}
                <div className="lg:col-span-8 flex flex-col gap-10 order-2 lg:order-none">

                    {/* Active Now Section (Order 2 on mobile) */}
                    {topActive.length > 0 && (
                        <section className="bg-white rounded-xl card-depth p-6 order-2 lg:order-none flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-extrabold font-inter tracking-tight text-slate-900">Amigos Mais Ativos</h2>
                                    <p className="text-slate-400 text-[10px] font-bold font-montserrat uppercase tracking-wider">Últimos treinos concluídos</p>
                                </div>
                                <a className="text-primary font-bold font-montserrat text-sm hover:underline cursor-pointer" onClick={() => router.push('/community')}>Ver Comunidade</a>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {topActive.map((u) => {
                                    const parts = u.name.split(' ');
                                    const displayName = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];

                                    return (
                                        <div key={u.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group" onClick={() => router.push('/community')}>
                                            <div className="size-12 rounded-full story-ring shrink-0">
                                                <div className="w-full h-full rounded-full border-2 border-white overflow-hidden bg-white text-primary flex items-center justify-center font-extrabold text-lg">
                                                    {u.name.charAt(0).toUpperCase()}
                                                </div>
                                            </div>
                                            <div className="flex flex-col flex-1">
                                                <span className="text-sm font-bold font-inter text-slate-900 leading-tight" title={u.name}>{displayName}</span>
                                                <span className="text-[10px] font-bold font-roboto text-primary truncate mt-0.5">{u.workoutsCount} treinos</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Posts / Recent Activity Section (Order 4 on mobile) */}
                    <section className="flex flex-col gap-8 order-4 lg:order-none mt-2 lg:mt-0">
                        <h2 className="text-3xl font-extrabold font-inter tracking-tight text-slate-900">Atividade Recente</h2>
                        <Feed friendIds={user.friendIds || []} myId={userId} />
                    </section>
                </div>

                {/* Sidebar Column (Right Side on Desktop) */}
                <aside className="lg:col-span-4 flex flex-col gap-8 h-full order-1 lg:order-none content-start">

                    {/* Active Project Widget (Order 1 on mobile) */}
                    <div className="bg-slate-900 text-white rounded-2xl p-8 flex flex-col gap-8 soft-shadow shrink-0 relative overflow-hidden order-1 lg:order-none">
                        {/* Decorative background element mimicking the dark theme project widget */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 blur-3xl rounded-full pointer-events-none"></div>

                        <div className="relative z-10">
                            <h3 className="text-2xl font-extrabold font-inter mb-1">{activeProject ? 'Projeto Atual' : 'Nenhum Projeto'}</h3>
                            <p className="text-slate-400 text-sm font-bold font-roboto">Resumo Diário</p>
                        </div>

                        {activeProject ? (
                            <div className="flex items-center gap-6 relative z-10 cursor-pointer" onClick={() => router.push(`/projects/${activeProject.id}`)}>
                                <div className="relative size-20 shrink-0 flex items-center justify-center">
                                    <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                                        <circle className="stroke-slate-800" cx="18" cy="18" fill="none" r="16" strokeWidth="3"></circle>
                                        <circle className="stroke-primary" cx="18" cy="18" fill="none" r="16" strokeDasharray={`${progress}, 100`} strokeLinecap="round" strokeWidth="3"></circle>
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center text-center">
                                        <span className="text-xl font-extrabold font-inter text-white leading-none">{progress}%</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3 flex-grow">
                                    <div>
                                        <p className="text-[10px] font-bold font-roboto text-slate-500 uppercase tracking-widest leading-none mb-1">Nome do Projeto</p>
                                        <p className="text-lg font-bold font-inter leading-tight line-clamp-2">{activeProject.name}</p>
                                    </div>
                                    <div className="flex flex-col gap-2 mt-1">
                                        <div className="flex gap-4">
                                            <div className="flex flex-col gap-1">
                                                <p className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest leading-none">Início</p>
                                                <p className="text-xs font-bold font-roboto text-slate-200 leading-none">{formatDateSafe(activeProject.startDate)}</p>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <p className="text-[10px] font-bold font-montserrat text-slate-500 uppercase tracking-widest leading-none">Fim</p>
                                                <p className="text-xs font-bold font-roboto text-slate-200 leading-none">{formatDateSafe(activeProject.endDate)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative z-10 text-center py-4 text-slate-400 text-sm">
                                Crie um projeto para agrupar seus treinos e acompanhar sua evolução.
                            </div>
                        )}

                        <button className="relative z-10 w-full py-4 bg-white text-slate-900 rounded-xl font-extrabold font-montserrat hover:bg-primary hover:text-white transition-colors"
                            onClick={() => router.push(activeProject ? `/projects/${activeProject.id}` : '/projects')}>
                            {activeProject ? 'Ver Detalhes do Projeto' : 'Criar Novo Projeto'}
                        </button>
                    </div>

                    {/* People to Follow Widget (Order 3 on mobile) */}
                    {peopleToFollow.length > 0 && (
                        <div className="bg-white rounded-2xl card-depth p-6 flex flex-col order-3 lg:order-none">
                            <h3 className="text-xl font-extrabold font-inter mb-4 tracking-tight text-slate-900">Pessoas a Seguir</h3>
                            <div className="flex flex-col gap-4">
                                {peopleToFollow.map(u => (
                                    <div key={u.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center font-extrabold text-primary shrink-0">
                                                {u.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold font-inter text-sm text-slate-900">{u.name}</p>
                                                <p className="text-slate-400 font-roboto text-xs">Membro FitSync</p>
                                            </div>
                                        </div>
                                        <button className="size-10 bg-slate-50 text-primary rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors" onClick={() => router.push('/community')}>
                                            <span className="material-symbols-outlined font-bold">add</span>
                                        </button>
                                    </div>
                                ))}

                                <div className="flex items-center justify-center mt-2 border-t border-slate-50 pt-6">
                                    <button className="text-slate-500 hover:text-slate-800 transition-colors text-[10px] font-bold font-montserrat uppercase tracking-widest w-full text-center" onClick={() => router.push('/community')}>
                                        Descobrir mais
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Navigation Menu replacing the old icon grids (Order 5 on mobile) */}
                    <div className="bg-white rounded-2xl card-depth p-8 flex flex-col order-5 lg:order-none">
                        <h3 className="text-xl font-extrabold font-inter mb-6 tracking-tight text-slate-900">Atalhos</h3>
                        <div className="flex flex-col gap-3">
                            <button className="flex items-center gap-4 w-full bg-slate-50 p-4 rounded-xl hover:bg-slate-100 transition-all font-bold group" onClick={() => router.push('/projects')}>
                                <div className="size-10 rounded-lg bg-indigo-100 text-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"><FolderOpen size={18} /></div>
                                <span className="flex-1 text-left font-inter">Meus Projetos</span>
                                <ChevronRight className="shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors" size={18} />
                            </button>
                            <button className="flex items-center gap-4 w-full bg-slate-50 p-4 rounded-xl hover:bg-slate-100 transition-all font-bold group" onClick={() => router.push('/projects')}>
                                <div className="size-10 rounded-lg bg-emerald-100 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"><Users size={18} /></div>
                                <span className="flex-1 text-left font-inter leading-tight">Projetos Compartilhados</span>
                                <ChevronRight className="shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors" size={18} />
                            </button>
                            <button className="flex items-center gap-4 w-full bg-slate-50 p-4 rounded-xl hover:bg-slate-100 transition-all font-bold group" onClick={() => router.push('/history')}>
                                <div className="size-10 rounded-lg text-amber-500 bg-amber-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"><Clock size={18} /></div>
                                <span className="flex-1 text-left font-inter leading-tight">Histórico de Treinos</span>
                                <ChevronRight className="shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors" size={18} />
                            </button>
                        </div>
                    </div>
                </aside>
            </main>

            {/* Floating Action Button for Start Workout */}
            <div className="fixed bottom-8 right-8 z-50">
                <button className="flex items-center justify-center gap-2 bg-primary text-white px-8 py-5 rounded-full font-extrabold font-montserrat shadow-2xl shadow-primary/30 hover:scale-105 transition-transform text-sm tracking-wide" onClick={() => router.push('/projects')}>
                    INICIAR TREINO
                </button>
            </div>
        </>
    );
}
