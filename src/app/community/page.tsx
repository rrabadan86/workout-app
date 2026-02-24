'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Toast from '@/components/Toast';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { Users, UserPlus, UserCheck, Search, Activity, Dumbbell } from 'lucide-react';
import type { User, FeedEvent, WorkoutLog } from '@/lib/types';
import Modal from '@/components/Modal';

export default function CommunityPage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, updateUser } = useStore();

    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    useEffect(() => {
        if (ready && !userId) router.replace('/');
    }, [ready, userId, router]);

    if (!ready || !userId) return null;

    const me = store.users.find(u => u.id === userId);
    if (!me) return null;

    // Filter out myself and search by name
    const otherUsers = store.users.filter(u =>
        u.id !== userId &&
        u.name.toLowerCase().includes(search.toLowerCase())
    );

    const myFriendIds = me.friendIds || [];

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
            const updatedUser = { ...me, friendIds: newFriendIds };
            await updateUser(updatedUser as import('@/lib/types').User);

            setSaving(null);
            setToast({
                msg: isFollowing ? 'Você deixou de seguir este usuário.' : 'Agora você segue este usuário!',
                type: 'success'
            });
        } catch (err: any) {
            console.error(err);
            setSaving(null);
            setToast({ msg: 'Erro ao seguir: ' + (err.message || 'Falha na comunicação com o banco'), type: 'error' });
        }
    }

    function getUserRecentActivity(uid: string) {
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

        return store.feedEvents
            .filter(e => e.userId === uid && e.eventType === 'WO_COMPLETED' && new Date(e.createdAt) >= fifteenDaysAgo)
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
                    <div className="flex items-center gap-2">
                        <div className="stat-icon stat-icon-green !size-8 rounded-lg"><Dumbbell size={14} /></div>
                        <div className="font-bold text-sm text-slate-900">{workout.name}</div>
                    </div>
                    <span className="text-xs font-bold text-slate-400">{formattedDate}</span>
                </div>

                {dayLogs.length > 0 && (
                    <div className="mt-3 border-t border-slate-200 pt-3">
                        <div className="flex flex-col gap-2">
                            {dayLogs.map((log) => {
                                const exName = store.exercises.find(e => e.id === log.exerciseId)?.name || 'Exercício';
                                const plannedExercise = workout.exercises.find(ex => ex.exerciseId === log.exerciseId);
                                const plannedSets = plannedExercise ? plannedExercise.sets.length : log.sets.length;
                                const skippedSets = Math.max(0, plannedSets - log.sets.length);

                                const groups: { count: number, weight: number }[] = [];
                                for (const s of log.sets) {
                                    if (groups.length > 0 && groups[groups.length - 1].weight === s.weight) {
                                        groups[groups.length - 1].count++;
                                    } else {
                                        groups.push({ count: 1, weight: s.weight });
                                    }
                                }
                                const setsDisplay = groups.map(g => `${g.count}x ${g.weight}kg`).join(' / ');

                                return (
                                    <div key={log.id} className="flex justify-between items-center text-xs py-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-slate-500">{exName}</span>
                                            {skippedSets > 0 && (
                                                <span className="text-[10px] bg-red-100 text-red-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                                                    faltou {skippedSets}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-primary font-bold text-right pl-3">
                                            {setsDisplay}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <Navbar />

            <main className="flex-1 w-full max-w-[1000px] mx-auto px-6 lg:px-12 py-8">
                <div className="mb-2 pt-8">
                    <button className="text-sm font-bold text-slate-400 hover:text-primary transition-colors flex items-center gap-1" onClick={() => router.push('/dashboard')}>
                        ← Voltar ao Dashboard
                    </button>
                </div>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-extrabold font-inter tracking-tight text-slate-900">Comunidade</h1>
                        <p className="text-sm font-bold font-montserrat text-slate-400 uppercase tracking-widest mt-2">Encontre amigos para acompanhar</p>
                    </div>
                    <div className="size-16 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center">
                        <Users size={28} />
                    </div>
                </div>

                <div className="mb-8">
                    <div className="flex items-center gap-3 bg-white card-depth border border-slate-100 rounded-xl px-4 py-3">
                        <Search size={20} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar pelo nome..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="border-none bg-transparent outline-none w-full text-slate-900 placeholder:text-slate-400 font-medium"
                        />
                    </div>
                </div>

                {otherUsers.length === 0 ? (
                    <div className="bg-white rounded-xl card-depth p-10 text-center flex flex-col items-center">
                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">group_off</span>
                        <p className="text-slate-500 font-bold mb-1">Nenhum usuário encontrado.</p>
                        <p className="text-xs text-slate-400">Tente buscar por outro nome.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {otherUsers.map((u) => {
                            const isFollowing = myFriendIds.includes(u.id);
                            const isLoading = saving === u.id;

                            return (
                                <div key={u.id} className="bg-white rounded-xl card-depth p-4 flex items-center justify-between cursor-pointer border border-transparent hover:border-primary/20 transition-all group"
                                    onClick={() => setSelectedUser(u)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center font-extrabold text-primary shrink-0 text-lg group-hover:bg-primary/10 transition-colors">
                                            {u.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-extrabold font-inter text-slate-900 group-hover:text-primary transition-colors">{u.name}</div>
                                            <div className="text-xs font-bold font-roboto text-slate-400 uppercase tracking-wide mt-0.5">Membro FitSync</div>
                                        </div>
                                    </div>

                                    <button
                                        className={`btn font-montserrat ${isFollowing ? 'btn-ghost' : 'bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02]'} !px-6 !py-3 w-40`}
                                        onClick={(e) => { e.stopPropagation(); toggleFollow(u.id); }}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Aguarde...' : isFollowing ? (
                                            <><UserCheck size={16} /> Seguindo</>
                                        ) : (
                                            <><UserPlus size={16} /> Seguir</>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

            {/* User Profile Modal */}
            {selectedUser && (
                <div className="modal-overlay">
                    <div className="modal animate-slide">
                        <div className="text-center mb-8 flex flex-col items-center">
                            <div className="size-20 rounded-full bg-primary/10 text-primary flex items-center justify-center font-extrabold text-3xl mb-4">
                                {selectedUser.name.charAt(0).toUpperCase()}
                            </div>
                            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{selectedUser.name}</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Membro FitSync</p>
                        </div>

                        <div className="mb-4 flex items-center gap-2">
                            <Activity size={18} className="text-primary" />
                            <span className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">Atividade Recente (15 Dias)</span>
                        </div>

                        {getUserRecentActivity(selectedUser.id).length === 0 ? (
                            <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-slate-500 font-bold text-sm">Nenhuma atividade registrada nos últimos 15 dias.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                                {getUserRecentActivity(selectedUser.id).map(renderModalActivity)}
                            </div>
                        )}

                        <div className="modal-footer mt-8 border-t border-slate-100 pt-6">
                            <button className="btn btn-ghost w-full justify-center" onClick={() => setSelectedUser(null)}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
