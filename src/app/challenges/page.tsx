'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trophy, Calendar, Users, ChevronRight, Lock, Globe } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { formatDate, today } from '@/lib/utils';
import type { Challenge } from '@/lib/types';

function challengeStatus(c: Challenge): 'ativo' | 'inativo' | 'futuro' {
    const todayStr = today();
    if (c.status === 'ended') return 'inativo';
    if (todayStr < c.start_date) return 'futuro';
    if (todayStr > c.end_date) return 'inativo';
    return 'ativo';
}

const STATUS_LABEL = {
    ativo: { label: 'Ativo', color: '#22c55e', bg: '#22c55e18', dot: '🟢' },
    inativo: { label: 'Encerrado', color: '#9ca3af', bg: '#9ca3af18', dot: '⚪' },
    futuro: { label: 'Em breve', color: '#f59e0b', bg: '#f59e0b18', dot: '🟡' },
};

export default function ChallengesPage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, loading } = useStore();
    const currentUser = store.profiles.find((u) => u.id === userId);

    const [filterStatus, setFilterStatus] = useState<'Todos' | 'ativos' | 'inativos'>('Todos');
    const [filterParticipation, setFilterParticipation] = useState<'Todos' | 'Meus' | 'Explorar'>('Meus');

    useEffect(() => { if (ready && !userId) router.replace('/'); }, [ready, userId, router]);

    if (!ready || !userId || loading) return null;

    // Filter challenges based on participation and status
    const displayedChallenges = store.challenges.filter((c) => {
        // Find my participant record
        const myParticipant = store.challengeParticipants.find(p => p.challenge_id === c.id && p.user_id === userId);
        const amIParticipant = !!myParticipant;
        const amIOwner = c.created_by === userId;

        // Filter by participation tab
        if (filterParticipation === 'Meus' && !amIParticipant && !amIOwner) return false;
        if (filterParticipation === 'Explorar' && (amIParticipant || c.visibility === 'private' || c.join_rule === 'invite_only')) return false;

        // Filter by active status
        const isActive = challengeStatus(c) === 'ativo';
        if (filterStatus === 'ativos' && !isActive && challengeStatus(c) !== 'futuro') return false;
        if (filterStatus === 'inativos' && isActive) return false;
        if (filterStatus === 'inativos' && challengeStatus(c) === 'futuro') return false;

        return true;
    });

    function openCreate() {
        router.push('/challenges/new');
    }

    return (
        <>
            <Navbar />
            <main className="flex-1 w-full max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8">
                {/* ─── Header ─── */}
                <div className="flex flex-col gap-5 mb-8">
                    <div>
                        <button onClick={() => router.push('/dashboard')} className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-4 py-2 text-sm mb-3">
                            ← Voltar ao Dashboard
                        </button>
                        <h1 className="page-title">Desafios</h1>
                        <p className="page-subtitle">{displayedChallenges.length} desafio(s) encontrados</p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            className="btn bg-amber-500 text-white hover:scale-[1.02] shadow-xl shadow-amber-500/30 px-5 py-3 flex-1 sm:flex-none justify-center"
                            onClick={openCreate}
                            style={{ border: 'none' }}
                        >
                            <Plus size={16} /> Criar Desafio
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 flex-wrap">
                        <select className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 shadow-sm outline-none min-w-0 flex-1 sm:flex-none" value={filterParticipation} onChange={e => setFilterParticipation(e.target.value as any)}>
                            <option value="Meus">Meus Desafios</option>
                            <option value="Explorar">Explorar Públicos</option>
                            <option value="Todos">Todos</option>
                        </select>
                        <select className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 shadow-sm outline-none min-w-0 flex-1 sm:flex-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
                            <option value="Todos">Todos (Status)</option>
                            <option value="ativos">Ativos / Futuros</option>
                            <option value="inativos">Encerrados</option>
                        </select>
                    </div>
                </div>

                {/* ─── Challenge Cards ─── */}
                {displayedChallenges.length === 0 ? (
                    <div className="bg-white rounded-xl card-depth p-10 mt-8 text-center flex flex-col items-center justify-center border border-slate-100">
                        <Trophy size={48} className="text-slate-300 mb-4" />
                        <p className="text-slate-500 font-bold font-roboto">Nenhum desafio encontrado.</p>
                        <button className="btn bg-amber-500 text-white hover:scale-[1.02] shadow-xl shadow-amber-500/30 px-6 py-4 mt-6 border-none" onClick={openCreate}>
                            Criar meu primeiro desafio
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 mb-10">
                        {displayedChallenges.map((c) => {
                            const cStatusLabel = challengeStatus(c);
                            const st = STATUS_LABEL[cStatusLabel];
                            const participantCount = store.challengeParticipants.filter((p) => p.challenge_id === c.id).length;

                            const myParticipant = store.challengeParticipants.find(p => p.challenge_id === c.id && p.user_id === userId);
                            const role = myParticipant?.role || (c.created_by === userId ? 'owner' : null);

                            const ownerParticipant = store.challengeParticipants.find(p => p.challenge_id === c.id && p.role === 'owner');
                            const creatorId = ownerParticipant?.user_id ?? c.created_by;
                            const creator = creatorId ? store.profiles.find(u => u.id === creatorId) : null;
                            const creatorLabel = creatorId === userId ? 'Você' : (creator?.name?.split(' ')[0] ?? null);

                            return (
                                <div
                                    key={c.id}
                                    className={`
                                        group bg-white card-depth rounded-xl
                                        border border-transparent
                                        hover:border-amber-500/20 hover:shadow-lg cursor-pointer active:scale-[0.99]
                                        transition-all duration-200
                                    `}
                                    onClick={() => router.push(`/challenges/${c.id}`)}
                                >
                                    {/* ── Card Content ── */}
                                    <div className="p-4 sm:p-5">
                                        {/* Row 1: Icon + Title + Badges */}
                                        <div className="flex items-start gap-3">
                                            <div className="size-10 sm:size-12 rounded-xl flex items-center justify-center bg-slate-100 text-2xl shrink-0 mt-0.5">
                                                {c.emoji || '🏆'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {/* Title */}
                                                <h3 className="item-card-title text-[0.95rem] sm:text-base font-bold text-slate-900 leading-snug line-clamp-2">
                                                    {c.title}
                                                </h3>

                                                {/* Badges row */}
                                                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                                    <span
                                                        className="inline-flex items-center gap-1 text-[0.65rem] font-bold rounded-full px-2 py-0.5"
                                                        style={{ color: st.color, background: st.bg }}
                                                    >
                                                        {st.dot} {st.label}
                                                    </span>
                                                    {creatorLabel && (
                                                        <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold text-violet-700 bg-violet-50 border border-violet-100 rounded-full px-2 py-0.5">
                                                            👑 {creatorLabel}
                                                        </span>
                                                    )}
                                                    {role === 'admin' && (
                                                        <span className="inline-flex items-center text-[0.65rem] font-bold text-blue-500 bg-blue-50 rounded-full px-2 py-0.5">
                                                            🛡️ Admin
                                                        </span>
                                                    )}
                                                    {!role && filterParticipation === 'Explorar' && (
                                                        <span className="inline-flex items-center text-[0.65rem] font-bold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                                                            Não inscrito
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Desktop chevron */}
                                            <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 hidden sm:block mt-2" />
                                        </div>

                                        {/* Row 2: Metadata */}
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 ml-[52px] sm:ml-[60px] text-[0.75rem] text-slate-500">
                                            <span className="inline-flex items-center gap-1.5">
                                                <Calendar size={12} className="text-slate-400" />
                                                {formatDate(c.start_date)} → {formatDate(c.end_date)}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5">
                                                <Users size={12} className="text-slate-400" />
                                                {participantCount}{c.max_participants ? `/${c.max_participants}` : ''} inscritos
                                            </span>
                                        </div>

                                        {/* Row 3: Visibility & Rules */}
                                        <div className="ml-[52px] sm:ml-[60px] mt-1.5 flex flex-col gap-0.5">
                                            {c.visibility === 'private' ? (
                                                <span className="text-[0.72rem] text-slate-400 inline-flex items-center gap-1">
                                                    <Lock size={11} /> Privado
                                                </span>
                                            ) : (
                                                <span className="text-[0.72rem] text-slate-400 inline-flex items-center gap-1">
                                                    <Globe size={11} /> Público
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Link block on mobile to explicitly say Abrir */}
                                    <div className="flex items-center gap-1 px-4 sm:hidden py-2.5 border-t border-slate-100/80">
                                        <button className="ml-auto inline-flex items-center gap-1 text-[0.72rem] font-medium text-slate-400 hover:text-slate-700 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                                            {role ? 'Abrir' : 'Ver Detalhes'} <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </>
    );
}
