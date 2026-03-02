'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Toast from '@/components/Toast';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import {
    Users, UserPlus, UserCheck, Search, Activity, X, Trophy,
    ChevronRight, Plus, Calendar, Lock, Globe
} from 'lucide-react';
import type { Profile, FeedEvent, Challenge } from '@/lib/types';
import { formatDate, today } from '@/lib/utils';

type Tab = 'comunidade' | 'desafios';

// ─── Challenge helpers ────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────

function CommunityContent() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, loading, updateProfile } = useStore();

    // Tabs & community filters
    const [activeTab, setActiveTab] = useState<Tab>('comunidade');
    const [searchName, setSearchName] = useState('');
    const [searchCity, setSearchCity] = useState('');
    const [searchState, setSearchState] = useState('');
    const [filterRole, setFilterRole] = useState<'all' | 'personal' | 'user'>('all');

    // Challenges filters (mirrors /challenges page)
    const [filterStatus, setFilterStatus] = useState<'Todos' | 'ativos' | 'inativos'>('Todos');
    const [filterParticipation, setFilterParticipation] = useState<'Todos' | 'Meus' | 'Explorar'>('Meus');

    const [saving, setSaving] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

    const searchParams = useSearchParams();

    useEffect(() => {
        if (ready && !userId) router.replace('/');
    }, [ready, userId, router]);

    // Auto-open a tab from query params (e.g. ?tab=desafios)
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'desafios') setActiveTab('desafios');
    }, [searchParams]);

    // Auto-open user modal if ?user=id is present in URL
    useEffect(() => {
        const uid = searchParams.get('user');
        if (uid && store.profiles.length > 0 && !selectedUser) {
            const userToOpen = store.profiles.find(p => p.id === uid);
            if (userToOpen) {
                setSelectedUser(userToOpen);
                router.replace('/community', { scroll: false });
            }
        }
    }, [searchParams, store.profiles, selectedUser, router]);

    // ── All hooks before conditional returns ──
    const me = useMemo(() => store.profiles.find(u => u.id === userId), [store.profiles, userId]);
    const myFriendIds = me?.friendIds || [];

    if (!ready || !userId || loading) return null;
    if (!me) return null;

    // ── Community: filter users ──
    const otherUsers = store.profiles.filter(u => {
        if (u.id === userId) return false;
        const nameMatch = u.name.toLowerCase().includes(searchName.toLowerCase());
        const cityMatch = searchCity ? u.city?.toLowerCase().includes(searchCity.toLowerCase()) : true;
        const stateMatch = searchState ? u.state?.toLowerCase() === searchState.toLowerCase() : true;
        let roleMatch = true;
        if (filterRole === 'personal') roleMatch = u.role === 'personal';
        if (filterRole === 'user') roleMatch = u.role === 'user';
        return nameMatch && cityMatch && stateMatch && roleMatch;
    });

    // ── Challenges: filter challenges (same as /challenges page) ──
    const displayedChallenges = store.challenges.filter((c) => {
        const myParticipant = store.challengeParticipants.find(p => p.challenge_id === c.id && p.user_id === userId);
        const amIParticipant = !!myParticipant;
        const amIOwner = c.created_by === userId;

        if (filterParticipation === 'Meus' && !amIParticipant && !amIOwner) return false;
        if (filterParticipation === 'Explorar' && (amIParticipant || c.visibility === 'private' || c.join_rule === 'invite_only')) return false;

        const isActive = challengeStatus(c) === 'ativo';
        if (filterStatus === 'ativos' && !isActive && challengeStatus(c) !== 'futuro') return false;
        if (filterStatus === 'inativos' && isActive) return false;
        if (filterStatus === 'inativos' && challengeStatus(c) === 'futuro') return false;

        return true;
    });

    // ── Community follow ──
    async function toggleFollow(targetId: string) {
        setSaving(targetId);
        let newFriendIds = [...myFriendIds];
        const isFollowing = myFriendIds.includes(targetId);
        if (isFollowing) {
            newFriendIds = newFriendIds.filter(id => id !== targetId);
        } else {
            newFriendIds.push(targetId);
        }
        try {
            await updateProfile({ ...me, friendIds: newFriendIds } as Profile);
            setSaving(null);
            setToast({
                msg: isFollowing ? 'Você deixou de seguir este usuário.' : 'Agora você segue este usuário!',
                type: 'success',
            });
        } catch {
            setSaving(null);
            setToast({ msg: 'Erro ao seguir.', type: 'error' });
        }
    }

    // ── User modal: recent activity ──
    function getUserRecentActivity(uid: string) {
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        return store.feedEvents
            .filter(e => e.userId === uid && e.eventType.startsWith('WO_COMPLETED') && new Date(e.createdAt) >= fifteenDaysAgo)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    function renderModalActivity(event: FeedEvent) {
        const workout = store.workouts.find(w => w.id === event.referenceId);
        if (!workout) return null;
        const eventDateObj = new Date(event.createdAt);
        const localDateStr = `${eventDateObj.getFullYear()}-${String(eventDateObj.getMonth() + 1).padStart(2, '0')}-${String(eventDateObj.getDate()).padStart(2, '0')}`;
        const formattedDate = eventDateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        const dayLogs = store.logs.filter(l => l.userId === event.userId && l.workoutId === workout.id && l.date === localDateStr);
        return (
            <div key={event.id} className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-3">
                <div className="flex justify-between items-center mb-2">
                    <div className="font-bold text-sm text-slate-900">{workout.name}</div>
                    <span className="text-xs font-bold text-slate-400">{formattedDate}</span>
                </div>
                {dayLogs.length === 0 ? (
                    <div className="mt-2 text-center">
                        <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-1 rounded-md font-bold uppercase">Concluído</span>
                    </div>
                ) : (
                    <div className="mt-2 flex flex-col gap-1.5">
                        {dayLogs.slice(0, 5).map(log => {
                            const exName = store.exercises.find(e => e.id === log.exerciseId)?.name || 'Exercício';
                            return (
                                <div key={log.id} className="flex justify-between text-xs">
                                    <span className="font-bold text-slate-500">{exName}</span>
                                    <span className="text-primary">{log.sets.length} séries</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <Navbar />

            <main className="flex-1 w-full max-w-[900px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8">

                {/* ─── Page Header ─── */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-extrabold font-inter tracking-tight text-slate-900">Social</h1>
                    <div className="size-10 rounded-xl flex items-center justify-center bg-rose-100 text-rose-500 shrink-0">
                        <Users size={20} />
                    </div>
                </div>

                {/* ─── Tabs ─── */}
                <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 gap-1">
                    <button
                        className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold font-montserrat transition-all ${activeTab === 'comunidade' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('comunidade')}
                    >
                        Comunidade
                    </button>
                    <button
                        className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold font-montserrat transition-all ${activeTab === 'desafios' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        onClick={() => setActiveTab('desafios')}
                    >
                        Desafios
                    </button>
                </div>

                {/* ════════════════════════════════════════
                    Tab: Comunidade
                ════════════════════════════════════════ */}
                {activeTab === 'comunidade' && (
                    <>
                        {/* Search & Filters */}
                        <div className="mb-6 flex flex-col gap-3">
                            <div className="flex items-center gap-3 bg-white card-depth border border-slate-100 rounded-xl px-4 py-3">
                                <Search size={18} className="text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar pelo nome..."
                                    value={searchName}
                                    onChange={(e) => setSearchName(e.target.value)}
                                    className="border-none bg-transparent outline-none w-full text-slate-900 placeholder:text-slate-400 font-medium text-sm"
                                />
                            </div>

                            <div className="flex gap-3 flex-wrap">
                                <select
                                    value={searchState}
                                    onChange={(e) => setSearchState(e.target.value)}
                                    className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-roboto text-slate-900 outline-none w-[90px]"
                                >
                                    <option value="">UF</option>
                                    {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                                        <option key={uf} value={uf}>{uf}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    placeholder="Cidade..."
                                    value={searchCity}
                                    onChange={(e) => setSearchCity(e.target.value)}
                                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-roboto text-slate-900 placeholder:text-slate-400 outline-none"
                                />
                                <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                                    {(['all', 'personal', 'user'] as const).map((role) => (
                                        <button
                                            key={role}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterRole === role ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            onClick={() => setFilterRole(role)}
                                        >
                                            {role === 'all' ? 'Todos' : role === 'personal' ? 'Personais' : 'Alunos'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* User List */}
                        {otherUsers.length === 0 ? (
                            <div className="bg-white rounded-xl card-depth p-10 text-center flex flex-col items-center">
                                <p className="text-slate-500 font-bold mb-1">Nenhum usuário encontrado.</p>
                                <p className="text-xs text-slate-400">Tente buscar por outro nome.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {otherUsers.map((u) => {
                                    const isFollowing = myFriendIds.includes(u.id);
                                    const isLoading = saving === u.id;
                                    return (
                                        <div
                                            key={u.id}
                                            className="bg-white rounded-xl card-depth p-4 flex items-center justify-between gap-4 cursor-pointer border border-transparent hover:border-primary/20 transition-all group"
                                            onClick={() => setSelectedUser(u)}
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className={`size-11 rounded-full ${u.photo_url ? 'bg-transparent' : 'bg-slate-100 group-hover:bg-primary/10'} overflow-hidden flex items-center justify-center font-extrabold text-primary shrink-0`}>
                                                    {u.photo_url
                                                        ? <img src={u.photo_url} alt={u.name} className="w-full h-full object-cover" />
                                                        : u.name.charAt(0).toUpperCase()
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold font-inter text-sm text-slate-900 truncate">{u.name}</p>
                                                    <p className="text-xs text-slate-400 font-roboto">{u.role === 'personal' ? 'Personal Trainer' : 'Membro VIMU'}</p>
                                                </div>
                                            </div>
                                            <button
                                                className={`btn font-montserrat text-xs ${isFollowing
                                                    ? 'btn-ghost border border-slate-200 text-slate-600 px-4 py-2'
                                                    : 'bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02] px-4 py-2'}`}
                                                onClick={(e) => { e.stopPropagation(); toggleFollow(u.id); }}
                                                disabled={isLoading}
                                            >
                                                {isLoading ? '...' : isFollowing
                                                    ? <><UserCheck size={13} /> Seguindo</>
                                                    : <><UserPlus size={13} /> Seguir</>}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* ════════════════════════════════════════
                    Tab: Desafios — conteúdo completo da página /challenges
                ════════════════════════════════════════ */}
                {activeTab === 'desafios' && (
                    <div className="flex flex-col gap-5">

                        {/* Action + Filters row */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <button
                                    className="btn bg-amber-500 text-white hover:scale-[1.02] shadow-xl shadow-amber-500/30 px-5 py-3 flex-none"
                                    style={{ border: 'none' }}
                                    onClick={() => router.push('/challenges/new')}
                                >
                                    <Plus size={16} /> Criar Desafio
                                </button>
                                <p className="text-slate-400 text-xs font-bold font-roboto">
                                    {displayedChallenges.length} desafio(s)
                                </p>
                            </div>

                            <div className="flex gap-2 flex-wrap">
                                <select
                                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 shadow-sm outline-none min-w-0 flex-1 sm:flex-none"
                                    value={filterParticipation}
                                    onChange={e => setFilterParticipation(e.target.value as typeof filterParticipation)}
                                >
                                    <option value="Meus">Meus Desafios</option>
                                    <option value="Explorar">Explorar Públicos</option>
                                    <option value="Todos">Todos</option>
                                </select>
                                <select
                                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 shadow-sm outline-none min-w-0 flex-1 sm:flex-none"
                                    value={filterStatus}
                                    onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
                                >
                                    <option value="Todos">Todos (Status)</option>
                                    <option value="ativos">Ativos / Futuros</option>
                                    <option value="inativos">Encerrados</option>
                                </select>
                            </div>
                        </div>

                        {/* Challenge cards list */}
                        {displayedChallenges.length === 0 ? (
                            <div className="bg-white rounded-xl card-depth p-10 text-center flex flex-col items-center justify-center border border-slate-100">
                                <Trophy size={48} className="text-slate-300 mb-4" />
                                <p className="text-slate-500 font-bold font-roboto">Nenhum desafio encontrado.</p>
                                <button
                                    className="btn bg-amber-500 text-white hover:scale-[1.02] shadow-xl shadow-amber-500/30 px-6 py-4 mt-6 border-none"
                                    onClick={() => router.push('/challenges/new')}
                                >
                                    Criar meu primeiro desafio
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 mb-6">
                                {displayedChallenges.map((c) => {
                                    const cStatusLabel = challengeStatus(c);
                                    const st = STATUS_LABEL[cStatusLabel];
                                    const participantCount = store.challengeParticipants.filter(p => p.challenge_id === c.id).length;

                                    const myParticipant = store.challengeParticipants.find(p => p.challenge_id === c.id && p.user_id === userId);
                                    const role = myParticipant?.role || (c.created_by === userId ? 'owner' : null);

                                    const ownerParticipant = store.challengeParticipants.find(p => p.challenge_id === c.id && p.role === 'owner');
                                    const creatorId = ownerParticipant?.user_id ?? c.created_by;
                                    const creator = creatorId ? store.profiles.find(u => u.id === creatorId) : null;
                                    const creatorLabel = creatorId === userId ? 'Você' : (creator?.name?.split(' ')[0] ?? null);

                                    return (
                                        <div
                                            key={c.id}
                                            className="group bg-white card-depth rounded-xl border border-transparent hover:border-amber-500/20 hover:shadow-lg cursor-pointer active:scale-[0.99] transition-all duration-200"
                                            onClick={() => router.push(`/challenges/${c.id}`)}
                                        >
                                            {/* Card content */}
                                            <div className="p-4 sm:p-5">
                                                {/* Row 1: Icon + Title + Badges */}
                                                <div className="flex items-start gap-3">
                                                    <div className="size-10 sm:size-12 rounded-xl flex items-center justify-center bg-slate-100 text-2xl shrink-0 mt-0.5">
                                                        {c.emoji || '🏆'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="item-card-title text-[0.95rem] sm:text-base font-bold text-slate-900 leading-snug line-clamp-2">
                                                            {c.title}
                                                        </h3>

                                                        {/* Badges */}
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

                                                {/* Row 3: Visibility */}
                                                <div className="ml-[52px] sm:ml-[60px] mt-1.5">
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

                                            {/* Mobile: explicit "Abrir" link */}
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
                    </div>
                )}
            </main>

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

            {/* ─── User Profile Modal ─── */}
            {selectedUser && (
                <div
                    className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={(e) => e.target === e.currentTarget && setSelectedUser(null)}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-y-auto px-6 py-8 relative animate-in fade-in zoom-in-95 duration-200">
                        <button
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            onClick={() => setSelectedUser(null)}
                        >
                            <X size={20} />
                        </button>

                        {/* Avatar + Name */}
                        <div className="text-center mb-6 flex flex-col items-center">
                            <div className={`size-20 rounded-full overflow-hidden ${selectedUser.photo_url ? 'bg-transparent' : 'bg-primary/10 text-primary'} flex items-center justify-center font-extrabold text-3xl mb-4`}>
                                {selectedUser.photo_url
                                    ? <img src={selectedUser.photo_url} alt={selectedUser.name} className="w-full h-full object-cover" />
                                    : selectedUser.name.charAt(0).toUpperCase()
                                }
                            </div>
                            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{selectedUser.name}</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {selectedUser.role === 'personal' ? 'Personal Trainer' : 'Membro VIMU'}
                            </p>
                            {(selectedUser.city || selectedUser.state) && (
                                <span className="mt-2 text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-bold uppercase tracking-wide">
                                    📍 {[selectedUser.city, selectedUser.state].filter(Boolean).join(', ')}
                                </span>
                            )}
                        </div>

                        {/* Recent Activity */}
                        <div className="w-full flex items-center gap-2 border-t border-slate-100 pt-5 mb-4">
                            <Activity size={16} className="text-primary" />
                            <span className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">Atividade Recente (15 Dias)</span>
                        </div>

                        {getUserRecentActivity(selectedUser.id).length === 0 ? (
                            <div className="text-center p-6 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-slate-500 font-bold text-sm">Nenhuma atividade nos últimos 15 dias.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col max-h-[400px] overflow-y-auto pr-1 no-scrollbar">
                                {getUserRecentActivity(selectedUser.id).map(renderModalActivity)}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

export default function CommunityPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium font-roboto text-sm">Carregando...</p>
                </div>
            </div>
        }>
            <CommunityContent />
        </Suspense>
    );
}
