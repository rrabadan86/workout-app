
uFit
    /
1772152714184_image.png
21: 39
I can see this is a screenshot of what appears to be a fitness / training app(likely "SlimFit") showing a list of training programs.Here's what's displayed:

Two training programs:

Básico 1.0 — Active, running from 22 /02 / 2026 to 25 /04 / 2026, with 5 workouts, shared with 1 person.
✨ Treino de Força para Corredores - Iniciante(Strength Training for Runners - Beginner) — AI - generated, Active
A resposta do Claude foi interrompida
1772152825219_image.png

'use client'; import { useEffect, useState } from 'react'; import { useRouter } from 'next/navigation'; import { Plus, FolderOpen, Pencil, Trash2, ChevronRight, Share2, X, Users, Sparkles, Loader2 } from 'lucide-react'; import Navbar from '@/components/Navbar'; import Modal from '@/components

pasted

Como você consegue melhorar o leiaute da imagem em anexo desses card, mantendo todo o padrão existente ? O código foi anexado.

21: 40
Looking at the screenshot and the code, I can see the card layout on mobile has some issues: the action buttons(share, edit, delete) are visually disconnected, there's too much vertical spacing, and the overall card density could be improved. Let me analyze and provide an improved version.

Here are the key improvements I'd suggest for the card layout:

Action buttons inline — move them to a more compact row, better aligned
Tighter spacing — reduce padding and gaps on mobile
Better visual hierarchy — badges on the same line, more compact metadata
Subtle left border accent for status indication
Better responsive behavior
Let me create the improved card section:


Check frontend design skill for best practices
Check frontend design skill for best practices
Now I understand the context.Since this is an existing app with established design patterns(purple accent, Tailwind classes, specific component structure), I should improve the card layout while respecting the existing design system rather than reinventing it.Let me focus on practical UX / layout improvements.


Criou um arquivo, leu um arquivo
Criou um arquivo, leu um arquivo
Aqui estão as principais melhorias no layout dos cards:

Estrutura do Card:

Borda lateral colorida por status(verde = ativo, cinza = encerrado, amarelo = em breve) — dá feedback visual instantâneo
Ícone + título + badges na mesma linha, com alinhamento limpo e line - clamp - 2 para títulos longos
Metadados alinhados abaixo do título com ícones Calendar e Dumbbell do Lucide ao invés de emojis
Informações de prescrição / compartilhamento ficam compactas logo abaixo
Barra de Ações:

Separada por um border - top sutil, ficando numa faixa dedicada na parte inferior do card
Botões com texto visível em desktop, apenas ícones no mobile
Botão "Abrir →" aparece no mobile para facilitar navegação
Header da página:

Botões "Gerar por IA" e "Nova" ficam full - width no mobile(flex - 1)
Filtros com scroll horizontal no mobile ao invés de quebrar linha
Organização vertical mais lógica: título → botões → filtros
Responsividade:

Padding reduzido no mobile(px - 4 vs px - 6)
active: scale - [0.99] para feedback tátil no toque
Gap entre cards reduzido de 12px para 12px(gap - 3)
Projectspage improved
Código · TSX 
1772153174005_image.png
Gostei.Mas precisa de melhorias.A parte do filtro não ficou legal... Tem uma barra de rolagem... Não quero barra de rolagem horizontal.Adeque isso.

Além disso, nao tem necessidade dessa borda no lado esquerdo do card de cor diferente..mantenha conforme o restante do card.

    Entendeu ? Qualquer coisa me pergunte.

Responda em portugues

21: 48
Entendi perfeitamente! Duas correções:

Filtros: remover o scroll horizontal e fazer os selects quebrarem linha naturalmente(wrap)
Borda esquerda colorida: remover, manter o card uniforme como era antes

Editou 2 arquivos, visualizou um arquivo
Editou 2 arquivos, visualizou um arquivo
Agora remover a borda esquerda colorida dos cards:


Editou 2 arquivos
Editou 2 arquivos
Também posso remover a constante STATUS_BORDER que não é mais usada:


Editou um arquivo, leu um arquivo
Editou um arquivo, leu um arquivo
Pronto! As duas correções feitas:

Filtros: agora usam flex - wrap — quebram linha naturalmente no mobile sem barra de rolagem.Cada select tem flex - 1 min - w - 0 no mobile para dividir o espaço disponível, e tamanho automático no desktop.
Borda esquerda: removida completamente — os cards agora têm borda uniforme como o restante do design(border border - transparent).
Projectspage improved
Código · TSX

