'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Toast from '@/components/Toast';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { Users, UserPlus, UserCheck, Search, Activity, Dumbbell } from 'lucide-react';
import type { Profile, FeedEvent, WorkoutLog } from '@/lib/types';
import Modal from '@/components/Modal';

export default function CommunityPage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, loading, updateProfile } = useStore();

    const [searchName, setSearchName] = useState('');
    const [searchCity, setSearchCity] = useState('');
    const [searchState, setSearchState] = useState('');
    const [filterRole, setFilterRole] = useState<'all' | 'personal' | 'user'>('all');

    const [saving, setSaving] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

    useEffect(() => {
        if (ready && !userId) router.replace('/');
    }, [ready, userId, router]);

    if (!ready || !userId || loading) return null;

    const me = store.profiles.find(u => u.id === userId);
    if (!me) return null;

    // Filter out myself and apply search filters
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
            const updatedProfile = { ...me, friendIds: newFriendIds };
            await updateProfile(updatedProfile as import('@/lib/types').Profile);

            setSaving(null);
            setToast({
                msg: isFollowing ? 'Você deixou de seguir este usuário.' : 'Agora você segue este usuário!',
                type: 'success'
            });
        } catch (err: unknown) {
            console.error(err);
            setSaving(null);
            setToast({ msg: 'Erro ao seguir: ' + ((err as Error).message || 'Falha na comunicação com o banco'), type: 'error' });
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

                {(() => {
                    const renderItems: { id: string; exId: string; plannedSets: number; log?: any; isExtra?: boolean }[] = [];
                    const availableLogs = [...dayLogs];

                    workout.exercises.forEach((planned, idx) => {
                        const logIdx = availableLogs.findIndex(l => l.exerciseId === planned.exerciseId);
                        let log = undefined;
                        if (logIdx !== -1) {
                            log = availableLogs[logIdx];
                            availableLogs.splice(logIdx, 1);
                        }
                        renderItems.push({
                            id: `planned-${idx}-${planned.exerciseId}`,
                            exId: planned.exerciseId,
                            plannedSets: planned.sets.length,
                            log
                        });
                    });

                    availableLogs.forEach((log, idx) => {
                        renderItems.push({
                            id: `extra-${idx}-${log.id}`,
                            exId: log.exerciseId,
                            plannedSets: 0,
                            log,
                            isExtra: true
                        });
                    });

                    if (renderItems.length === 0) return null;

                    return (
                        <div className="mt-3 border-t border-slate-200 pt-3">
                            <div className="flex flex-col gap-2">
                                {renderItems.map((item) => {
                                    const log = item.log;
                                    const exId = item.exId;
                                    const exName = store.exercises.find(e => e.id === exId)?.name || 'Exercício';
                                    const plannedSets = item.plannedSets;
                                    const completedSets = log ? log.sets.length : 0;
                                    const skippedSets = Math.max(0, plannedSets - completedSets);

                                    let setsDisplay = '';
                                    if (log && log.sets.length > 0) {
                                        const groups: { count: number, weight: number }[] = [];
                                        for (const s of log.sets) {
                                            if (groups.length > 0 && groups[groups.length - 1].weight === s.weight) {
                                                groups[groups.length - 1].count++;
                                            } else {
                                                groups.push({ count: 1, weight: s.weight });
                                            }
                                        }
                                        setsDisplay = groups.map(g => `${g.count}x ${g.weight}kg`).join(' / ');
                                    } else {
                                        setsDisplay = '-';
                                    }

                                    return (
                                        <div key={item.id} className="flex justify-between items-center text-xs py-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`font-bold ${!log ? 'text-slate-300 line-through' : 'text-slate-500'}`}>{exName}</span>
                                                {log && skippedSets > 0 && (
                                                    <span className="text-[10px] bg-red-100 text-red-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                                                        faltou {skippedSets} {skippedSets === 1 ? 'série' : 'séries'}
                                                    </span>
                                                )}
                                                {!log && (
                                                    <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                                                        não feito
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
                    );
                })()}
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

                <div className="mb-8 flex flex-col gap-3">
                    <div className="flex items-center gap-3 bg-white card-depth border border-slate-100 rounded-xl px-4 py-3">
                        <Search size={20} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar pelo nome..."
                            value={searchName}
                            onChange={(e) => setSearchName(e.target.value)}
                            className="border-none bg-transparent outline-none w-full text-slate-900 placeholder:text-slate-400 font-medium"
                        />
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 flex gap-3">
                            <select
                                value={searchState}
                                onChange={(e) => setSearchState(e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 outline-none w-[100px] sm:w-[120px]"
                            >
                                <option value="">UF</option>
                                <option value="AC">AC</option>
                                <option value="AL">AL</option>
                                <option value="AP">AP</option>
                                <option value="AM">AM</option>
                                <option value="BA">BA</option>
                                <option value="CE">CE</option>
                                <option value="DF">DF</option>
                                <option value="ES">ES</option>
                                <option value="GO">GO</option>
                                <option value="MA">MA</option>
                                <option value="MT">MT</option>
                                <option value="MS">MS</option>
                                <option value="MG">MG</option>
                                <option value="PA">PA</option>
                                <option value="PB">PB</option>
                                <option value="PR">PR</option>
                                <option value="PE">PE</option>
                                <option value="PI">PI</option>
                                <option value="RJ">RJ</option>
                                <option value="RN">RN</option>
                                <option value="RS">RS</option>
                                <option value="RO">RO</option>
                                <option value="RR">RR</option>
                                <option value="SC">SC</option>
                                <option value="SP">SP</option>
                                <option value="SE">SE</option>
                                <option value="TO">TO</option>
                            </select>

                            <input
                                type="text"
                                placeholder="Cidade..."
                                value={searchCity}
                                onChange={(e) => setSearchCity(e.target.value)}
                                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-roboto text-slate-900 placeholder:text-slate-400 outline-none"
                            />
                        </div>

                        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 font-roboto self-start md:self-auto w-full md:w-auto">
                            <button
                                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterRole === 'all' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                onClick={() => setFilterRole('all')}
                            >
                                Todos
                            </button>
                            <button
                                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterRole === 'personal' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                onClick={() => setFilterRole('personal')}
                            >
                                Personais
                            </button>
                            <button
                                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterRole === 'user' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                onClick={() => setFilterRole('user')}
                            >
                                Alunos
                            </button>
                        </div>
                    </div>
                </div>

                {otherUsers.length === 0 ? (
                    <div className="bg-white rounded-xl card-depth p-10 text-center flex flex-col items-center">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300 mb-2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="18" y1="8" x2="23" y2="13" /><line x1="23" y1="8" x2="18" y2="13" /></svg>
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
                                        <div className={`size-12 rounded-full ${u.photo_url ? 'bg-transparent' : 'bg-slate-100 group-hover:bg-primary/10 transition-colors'} overflow-hidden flex items-center justify-center font-extrabold text-primary shrink-0 text-lg`}>
                                            {u.photo_url ? (
                                                <img src={u.photo_url} alt={u.name} className="w-full h-full object-cover" />
                                            ) : (
                                                u.name.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-extrabold font-inter text-slate-900 group-hover:text-primary transition-colors flex items-center gap-2 flex-wrap">
                                                {u.name}
                                                {u.city && u.state && (
                                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                                                        📍 {u.city}, {u.state}
                                                    </span>
                                                )}
                                                {u.role === 'personal' && u.cref && (
                                                    <span className="text-[10px] bg-sky-100 text-sky-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide border border-sky-200">
                                                        CREF: {u.cref}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs font-bold font-roboto text-slate-400 uppercase tracking-wide mt-0.5">
                                                {u.role === 'personal' ? 'Personal Trainer' : 'Membro uFit'}
                                            </div>
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
                            <div className={`size-20 rounded-full overflow-hidden ${selectedUser.photo_url ? 'bg-transparent' : 'bg-primary/10 text-primary'} flex items-center justify-center font-extrabold text-3xl mb-4`}>
                                {selectedUser.photo_url ? (
                                    <img src={selectedUser.photo_url} alt={selectedUser.name} className="w-full h-full object-cover" />
                                ) : (
                                    selectedUser.name.charAt(0).toUpperCase()
                                )}
                            </div>
                            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{selectedUser.name}</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {selectedUser.role === 'personal' ? 'Personal Trainer' : 'Membro uFit'}
                            </p>
                            <div className="flex gap-2 mt-3 flex-wrap justify-center">
                                {selectedUser.city && selectedUser.state && (
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-bold uppercase tracking-wide">
                                        📍 {selectedUser.city}, {selectedUser.state}
                                    </span>
                                )}
                                {selectedUser.role === 'personal' && selectedUser.cref && (
                                    <span className="text-[10px] bg-sky-100 text-sky-600 px-2 py-1 rounded-md font-bold uppercase tracking-wide border border-sky-200">
                                        📋 CREF: {selectedUser.cref}
                                    </span>
                                )}
                            </div>
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
