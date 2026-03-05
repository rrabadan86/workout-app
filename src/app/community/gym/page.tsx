'use client';

import { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Crown, MapPin, Trophy, Dumbbell } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';

function GymDetailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const gymName = searchParams.get('name') || '';
    const { userId, ready } = useAuth();
    const { store, loading } = useStore();

    // Active (non-hidden, non-deleted) feed event IDs
    const activeFeedEventIds = useMemo(() => new Set(
        store.feedEvents
            .filter(e => e.eventType.startsWith('WO_COMPLETED') && !e.eventType.startsWith('WO_COMPLETED_HIDDEN'))
            .map(e => e.id)
    ), [store.feedEvents]);

    // Valid check-ins for this gym
    const validCheckins = useMemo(() =>
        store.gymCheckins.filter(c =>
            c.place_name === gymName &&
            c.feed_event_id &&
            activeFeedEventIds.has(c.feed_event_id)
        ),
        [store.gymCheckins, gymName, activeFeedEventIds]);

    // Users who belong to this gym (have at least 1 valid checkin)
    const gymUserIds = useMemo(() => {
        const ids = new Set<string>();
        validCheckins.forEach(c => ids.add(c.user_id));
        return ids;
    }, [validCheckins]);

    // ─── Check-in Ranking ───
    const checkinRanking = useMemo(() => {
        const counts: Record<string, { count: number; lastDate: string }> = {};
        validCheckins.forEach(c => {
            if (!counts[c.user_id]) counts[c.user_id] = { count: 0, lastDate: '' };
            counts[c.user_id].count++;
            if (c.checked_in_at > counts[c.user_id].lastDate) {
                counts[c.user_id].lastDate = c.checked_in_at;
            }
        });
        return Object.entries(counts)
            .map(([uid, data]) => ({
                userId: uid,
                profile: store.profiles.find(p => p.id === uid),
                count: data.count,
                lastDate: data.lastDate,
            }))
            .sort((a, b) => b.count !== a.count ? b.count - a.count : b.lastDate.localeCompare(a.lastDate))
            .slice(0, 10);
    }, [validCheckins, store.profiles]);

    // ─── Exercise Ranking ───
    // Get all public workout logs from gym users
    const exerciseRankings = useMemo(() => {
        // Build a faster lookup for active workout execution dates per user & workout
        // Map keys: `${userId}_${workoutId}_${dateString}` -> true
        const activeExecutionKeys = new Set<string>();
        store.feedEvents.forEach(e => {
            if (activeFeedEventIds.has(e.id) && e.createdAt) {
                const dateStr = e.createdAt.split('T')[0];
                activeExecutionKeys.add(`${e.userId}_${e.referenceId}_${dateStr}`);
            }
        });

        // For each gym user, find their max weight per exercise (only from active workouts)
        const exerciseData: Record<string, { userId: string; maxWeight: number; date: string }[]> = {};

        for (const uid of gymUserIds) {
            const userLogs = store.logs.filter(l =>
                l.userId === uid &&
                activeExecutionKeys.has(`${uid}_${l.workoutId}_${l.date}`)
            );

            // Group by exercise, find max weight
            const exerciseMax: Record<string, { weight: number; date: string }> = {};
            for (const log of userLogs) {
                for (const set of log.sets) {
                    if (!exerciseMax[log.exerciseId] || set.weight > exerciseMax[log.exerciseId].weight) {
                        exerciseMax[log.exerciseId] = { weight: set.weight, date: log.date };
                    }
                }
            }

            for (const [exId, data] of Object.entries(exerciseMax)) {
                if (!exerciseData[exId]) exerciseData[exId] = [];
                exerciseData[exId].push({ userId: uid, maxWeight: data.weight, date: data.date });
            }
        }

        // Only show exercises where at least 1 user has data, sort entries
        const rankings: { exerciseId: string; exerciseName: string; entries: { userId: string; profile: typeof store.profiles[0] | undefined; maxWeight: number; date: string }[] }[] = [];

        for (const [exId, entries] of Object.entries(exerciseData)) {
            if (entries.length === 0) continue;
            const exercise = store.exercises.find(e => e.id === exId);
            const sorted = entries
                .sort((a, b) => b.maxWeight !== a.maxWeight ? b.maxWeight - a.maxWeight : b.date.localeCompare(a.date))
                .slice(0, 10)
                .map(e => ({ ...e, profile: store.profiles.find(p => p.id === e.userId) }));

            rankings.push({
                exerciseId: exId,
                exerciseName: exercise?.name || 'Exercicio',
                entries: sorted,
            });
        }

        // Sort exercises by most participants, then name
        rankings.sort((a, b) => b.entries.length !== a.entries.length ? b.entries.length - a.entries.length : a.exerciseName.localeCompare(b.exerciseName));
        return rankings;
    }, [gymUserIds, store.logs, store.exercises, store.profiles, activeFeedEventIds, store.feedEvents]);

    const myCheckinPosition = checkinRanking.findIndex(e => e.userId === userId) + 1;

    if (!ready || !userId || loading) return null;

    if (!gymName) {
        return (
            <>
                <Navbar />
                <div className="container" style={{ paddingTop: 40 }}>
                    <div className="empty-state"><p>Academia nao encontrada.</p></div>
                </div>
            </>
        );
    }

    const formatDateBR = (d: string) => {
        if (!d) return '--';
        try {
            const [y, m, day] = d.split('T')[0].split('-');
            const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            return `${day} ${months[parseInt(m, 10) - 1]}`;
        } catch { return d; }
    };

    return (
        <>
            <Navbar />
            <main className="flex-1 w-full max-w-[900px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8">

                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors mb-4"
                    >
                        <ArrowLeft size={16} /> Voltar
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="size-14 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                            <MapPin size={28} className="text-amber-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-extrabold font-inter tracking-tight text-slate-900">{gymName}</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs font-bold text-slate-400">
                                    {gymUserIds.size} usuario{gymUserIds.size !== 1 ? 's' : ''}
                                </span>
                                {myCheckinPosition > 0 && (
                                    <>
                                        <span className="text-slate-300">·</span>
                                        <span className={`text-xs font-bold ${myCheckinPosition === 1 ? 'text-amber-500' : 'text-primary'}`}>
                                            Voce: #{myCheckinPosition} no ranking
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Check-in Ranking ─── */}
                <section className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Trophy size={18} className="text-amber-500" />
                        <h2 className="text-lg font-extrabold font-inter text-slate-900">Ranking de Check-ins</h2>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {checkinRanking.map((entry, idx) => {
                            const position = idx + 1;
                            const isLeader = position === 1;
                            const isMe = entry.userId === userId;

                            return (
                                <div
                                    key={entry.userId}
                                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isLeader ? 'bg-amber-50 border border-amber-200/60' :
                                        isMe ? 'bg-primary/5 border border-primary/10' :
                                            'bg-white border border-slate-100'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-sm shrink-0 ${isLeader ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' :
                                        position <= 3 ? 'bg-slate-200 text-slate-700' :
                                            'bg-slate-100 text-slate-500'
                                        }`}>
                                        {isLeader ? <Crown size={16} /> : position}
                                    </div>
                                    <div className={`size-9 rounded-full overflow-hidden flex items-center justify-center font-bold text-xs shrink-0 ${entry.profile?.photo_url ? '' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {entry.profile?.photo_url
                                            ? <img src={entry.profile.photo_url} alt="" className="w-full h-full object-cover" />
                                            : entry.profile?.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold truncate ${isLeader ? 'text-amber-800' : 'text-slate-900'}`}>
                                            {isMe ? 'Voce' : entry.profile?.name?.split(' ')[0] || 'Usuario'}
                                        </p>
                                        {isLeader && <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Lider da Academia</span>}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className={`text-lg font-extrabold ${isLeader ? 'text-amber-600' : 'text-slate-900'}`}>{entry.count}</span>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase -mt-0.5">check-ins</p>
                                    </div>
                                </div>
                            );
                        })}
                        {checkinRanking.length === 0 && (
                            <div className="bg-white rounded-xl border border-slate-100 p-6 text-center">
                                <p className="text-slate-400 text-sm font-bold">Nenhum check-in valido nesta academia.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* ─── Exercise Rankings (Competition) ─── */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Dumbbell size={18} className="text-primary" />
                        <h2 className="text-lg font-extrabold font-inter text-slate-900">Competicao por Exercicio</h2>
                        <span className="text-[10px] font-bold text-slate-400 ml-auto">{exerciseRankings.length} exercicio(s)</span>
                    </div>

                    {exerciseRankings.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
                            <Dumbbell size={40} className="text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-500 font-bold text-sm">Nenhum exercicio registrado pelos usuarios desta academia.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {exerciseRankings.map(ex => {
                                const leader = ex.entries[0];
                                const myEntry = ex.entries.find(e => e.userId === userId);
                                const myPos = ex.entries.findIndex(e => e.userId === userId) + 1;

                                return (
                                    <details key={ex.exerciseId} className="bg-white rounded-2xl card-depth overflow-hidden border border-slate-100 group">
                                        <summary className="p-4 sm:p-5 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-extrabold text-slate-900 truncate">{ex.exerciseName}</h3>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-bold text-slate-400">
                                                        {ex.entries.length} competidor{ex.entries.length !== 1 ? 'es' : ''}
                                                    </span>
                                                    {myPos > 0 && (
                                                        <>
                                                            <span className="text-slate-300">·</span>
                                                            <span className={`text-[10px] font-bold ${myPos === 1 ? 'text-amber-500' : 'text-primary'}`}>
                                                                Voce: #{myPos} ({myEntry?.maxWeight}kg)
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Leader preview */}
                                            {leader && (
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <div className="text-right mr-1">
                                                        <span className="text-sm font-extrabold text-amber-600">{leader.maxWeight}kg</span>
                                                    </div>
                                                    <div className="relative">
                                                        <div className={`size-8 rounded-full overflow-hidden ${leader.profile?.photo_url ? '' : 'bg-amber-100 text-amber-600'} flex items-center justify-center font-bold text-xs`}>
                                                            {leader.profile?.photo_url
                                                                ? <img src={leader.profile.photo_url} alt="" className="w-full h-full object-cover" />
                                                                : leader.profile?.name?.charAt(0).toUpperCase() || '?'}
                                                        </div>
                                                        <Crown size={12} className="absolute -top-1.5 -right-1.5 text-amber-500 drop-shadow" />
                                                    </div>
                                                </div>
                                            )}
                                        </summary>

                                        {/* Expanded ranking */}
                                        <div className="border-t border-slate-100 px-4 sm:px-5 py-4 bg-slate-50/50">
                                            <div className="flex flex-col gap-1.5">
                                                {ex.entries.map((entry, idx) => {
                                                    const position = idx + 1;
                                                    const isLeader = position === 1;
                                                    const isMe = entry.userId === userId;

                                                    return (
                                                        <div
                                                            key={entry.userId}
                                                            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${isLeader ? 'bg-amber-50 border border-amber-200/60' :
                                                                isMe ? 'bg-primary/5 border border-primary/10' :
                                                                    'bg-white border border-slate-100'
                                                                }`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-sm shrink-0 ${isLeader ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' :
                                                                position <= 3 ? 'bg-slate-200 text-slate-700' :
                                                                    'bg-slate-100 text-slate-500'
                                                                }`}>
                                                                {isLeader ? <Crown size={16} /> : position}
                                                            </div>

                                                            <div className={`size-9 rounded-full overflow-hidden flex items-center justify-center font-bold text-xs shrink-0 ${entry.profile?.photo_url ? '' : 'bg-slate-100 text-slate-600'
                                                                }`}>
                                                                {entry.profile?.photo_url
                                                                    ? <img src={entry.profile.photo_url} alt="" className="w-full h-full object-cover" />
                                                                    : entry.profile?.name?.charAt(0).toUpperCase() || '?'}
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-bold truncate ${isLeader ? 'text-amber-800' : 'text-slate-900'}`}>
                                                                    {isMe ? 'Voce' : entry.profile?.name?.split(' ')[0] || 'Usuario'}
                                                                </p>
                                                                <p className="text-[10px] font-bold text-slate-400">
                                                                    {formatDateBR(entry.date)}
                                                                </p>
                                                            </div>

                                                            <div className="text-right shrink-0">
                                                                <span className={`text-lg font-extrabold ${isLeader ? 'text-amber-600' : 'text-slate-900'}`}>
                                                                    {entry.maxWeight}
                                                                </span>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase -mt-0.5">kg</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </details>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>
        </>
    );
}

export default function GymDetailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium font-roboto text-sm">Carregando...</p>
                </div>
            </div>
        }>
            <GymDetailContent />
        </Suspense>
    );
}