'use client'; import { useEffect, useMemo } from 'react'; import { useRouter } from 'next/navigation'; import { Dumbbell, ListChecks, BarChart2, Users, ChevronRight, TrendingUp, FolderOpen, Clock } from 'lucide-react'; import Navbar from '@/components/Navbar'; import Feed from '@/components/F

pasted


'use client'; import { useEffect, useState } from 'react'; import { useRouter } from 'next/navigation'; import Navbar from '@/components/Navbar'; import Modal from '@/components/Modal'; import Toast from '@/components/Toast'; import { useAuth } from '@/lib/AuthContext'; import { useStore }

pasted

Ótimo!
Gostaria que você pegasse o card de atividade recente(sem o botão de curtidas) e colocasse na página de histórico.

Em anexo os dois códigos.É para alterar o de histórico, apenas, para deixar o card de atividades igual.
Lembrando que o de historico tem que ter a opção de ocultar do feed e o icone de lixeira.

    Entendeu ? Se tiver dúvida me pergunte antes de iniciar.

21: 57
Entendi perfeitamente.Vou pegar o visual do card do Feed(da Dashboard) e aplicar no histórico, mantendo os botões de ocultar / mostrar e excluir que já existem lá.

Preciso ver o componente Feed para entender a estrutura do card de atividade:


Searched project for “Feed component card activity workout completed”
Searched project for “Feed component card activity workout completed”









A busca trouxe trechos parciais.Deixa eu ver o componente Feed completo:


Searched project for “Feed card workout completed avatar photo stats volume duration exercises render”
Searched project for “Feed card workout completed avatar photo stats volume duration exercises render”








Agora preciso ver o restante do card do Feed(a parte do avatar, render do card completo):


Searched project for “Feed return render card avatar user photo story - ring kudos event click”
Searched project for “Feed return render card avatar user photo story - ring kudos event click”








Agora tenho o Feed completo.O card do Feed tem esta estrutura:

Avatar circular + Nome do usuário + tempo atrás + nome do treino
Grid com stats(Duração, Volume, Exercícios) em bg - slate - 50 rounded - xl p - 6
Lista de exercícios com sets
Botão de curtidas(que NÃO vai no histórico)
No histórico, preciso manter: botões de ocultar / excluir.Vou recriar o history usando o visual do Feed card.


Criou um arquivo, leu um arquivo
Criou um arquivo, leu um arquivo
Pronto! O card do histórico agora segue exatamente o visual do Feed.Aqui está o que mudou:

Estrutura do card(igual ao Feed):

Avatar circular com foto do usuário(ou inicial) + "Você" como nome + timeAgo + nome do treino / projeto
Grid de stats com Duração, Volume e Exercícios no fundo bg - slate - 50 rounded - xl p - 6
Lista de exercícios com nome em uppercase e séries agrupadas à direita em cor primary
Exercícios não feitos aparecem riscados com badge "não feito"(separados por border - t)
O que foi mantido do histórico:

Botões de ocultar / mostrar(Eye / EyeOff) e excluir(Trash2) no canto superior direito
Badge "Privado" quando a sessão está oculta
Toda a lógica de toggleVisibility, confirmDelete e exclusão de logs
Modal de confirmação de exclusão
O que foi removido(do Feed):

Botão de curtidas(não aplicável no histórico)
Link "Mais detalhes"
History page
Código · TSX 
1772154086362_image.png
Podia deixar os exercício escondido e expandir(ver exercicios) quando necessário e deixar o Mais detalhes. 
Veja também que no dashboard eu tenho a duranção em hh: mm:ss os exercícios executados e o % de conclusão
Deixe como no dashboard, adicionando os icones de ocultar e exclusão.

Fui claro ?

    22 :03
Sim, ficou claro! Resumindo:

Stats: Duração(hh: mm: ss), Exercícios(feitos / total), Conclusão(%)
Exercícios: escondidos por padrão, com botão "Ver Exercícios (N)" para expandir
"Mais Detalhes": mantido(leva ao projeto)
Ícones de ocultar / excluir: mantidos
Visual igual ao do Dashboard / Feed

Criou 2 arquivos, executou um comando, leu um arquivo
Criou 2 arquivos, executou um comando, leu um arquivo
Pronto! Agora o card do histórico está igual ao do Dashboard.As mudanças:

