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
        if (editTarget) {
            await updateProject({ ...editTarget, name: pName, startDate: pStart, endDate: pEnd });
            setToast({ msg: 'Projeto atualizado!', type: 'success' });
        } else {
            await addProject({ id: uid(), name: pName, ownerId: userId, startDate: pStart, endDate: pEnd, sharedWith: [] });
            setToast({ msg: 'Projeto criado!', type: 'success' });
        }
        setSaving(false);
        setShowModal(false);
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setSaving(true);
        await deleteProject(deleteTarget.id);
        setSaving(false);
        setDeleteTarget(null);
        setToast({ msg: 'Projeto excluído.', type: 'success' });
    }

    async function handleShare(projectId: string, friendId: string) {
        const p = store.projects.find((x) => x.id === projectId);
        if (!p || p.sharedWith.includes(friendId)) return;
        await updateProject({ ...p, sharedWith: [...p.sharedWith, friendId] });
        setToast({ msg: 'Projeto compartilhado!', type: 'success' });
    }

    async function removeShare(projectId: string, friendId: string) {
        const p = store.projects.find((x) => x.id === projectId);
        if (!p) return;
        await updateProject({ ...p, sharedWith: p.sharedWith.filter((id) => id !== friendId) });
        setToast({ msg: 'Compartilhamento removido.', type: 'success' });
    }

    const otherUsers = store.users.filter((u) => u.id !== userId);

    return (
        <>
            <Navbar />
            <div className="container">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Projetos</h1>
                        <p className="page-subtitle">{myProjects.length} projeto(s)</p>
                    </div>
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={16} /> Novo Projeto
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
                return (
                    <Modal title={`Compartilhar — ${proj.name}`} onClose={() => setShowShareModal(null)}
                        footer={<button className="btn btn-ghost" onClick={() => setShowShareModal(null)}>Fechar</button>}
                    >
                        {otherUsers.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)' }}>Nenhum outro usuário cadastrado.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {otherUsers.map((u) => {
                                    const shared = proj.sharedWith.includes(u.id);
                                    return (
                                        <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{u.name}</div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.email}</div>
                                            </div>
                                            {shared ? (
                                                <button className="btn btn-ghost btn-sm" onClick={() => removeShare(proj.id, u.id)}>
                                                    <X size={13} /> Remover
                                                </button>
                                            ) : (
                                                <button className="btn btn-primary btn-sm" onClick={() => handleShare(proj.id, u.id)}>
                                                    <Share2 size={13} /> Compartilhar
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Modal>
                );
            })()}

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        </>
    );
}
