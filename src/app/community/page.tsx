'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Toast from '@/components/Toast';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { Users, UserPlus, UserCheck, Search } from 'lucide-react';

export default function CommunityPage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, updateUser } = useStore();

    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

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
                                <div key={u.id} className="card animate-fade" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                                        onClick={() => toggleFollow(u.id)}
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
        </>
    );
}