Stats(igual à imagem):

Duração em hh: mm: ss
Exercícios como feitos / total(ex: 1 / 1)
Conclusão em % com cor dinâmica(verde 100 %, amarelo ≥50 %, vermelho < 50 %)
Exercícios colapsáveis:

Botão "Ver exercícios (N)" com seta — clica para expandir
Quando expandido muda para "Ocultar exercícios" com seta pra cima
Exercícios não feitos aparecem riscados com badge "não feito"
Ações mantidas:

"Mais detalhes" — visível no desktop ao lado dos ícones, no mobile aparece no rodapé do card
Olho(Eye / EyeOff) — ocultar / mostrar da comunidade
Lixeira — excluir sessão
Badge "Compartilhado"(verde) ou "Privado"(cinza) ao lado do nome
History page
Código · TSX 


Você usou 90 % do seu limite de sessão
Obter mais uso




Claude é uma IA e pode cometer erros.Por favor, verifique as respostas.
History page · TSX
Copiar

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { Clock, Trash2, Eye, EyeOff, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react';
import type { FeedEvent } from '@/lib/types';

function formatDurationHMS(seconds?: number) {
    if (!seconds) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function timeAgo(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'agora mesmo';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays === 1) return 'ontem';
    if (diffDays < 30) return `${diffDays}d atrás`;
    return `${Math.floor(diffDays / 30)} mês(es) atrás`;
}

export default function HistoryPage() {
    const router = useRouter();
    const { userId, ready } = useAuth();
    const { store, deleteFeedEvent, updateFeedEvent, deleteLog } = useStore();

    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<FeedEvent | null>(null);
    const [saving, setSaving] = useState(false);
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (ready && !userId) router.replace('/');
    }, [ready, userId, router]);

    if (!ready || !userId) return null;

    const currentUser = store.profiles.find(u => u.id === userId);

    const myHistory = store.feedEvents
        .filter(e => e.userId === userId && (e.eventType === 'WO_COMPLETED' || e.eventType === 'WO_COMPLETED_HIDDEN'))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    function toggleExpand(eventId: string) {
        setExpandedCards(prev => {
            const next = new Set(prev);
            if (next.has(eventId)) next.delete(eventId);
            else next.add(eventId);
            return next;
        });
    }

    async function toggleVisibility(event: FeedEvent) {
        setSaving(true);
        const newType = event.eventType === 'WO_COMPLETED' ? 'WO_COMPLETED_HIDDEN' : 'WO_COMPLETED';
        await updateFeedEvent({ ...event, eventType: newType });
        setSaving(false);
        setToast({ msg: newType === 'WO_COMPLETED' ? 'Sessão visível na comunidade.' : 'Sessão oculta da comunidade.', type: 'success' });
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setSaving(true);

        const eventDateObj = new Date(deleteTarget.createdAt);
        const localDateStr = `${eventDateObj.getFullYear()}-${String(eventDateObj.getMonth() + 1).padStart(2, '0')}-${String(eventDateObj.getDate()).padStart(2, '0')}`;

        const sameDayEvents = store.feedEvents.filter(e => {
            if (e.userId !== userId || e.referenceId !== deleteTarget.referenceId) return false;
            if (e.eventType !== 'WO_COMPLETED' && e.eventType !== 'WO_COMPLETED_HIDDEN') return false;
            const eDateObj = new Date(e.createdAt);
            const eDateStr = `${eDateObj.getFullYear()}-${String(eDateObj.getMonth() + 1).padStart(2, '0')}-${String(eDateObj.getDate()).padStart(2, '0')}`;
            return eDateStr === localDateStr;
        });

        if (sameDayEvents.length <= 1) {
            const logsToDelete = store.logs.filter(l =>
                l.userId === userId && l.workoutId === deleteTarget.referenceId && l.date === localDateStr
            );
            for (const log of logsToDelete) {
                await deleteLog(log.id);
            }
        }

        await deleteFeedEvent(deleteTarget.id);
        setSaving(false);
        setDeleteTarget(null);

        if (sameDayEvents.length <= 1) {
            setToast({ msg: 'Sessão e registros excluídos do histórico.', type: 'success' });
        } else {
            setToast({ msg: 'Sessão removida do histórico. As séries foram mantidas pois há outras sessões no mesmo dia.', type: 'success' });
        }
    }

    return (
        <>
            <Navbar />
            <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8">
                <div className="mb-4">
                    <button className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-5 py-2.5 text-sm" onClick={() => router.push('/dashboard')}>
                        ← Voltar ao Dashboard
                    </button>
                </div>
                <div className="flex flex-col md:flex-row md:items-end w-full justify-between gap-6 mb-10">
                    <div>
                        <h1 className="page-title">Histórico</h1>
                        <p className="page-subtitle">Seus treinos já realizados</p>
                    </div>
                    <div className="size-12 rounded-xl flex items-center justify-center bg-primary/10 text-primary shrink-0">
                        <Clock size={24} />
                    </div>
                </div>

                {myHistory.length === 0 ? (
                    <div className="bg-white rounded-xl card-depth p-10 mt-8 text-center flex flex-col items-center justify-center border border-slate-100">
                        <Dumbbell size={48} className="text-slate-300 mb-4" />
                        <p className="text-slate-500 font-bold font-roboto">Nenhuma sessão finalizada ainda.</p>
                        <button className="btn bg-primary text-white hover:scale-[1.02] shadow-xl shadow-primary/30 px-6 py-4 mt-6" onClick={() => router.push('/projects')}>
                            Ir para Treinos
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6 mb-10">
                        {myHistory.map(event => {
                            const workout = store.workouts.find(w => w.id === event.referenceId);
                            if (!workout) return null;

                            const project = store.projects.find(p => p.id === workout.projectId);
                            const isHidden = event.eventType === 'WO_COMPLETED_HIDDEN';
                            const isExpanded = expandedCards.has(event.id);

                            const eventDateObj = new Date(event.createdAt);
                            const localDateStr = `${eventDateObj.getFullYear()}-${String(eventDateObj.getMonth() + 1).padStart(2, '0')}-${String(eventDateObj.getDate()).padStart(2, '0')}`;

                            const dayLogs = store.logs.filter(l => l.userId === userId && l.workoutId === workout.id && l.date === localDateStr);

                            // Stats
                            const totalPlanned = workout.exercises.length;
                            const exercisesDone = dayLogs.length;
                            const completionPercent = totalPlanned > 0 ? Math.round((exercisesDone / totalPlanned) * 100) : 100;

                            const eventText = project
                                ? `Treino "${workout.name}" • ${project.name}`
                                : `Treino "${workout.name}"`;

                            return (
                                <div
                                    key={event.id}
                                    className="bg-white rounded-xl card-depth p-6 flex flex-col gap-5 animate-fade border border-transparent hover:border-slate-100 transition-colors"
                                >
                                    {/* ── Header: Avatar + Info + Actions ── */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            {/* Avatar */}
                                            <div className="size-12 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center shrink-0">
                                                {currentUser?.photo_url ? (
                                                    <img src={currentUser.photo_url} alt={currentUser.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-lg font-bold text-slate-600">
                                                        {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-lg font-bold font-inter text-slate-900 flex items-center gap-2 flex-wrap">
                                                    Você
                                                    {isHidden && (
                                                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest font-montserrat">
                                                            Privado
                                                        </span>
                                                    )}
                                                    {!isHidden && (
                                                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest font-montserrat">
                                                            Compartilhado
                                                        </span>
                                                    )}
                                                </h4>
                                                <p className="text-slate-400 text-sm font-normal font-roboto truncate">
                                                    {timeAgo(event.createdAt)} • {eventText}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-0.5 shrink-0">
                                            {project && (
                                                <button
                                                    className="text-slate-500 hover:text-slate-800 transition-colors text-[10px] font-bold uppercase tracking-widest font-roboto px-2 py-1.5 rounded-lg hover:bg-slate-50 hidden sm:block"
                                                    onClick={() => router.push(`/projects/${project.id}`)}
                                                >
                                                    Mais detalhes
                                                </button>
                                            )}
                                            <button
                                                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-primary transition-colors focus:outline-none"
                                                title={isHidden ? 'Mostrar na comunidade' : 'Ocultar da comunidade'}
                                                onClick={() => toggleVisibility(event)}
                                                disabled={saving}
                                            >
                                                {isHidden ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                            <button
                                                className="p-2 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors focus:outline-none"
                                                title="Excluir sessão"
                                                onClick={() => setDeleteTarget(event)}
                                                disabled={saving}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* ── Stats Grid: Duração / Exercícios / Conclusão ── */}
                                    <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-xl p-5 sm:p-6">
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Duração</span>
                                            <span className="text-lg sm:text-2xl font-extrabold text-slate-900 mt-1">{formatDurationHMS(event.duration)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Exercícios</span>
                                            <span className="text-lg sm:text-2xl font-extrabold text-slate-900 mt-1">
                                                {exercisesDone} <span className="text-slate-400 text-xs sm:text-sm font-bold">/ {totalPlanned}</span>
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Conclusão</span>
                                            <span className={`text-lg sm:text-2xl font-extrabold mt-1 ${completionPercent === 100 ? 'text-emerald-500' : completionPercent >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                {completionPercent}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* ── Expandable Exercises ── */}
                                    <div className="flex flex-col">
                                        <button
                                            className="flex items-center justify-center gap-2 text-primary font-bold text-xs uppercase tracking-widest font-montserrat py-2 hover:underline transition-colors"
                                            onClick={() => toggleExpand(event.id)}
                                        >
                                            {isExpanded ? 'Ocultar exercícios' : `Ver exercícios (${exercisesDone})`}
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>

                                        {isExpanded && (
                                            <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
                                                {/* Exercícios feitos */}
                                                {dayLogs.map((log) => {
                                                    const exName = store.exercises.find(e => e.id === log.exerciseId)?.name || 'Exercício';
                                                    const groups: { count: number; weight: number }[] = [];
                                                    for (const s of log.sets) {
                                                        if (groups.length > 0 && groups[groups.length - 1].weight === s.weight) {
                                                            groups[groups.length - 1].count++;
                                                        } else {
                                                            groups.push({ count: 1, weight: s.weight });
                                                        }
                                                    }
                                                    const setsDisplay = groups.map(g => `${g.count}x ${g.weight}kg`).join(' / ');

                                                    return (
                                                        <div key={log.id} className="flex justify-between items-center text-sm py-1">
                                                            <span className="text-slate-600 font-bold font-inter">{exName}</span>
                                                            <span className="text-primary font-normal font-roboto pl-3 shrink-0">{setsDisplay}</span>
                                                        </div>
                                                    );
                                                })}

                                                {/* Exercícios não feitos */}
                                                {(() => {
                                                    const loggedIds = dayLogs.map(l => l.exerciseId);
                                                    const notDone = workout.exercises.filter(ex => !loggedIds.includes(ex.exerciseId));
                                                    if (notDone.length === 0) return null;

                                                    return notDone.map((planned, idx) => {
                                                        const exName = store.exercises.find(e => e.id === planned.exerciseId)?.name || 'Exercício';
                                                        return (
                                                            <div key={`nd-${idx}`} className="flex justify-between items-center text-sm py-1">
                                                                <span className="text-slate-300 line-through font-bold font-inter">{exName}</span>
                                                                <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest font-montserrat">
                                                                    não feito
                                                                </span>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Mobile: Mais detalhes link ── */}
                                    {project && (
                                        <button
                                            className="text-slate-500 hover:text-slate-800 transition-colors text-[10px] font-bold uppercase tracking-widest font-roboto text-center sm:hidden"
                                            onClick={() => router.push(`/projects/${project.id}`)}
                                        >
                                            Mais detalhes
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Delete Modal */}
            {deleteTarget && (
                <Modal title="Excluir Sessão Passada" onClose={() => setDeleteTarget(null)}
                    footer={
                        <div className="flex justify-end gap-3 mt-8">
                            <button className="btn bg-slate-100 text-slate-600 hover:bg-slate-200 px-6 py-4" onClick={() => setDeleteTarget(null)} disabled={saving}>Cancelar</button>
                            <button className="btn bg-rose-500 text-white hover:bg-rose-600 shadow-xl shadow-rose-500/30 px-6 py-4" onClick={confirmDelete} disabled={saving}>
                                {saving ? 'Excluindo...' : 'Excluir Definitivamente'}
                            </button>
                        </div>
                    }
                >
                    <p className="text-slate-500 font-roboto text-sm">
                        Tem certeza que deseja excluir as atividades deste dia? Esse registro sumirá do seu histórico, dos gráficos e do feed da comunidade.
                    </p>
                </Modal>
            )}

            {toast && <Toast message={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
        </>
    );
}








