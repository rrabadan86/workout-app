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
            <div key={event.id} style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="stat-icon stat-icon-green" style={{ width: 28, height: 28 }}><Dumbbell size={14} /></div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{workout.name}</div>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formattedDate}</span>
                </div>

                {dayLogs.length > 0 && (
                    <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {dayLogs.map((log) => {
                                const exName = store.exercises.find(e => e.id === log.exerciseId)?.name || 'Exercício';

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
                                    <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '2px 0' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{exName}</span>
                                        <span style={{ color: 'var(--accent-light)', fontWeight: 500, textAlign: 'right', paddingLeft: 12 }}>
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
            <div className="container">
                <div className="page-header" style={{ paddingTop: 40, alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Comunidade</h1>
                        <p className="page-subtitle">Encontre amigos para acompanhar</p>
                    </div>
                    <div className="stat-icon stat-icon-pink" style={{ width: 48, height: 48, borderRadius: '50%' }}>
                        <Users size={24} />
                    </div>
                </div>

                <div className="field" style={{ marginBottom: 32 }}>
                    <div className="input" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px' }}>
                        <Search size={18} color="var(--text-muted)" />
                        <input
                            type="text"
                            placeholder="Buscar pelo nome..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                border: 'none', background: 'transparent', color: 'inherit',
                                outline: 'none', width: '100%', padding: '12px 0'
                            }}
                        />
                    </div>
                </div>

                {otherUsers.length === 0 ? (
                    <div className="card" style={{ padding: '40px 20px', textAlign: 'center' }}>
                        <Users size={32} color="var(--text-muted)" style={{ marginBottom: 16 }} />
                        <p style={{ color: 'var(--text-secondary)' }}>Nenhum usuário encontrado.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {otherUsers.map((u) => {
                            const isFollowing = myFriendIds.includes(u.id);
                            const isLoading = saving === u.id;

                            return (
                                <div key={u.id} className="card animate-fade"
                                    onClick={() => setSelectedUser(u)}
                                    style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'border-color 0.2s', border: '1px solid transparent' }}
                                    onMouseEnter={(e) => e.currentTarget.style.border = '1px solid var(--accent)'}
                                    onMouseLeave={(e) => e.currentTarget.style.border = '1px solid transparent'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <div style={{
                                            width: 44, height: 44, borderRadius: '50%',
                                            background: 'var(--primary)', color: '#fff',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 800, fontSize: '1.1rem'
                                        }}>
                                            {u.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{u.name}</div>
                                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Membro FitSync</div>
                                        </div>
                                    </div>

                                    <button
                                        className={`btn ${isFollowing ? 'btn-ghost' : 'btn-primary'}`}
                                        onClick={(e) => { e.stopPropagation(); toggleFollow(u.id); }}
                                        disabled={isLoading}
                                        style={{ width: 140, display: 'flex', justifyContent: 'center' }}
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
            </div>

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

            {/* User Profile Modal */}
            {selectedUser && (
                <Modal title="Perfil do Usuário" onClose={() => setSelectedUser(null)}
                    footer={<button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => setSelectedUser(null)}>Fechar</button>}
                >
                    <div style={{ textAlign: 'center', marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: '50%',
                            background: 'var(--primary)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: '1.8rem', marginBottom: 12
                        }}>
                            {selectedUser.name.charAt(0).toUpperCase()}
                        </div>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{selectedUser.name}</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Membro FitSync</p>
                    </div>

                    <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Activity size={16} color="var(--accent)" />
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>ATIVIDADE RECENTE (15 DIAS)</span>
                    </div>

                    {getUserRecentActivity(selectedUser.id).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 20px', background: 'var(--sidebar)', borderRadius: 'var(--radius)' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhuma atividade registrada nos últimos 15 dias.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 400, overflowY: 'auto', paddingRight: 4 }}>
                            {getUserRecentActivity(selectedUser.id).map(renderModalActivity)}
                        </div>
                    )}
                </Modal>
            )}
        </>
    );
}
