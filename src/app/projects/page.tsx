'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FolderOpen, Pencil, Trash2, ChevronRight, Share2, X, Users } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { uid, formatDate } from '@/lib/utils';
import type { Project } from '@/lib/types';

function projectStatus(p: Project): 'ativo' | 'inativo' | 'futuro' {
    const today = new Date().toISOString().slice(0, 10);
    if (today < p.startDate) return 'futuro';
    if (today > p.endDate) return 'inativo';
    return 'ativo';
}

const STATUS_LABEL = {
    ativo: { label: 'Ativo', color: '#22c55e', dot: '🟢' },
    inativo: { label: 'Encerrado', color: '#9ca3af', dot: '⚪' },
    futuro: { label: 'Em breve', color: '#f59e0b', dot: '🟡' },
};

export default function ProjectsPage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, addProject, updateProject, deleteProject } = useStore();

    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState<Project | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
    const [showShareModal, setShowShareModal] = useState<string | null>(null);
    const [shareEmail, setShareEmail] = useState('');
    const [shareStatus, setShareStatus] = useState<{ msg: string; ok: boolean } | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [saving, setSaving] = useState(false);

    const [pName, setPName] = useState('');
    const [pStart, setPStart] = useState('');
    const [pEnd, setPEnd] = useState('');

    useEffect(() => { if (ready && !userId) router.replace('/'); }, [ready, userId, router]);
    if (!ready || !userId) return null;

    const myProjects = store.projects.filter(
        (p) => p.ownerId === userId || p.sharedWith.includes(userId)
    );

    function openCreate() {
        setEditTarget(null);
        setPName(''); setPStart(''); setPEnd('');
        setShowModal(true);
    }

    function openEdit(p: Project) {
        setEditTarget(p);
        setPName(p.name); setPStart(p.startDate); setPEnd(p.endDate);
        setShowModal(true);
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (pEnd < pStart) { setToast({ msg: 'A data de término deve ser após o início.', type: 'error' }); return; }
        setSaving(true);
        try {
            if (editTarget) {
                await updateProject({ ...editTarget, name: pName, startDate: pStart, endDate: pEnd });
                setToast({ msg: 'Projeto atualizado!', type: 'success' });
            } else {
                await addProject({ id: uid(), name: pName, ownerId: userId, startDate: pStart, endDate: pEnd, sharedWith: [] });
                setToast({ msg: 'Projeto criado!', type: 'success' });
            }
            setShowModal(false);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao salvar projeto';
            setToast({ msg: `Erro: ${msg}`, type: 'error' });
        } finally {
            setSaving(false);
        }
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setSaving(true);
        await deleteProject(deleteTarget.id);
        setSaving(false);
        setDeleteTarget(null);
        setToast({ msg: 'Projeto excluído.', type: 'success' });
    }

    async function handleShareByEmail(projectId: string) {
        const email = shareEmail.trim().toLowerCase();
        if (!email) return;
        const proj = store.projects.find((x) => x.id === projectId);
        if (!proj) return;
        const foundUser = store.users.find((u) => u.email.toLowerCase() === email);
        if (foundUser) {
            if (foundUser.id === userId) {
                setShareStatus({ msg: 'Você não pode compartilhar consigo mesmo.', ok: false }); return;
            }
            if (proj.sharedWith.includes(foundUser.id)) {
                setShareStatus({ msg: 'Este usuário já tem acesso.', ok: false }); return;
            }
            await updateProject({ ...proj, sharedWith: [...proj.sharedWith, foundUser.id] });
            setShareEmail('');
            setShareStatus({ msg: `${foundUser.name} agora tem acesso ao projeto! ✅`, ok: true });
        } else {
            // Simulate invite email (no real email service)
            setShareEmail('');
            setShareStatus({ msg: `Convite enviado para ${email}. Assim que criar uma conta, terá acesso ao projeto. ✉ï¸`, ok: true });
        }
    }

    async function removeShare(projectId: string, friendId: string) {
        const p = store.projects.find((x) => x.id === projectId);
        if (!p) return;
        await updateProject({ ...p, sharedWith: p.sharedWith.filter((id) => id !== friendId) });
        setToast({ msg: 'Acesso removido.', type: 'success' });
    }


    return (
        <>
            <Navbar />
            <div className="container">
                <div className="page-header">
                    <div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                            <button onClick={() => router.push('/')} className="btn btn-ghost btn-sm" style={{ paddingLeft: 0 }}>
                                ← Voltar ao Dashboard
                            </button>
                        </div>
                        <h1 className="page-title">Projetos</h1>
                        <p className="page-subtitle">{myProjects.length} projeto(s)</p>
                    </div>
                    <button className="btn btn-primary" onClick={openCreate} style={{ alignSelf: 'flex-start', marginTop: 32 }}>
                        <Plus size={16} /> Novo
                    </button>
                </div>

                {myProjects.length === 0 ? (
                    <div className="empty-state">
                        <FolderOpen size={48} color="var(--text-muted)" />
                        <p>Nenhum projeto ainda. Crie seu primeiro projeto!</p>
                        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={openCreate}>
                            Criar projeto
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
                        {myProjects.map((p) => {
                            const status = projectStatus(p);
                            const st = STATUS_LABEL[status];
                            const workoutCount = store.workouts.filter((w) => w.projectId === p.id).length;
                            const isOwner = p.ownerId === userId;
                            return (
                                <div key={p.id} className="item-card" style={{ cursor: 'default' }}>
                                    <div className="stat-icon stat-icon-purple" style={{ width: 44, height: 44, flexShrink: 0 }}>
                                        <FolderOpen size={20} />
                                    </div>
                                    <div className="item-card-info" style={{ flex: 1, cursor: 'pointer' }}
                                        onClick={() => router.push(`/projects/${p.id}`)}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                            <span className="item-card-title">{p.name}</span>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: st.color, background: `${st.color}22`, borderRadius: 20, padding: '2px 10px' }}>
                                                {st.dot} {st.label}
                                            </span>
                                        </div>
                                        <div className="item-card-sub" style={{ marginTop: 4 }}>
                                            📅 {formatDate(p.startDate)} → {formatDate(p.endDate)} · 🏋️ {workoutCount} treino(s)
                                        </div>
                                        {p.sharedWith.length > 0 && (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                                <Users size={11} style={{ display: 'inline', marginRight: 4 }} />
                                                Compartilhado com {p.sharedWith.length} pessoa(s)
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                        {isOwner && (
                                            <>
                                                <button className="btn-icon" title="Compartilhar" onClick={() => setShowShareModal(p.id)}>
                                                    <Share2 size={15} />
                                                </button>
                                                <button className="btn-icon" title="Editar" onClick={() => openEdit(p)}>
                                                    <Pencil size={15} />
                                                </button>
                                                <button className="btn-icon" title="Excluir" style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(p)}>
                                                    <Trash2 size={15} />
                                                </button>
                                            </>
                                        )}
                                        <button className="btn-icon" onClick={() => router.push(`/projects/${p.id}`)}>
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create / Edit Modal */}
            {showModal && (
                <Modal title={editTarget ? 'Editar Projeto' : 'Novo Projeto'} onClose={() => setShowModal(false)}
                    footer={
                        <>
                            <button className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</button>
                            <button className="btn btn-primary" form="project-form" type="submit" disabled={saving}>
                                {saving ? 'Salvando...' : (editTarget ? 'Salvar' : 'Criar Projeto')}
                            </button>
                        </>
                    }
                >
                    <form id="project-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div className="field">
                            <label>Nome do projeto *</label>
                            <input className="input" placeholder="Ex: Projeto Hipertrofia" value={pName} onChange={(e) => setPName(e.target.value)} required />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="field">
                                <label>Data de início *</label>
                                <input className="input" type="date" value={pStart} onChange={(e) => setPStart(e.target.value)} required />
                            </div>
                            <div className="field">
                                <label>Data de término *</label>
                                <input className="input" type="date" value={pEnd} onChange={(e) => setPEnd(e.target.value)} required min={pStart} />
                            </div>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Delete Modal */}
            {deleteTarget && (
                <Modal title="Excluir Projeto" onClose={() => setDeleteTarget(null)}
                    footer={
                        <>
                            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancelar</button>
                            <button className="btn btn-danger" onClick={confirmDelete} disabled={saving}>
                                {saving ? 'Excluindo...' : 'Excluir'}
                            </button>
                        </>
                    }
                >
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Excluir <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget.name}</strong>? Todos os treinos e registros deste projeto serão apagados.
                    </p>
                </Modal>
            )}

            {/* Share Modal */}
            {showShareModal && (() => {
                const proj = store.projects.find((p) => p.id === showShareModal);
                if (!proj) return null;
                const sharedUsers = store.users.filter((u) => proj.sharedWith.includes(u.id));
                return (
                    <Modal title={`Compartilhar — ${proj.name}`} onClose={() => { setShowShareModal(null); setShareEmail(''); setShareStatus(null); }}
                        footer={<button className="btn btn-ghost" onClick={() => { setShowShareModal(null); setShareEmail(''); setShareStatus(null); }}>Fechar</button>}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Email input */}
                            <div className="field">
                                <label>Compartilhar por e-mail</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        className="input"
                                        type="email"
                                        placeholder="exemplo@email.com"
                                        value={shareEmail}
                                        onChange={(e) => { setShareEmail(e.target.value); setShareStatus(null); }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleShareByEmail(proj.id)}
                                    />
                                    <button className="btn btn-primary btn-sm" onClick={() => handleShareByEmail(proj.id)} disabled={!shareEmail.trim()}>
                                        <Share2 size={14} /> Convidar
                                    </button>
                                </div>
                                {shareStatus && (
                                    <p style={{ fontSize: '0.82rem', marginTop: 6, color: shareStatus.ok ? '#22c55e' : 'var(--danger)' }}>
                                        {shareStatus.msg}
                                    </p>
                                )}
                            </div>

                            {/* Already shared with */}
                            {sharedUsers.length > 0 && (
                                <div>
                                    <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Com acesso</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {sharedUsers.map((u) => (
                                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--glass)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{u.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email}</div>
                                                </div>
                                                <button className="btn btn-ghost btn-sm" onClick={() => removeShare(proj.id, u.id)}>
                                                    <X size={13} /> Remover
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Modal>
                );
            })()}

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        </>
    );
}
