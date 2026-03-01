'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { FeedEvent } from '@/lib/types';
import { uid } from '@/lib/utils';
import { MessageSquare, Send, Trash2 } from 'lucide-react';

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
    return `${diffDays}d atrás`;
}

function formatDuration(seconds?: number) {
    if (!seconds) return '--:--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface FeedProps {
    friendIds: string[];
    myId: string;
    customEvents?: FeedEvent[];
    /** If provided, enables per-activity comments for this challenge */
    challengeId?: string;
    /** Whether the current user is an admin of the challenge (can delete others' comments) */
    isAdmin?: boolean;
}

export default function Feed({ friendIds, myId, customEvents, challengeId, isAdmin }: FeedProps) {
    const { store } = useStore();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const allRelevantIds = useMemo(() => [...friendIds, myId], [friendIds, myId]);

    const feedItems = useMemo(() => {
        if (!mounted) return [];
        if (customEvents) return customEvents;
        return store.feedEvents
            .filter(e => allRelevantIds.includes(e.userId))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 20);
    }, [store.feedEvents, allRelevantIds, mounted, customEvents]);

    if (!mounted) return <div className="h-48 animate-pulse bg-slate-50 rounded-xl" />;

    if (feedItems.length === 0) {
        return (
            <div className="bg-white rounded-xl card-depth p-8 text-center flex flex-col items-center justify-center h-48">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300 mb-2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p className="text-slate-500 font-bold mb-1">Nenhuma atividade recente.</p>
                <p className="text-xs text-slate-400">Os treinos concluídos por você e seus amigos aparecerão aqui.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {feedItems.map(event => (
                <FeedItemCard key={event.id} event={event} myId={myId} challengeId={challengeId} isAdmin={isAdmin} />
            ))}
        </div>
    );
}

function FeedItemCard({ event, myId, challengeId, isAdmin }: { event: FeedEvent, myId: string, challengeId?: string, isAdmin?: boolean }) {
    const { store, toggleKudo, addChallengeComment, deleteChallengeComment, createNotification } = useStore();
    const router = useRouter();
    const [isExpanded, setIsExpanded] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const user = store.profiles.find(u => u.id === event.userId);
    if (!user) return null;

    const eventKudos = store.kudos.filter(k => k.feedEventId === event.id);
    const hasMyKudo = eventKudos.some(k => k.userId === myId);

    // Comments for this specific feed event (only in challenge context)
    const eventComments = challengeId
        ? store.challengeComments
            .filter(c => c.challenge_id === challengeId && c.feed_event_id === event.id)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        : [];

    let eventText = 'concluiu um treino';
    let statsUI = null;
    let actionOnClick: (() => void) | undefined;
    let isShared = false;

    if (event.eventType.startsWith('WO_COMPLETED')) {
        const payloadParts = event.eventType.split('|');
        const lastSeg = payloadParts[payloadParts.length - 1];
        const hasLogIds = payloadParts.length >= 5 && !/^\d+$/.test(lastSeg);
        const isPayload = payloadParts.length >= 4;

        let payloadWorkoutName = '';
        let payloadDone = '0';
        let payloadTotal = '0';
        let payloadLogIds: string[] = [];

        if (hasLogIds) {
            payloadTotal = payloadParts[payloadParts.length - 2];
            payloadDone = payloadParts[payloadParts.length - 3];
            payloadWorkoutName = payloadParts.slice(1, -3).join('|');
            payloadLogIds = lastSeg ? lastSeg.split(',').filter(Boolean) : [];
        } else if (isPayload) {
            payloadTotal = payloadParts[payloadParts.length - 1];
            payloadDone = payloadParts[payloadParts.length - 2];
            payloadWorkoutName = payloadParts.slice(1, -2).join('|');
        }

        const workout = store.workouts.find(w => w.id === event.referenceId);
        const project = workout ? store.projects.find(p => p.id === workout.projectId) : null;

        if (workout) {
            isShared = project ? (project.sharedWith.length > 0 || !!project.prescribed_by || !!project.prescribed_to) : false;
            eventText = project ? `Treino "${workout.name}" • ${project.name}` : `Treino "${workout.name}"`;

            if (project) {
                actionOnClick = () => router.push(`/projects/${project.id}`);
            }

            let dayLogs;
            if (payloadLogIds.length > 0) {
                dayLogs = store.logs.filter(l => payloadLogIds.includes(l.id));
            } else {
                const eventDateObj = new Date(event.createdAt);
                const localDateStr = `${eventDateObj.getFullYear()}-${String(eventDateObj.getMonth() + 1).padStart(2, '0')}-${String(eventDateObj.getDate()).padStart(2, '0')}`;
                dayLogs = store.logs.filter(l => l.userId === event.userId && l.workoutId === workout.id && l.date === localDateStr);
            }

            let totalVolume = 0;
            const renderItems: { id: string; exId: string; plannedSets: number; log?: any; isExtra?: boolean }[] = [];
            const availableLogs = [...dayLogs];

            workout.exercises.forEach((planned, idx) => {
                const logIdx = availableLogs.findIndex(l => l.exerciseId === planned.exerciseId);
                let log = undefined;
                if (logIdx !== -1) {
                    log = availableLogs[logIdx];
                    availableLogs.splice(logIdx, 1);
                }
                renderItems.push({ id: `planned-${idx}-${planned.exerciseId}`, exId: planned.exerciseId, plannedSets: planned.sets.length, log });
            });

            availableLogs.forEach((log, idx) => {
                renderItems.push({ id: `extra-${idx}-${log.id}`, exId: log.exerciseId, plannedSets: 0, log, isExtra: true });
            });

            const totalExercises = renderItems.length;
            const completedExercises = renderItems.filter(item => item.log && item.log.sets.length > 0).length;
            const completionPercentage = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;
            const formattedPercentage = completionPercentage.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '%';

            if (renderItems.length === 0) {
                statsUI = (
                    <div className="bg-slate-50 rounded-xl p-3 sm:p-4 mt-1 text-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                            Concluído (Sem detalhes de exercícios)
                        </span>
                    </div>
                );
            } else {
                statsUI = (
                    <>
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-slate-50 rounded-xl p-3 sm:p-4 mt-1">
                            <div className="flex flex-col">
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Duração</span>
                                <span className="text-lg sm:text-xl font-extrabold text-slate-900">{formatDuration(event.duration)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Exercícios</span>
                                <span className="text-lg sm:text-xl font-extrabold text-slate-900">{completedExercises} / {totalExercises}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Conclusão</span>
                                <span className="text-lg sm:text-xl font-extrabold text-slate-900">{formattedPercentage}</span>
                            </div>
                        </div>
                        <div className="mt-2 flex flex-col items-center">
                            <button className="text-[10px] text-primary font-bold uppercase tracking-widest hover:underline py-1" onClick={() => setIsExpanded(!isExpanded)}>
                                {isExpanded ? 'Ocultar Exercícios' : `Ver Exercícios (${totalExercises})`}
                            </button>

                            {isExpanded && (
                                <div className="mt-2 flex flex-col gap-2 w-full animate-fade">
                                    {renderItems.map((item) => {
                                        const exName = store.exercises.find(e => e.id === item.exId)?.name || 'Exercício';
                                        const log = item.log;
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
                                            <div key={item.id} className="flex justify-between items-center text-sm py-1 border-b border-slate-50 last:border-0 pl-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`font-bold font-inter uppercase ${!log ? 'text-slate-300 line-through' : 'text-slate-500'}`}>{exName}</span>
                                                    {log && skippedSets > 0 && (
                                                        <span className="text-[10px] bg-red-100 text-red-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                                                            faltou {skippedSets}
                                                        </span>
                                                    )}
                                                    {!log && (
                                                        <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                                                            não feito
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-primary font-normal font-roboto text-right">{setsDisplay}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                );
            }
        } else if (isPayload) {
            eventText = `Treino "${payloadWorkoutName}"`;
            const totalExercises = parseInt(payloadTotal, 10) || 0;
            const completedExercises = parseInt(payloadDone, 10) || 0;
            const completionPercentage = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;
            const formattedPercentage = completionPercentage.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + '%';

            if (totalExercises === 0) {
                statsUI = (
                    <div className="bg-slate-50 rounded-xl p-3 sm:p-4 mt-1 text-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                            Concluído (Sem detalhes de exercícios)
                        </span>
                    </div>
                );
            } else {
                statsUI = (
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 bg-slate-50 rounded-xl p-3 sm:p-4 mt-1">
                        <div className="flex flex-col">
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Duração</span>
                            <span className="text-lg sm:text-xl font-extrabold text-slate-900">{formatDuration(event.duration || 0)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Exercícios</span>
                            <span className="text-lg sm:text-xl font-extrabold text-slate-900">{completedExercises} / {totalExercises}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Conclusão</span>
                            <span className="text-lg sm:text-xl font-extrabold text-slate-900">{formattedPercentage}</span>
                        </div>
                    </div>
                );
            }
        } else if (event.duration) {
            statsUI = (
                <div className="bg-slate-50 rounded-xl p-3 sm:p-4 mt-1">
                    <div className="flex flex-col">
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Duração</span>
                        <span className="text-lg sm:text-xl font-extrabold text-slate-900">{formatDuration(event.duration)}</span>
                    </div>
                </div>
            );
        }
    } else if (event.eventType.startsWith('CHALLENGE_CHECKIN')) {
        const titleParts = event.eventType.split('|');
        const challengeTitle = titleParts.length > 1 ? titleParts[1] : 'um desafio';

        eventText = `fez um check-in no desafio "${challengeTitle}"`;
        isShared = true;

        const challenge = store.challenges.find(c => c.id === event.referenceId);
        if (challenge) {
            actionOnClick = () => router.push(`/challenges/${challenge.id}`);
            statsUI = (
                <div className="bg-amber-50 rounded-xl p-3 sm:p-4 mt-2 border border-amber-100 flex items-center justify-center gap-3">
                    <span className="text-2xl">{challenge.emoji}</span>
                    <span className="text-sm text-amber-800 font-bold uppercase tracking-wide">
                        Check-in Realizado 🔥
                    </span>
                </div>
            );
        } else {
            statsUI = (
                <div className="bg-amber-50 rounded-xl p-3 sm:p-4 mt-2 border border-amber-100 flex items-center justify-center gap-3">
                    <span className="text-2xl">🏆</span>
                    <span className="text-sm text-amber-800 font-bold uppercase tracking-wide">
                        Check-in Realizado 🔥
                    </span>
                </div>
            );
        }
    }

    async function handleSubmitComment(e: React.FormEvent) {
        e.preventDefault();
        const text = commentText.trim();
        if (!text || !challengeId) return;
        setSubmitting(true);
        try {
            await addChallengeComment({
                id: crypto.randomUUID(),
                challenge_id: challengeId,
                user_id: myId,
                content: text,
                feed_event_id: event.id,
                created_at: new Date().toISOString(),
            });
            setCommentText('');

            // Notify the post owner if they're not the commenter
            if (event.userId !== myId) {
                const ownerProfile = store.profiles.find(p => p.id === event.userId);
                const wantsNotif = ownerProfile?.notification_prefs?.comment_on_post !== false;
                if (wantsNotif) {
                    const commenterName = store.profiles.find(p => p.id === myId)?.name ?? 'Alguém';
                    createNotification({
                        id: uid(),
                        user_id: event.userId,
                        type: 'comment_on_post',
                        reference_id: event.id,
                        title: '💬 Novo comentário!',
                        message: `${commenterName} comentou na sua atividade.`,
                    }).catch(console.error);
                }
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div key={event.id} className="bg-white rounded-xl card-depth p-4 md:p-5 flex flex-col gap-4 animate-fade border border-transparent hover:border-slate-100 transition-colors">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => actionOnClick && actionOnClick()}>
                    <div className={`size-10 rounded-full overflow-hidden ${user.photo_url ? 'bg-transparent' : 'bg-slate-200'} flex items-center justify-center shrink-0`}>
                        {user.photo_url ? (
                            <img src={user.photo_url} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-base font-bold text-slate-600">{user.name.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    <div>
                        <h4 className="text-base font-bold font-inter text-slate-900 hover:text-primary transition-colors">
                            {user.id === myId ? 'Você' : user.name}
                        </h4>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-slate-400 text-xs font-normal font-roboto">
                                {timeAgo(event.createdAt)} • {eventText}
                            </p>
                            {isShared && (
                                <span className="text-[8px] bg-emerald-100 text-emerald-600 font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md whitespace-nowrap">
                                    Compartilhado
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                {actionOnClick && (
                    <button className="text-slate-500 hover:text-slate-800 transition-colors text-[10px] font-bold uppercase tracking-widest font-roboto shrink-0" onClick={actionOnClick}>
                        Mais detalhes
                    </button>
                )}
            </div>

            {statsUI}

            {/* ─── Action bar: Curtir + Comentar ─── */}
            <div className="flex items-center gap-2 pt-1">
                {/* Like button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleKudo({ id: uid(), feedEventId: event.id, userId: myId, createdAt: new Date().toISOString() });
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold font-montserrat transition-transform active:scale-95 bg-primary text-white hover:scale-[1.02] shadow-sm ${hasMyKudo ? 'shadow-primary/40' : 'shadow-primary/10'}`}
                >
                    {eventKudos.length} {eventKudos.length === 1 ? 'curtida' : 'curtidas'}
                </button>

                {/* Comment button — only in challenge context */}
                {challengeId && (
                    <button
                        onClick={() => {
                            setShowComments(v => !v);
                            if (!showComments) setTimeout(() => textareaRef.current?.focus(), 100);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold font-montserrat transition-all border ${showComments
                                ? 'bg-amber-50 text-amber-600 border-amber-200'
                                : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                            }`}
                    >
                        <MessageSquare size={15} />
                        <span className="text-sm">
                            {eventComments.length > 0 ? eventComments.length : 'Comentar'}
                        </span>
                    </button>
                )}
            </div>

            {/* ─── Inline comments panel ─── */}
            {challengeId && showComments && (
                <div className="border-t border-slate-100 pt-3 flex flex-col gap-3 animate-in fade-in duration-150">
                    {/* Comment list */}
                    {eventComments.length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-1">Sem comentários ainda.</p>
                    )}
                    {eventComments.map(comment => {
                        const author = store.profiles.find(p => p.id === comment.user_id);
                        const canDelete = comment.user_id === myId || isAdmin;
                        const dt = new Date(comment.created_at);
                        const dateStr = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                        const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        return (
                            <div key={comment.id} className="flex items-start gap-2.5 group">
                                <div className="size-7 rounded-full bg-slate-200 overflow-hidden shrink-0 mt-0.5">
                                    {author?.photo_url ? (
                                        <img src={author.photo_url} alt={author.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 text-[10px] bg-slate-100">
                                            {author?.name?.charAt(0).toUpperCase() ?? '?'}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 bg-slate-50 border border-slate-100 rounded-xl rounded-tl-sm px-3 py-2">
                                    <div className="flex items-center justify-between gap-1 mb-0.5">
                                        <span className="text-[11px] font-bold text-slate-700 truncate">
                                            {author?.name ?? 'Usuário'}
                                            {comment.user_id === myId && <span className="ml-1 text-[9px] font-black text-amber-500 uppercase tracking-wider">Você</span>}
                                        </span>
                                        <span className="text-[10px] text-slate-400 shrink-0">{dateStr} {timeStr}</span>
                                    </div>
                                    <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>
                                </div>
                                {canDelete && (
                                    <button
                                        onClick={() => deleteChallengeComment(comment.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                                        title="Excluir"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    {/* Input */}
                    <form onSubmit={handleSubmitComment} className="flex items-end gap-2">
                        {(() => {
                            const me = store.profiles.find(p => p.id === myId);
                            return (
                                <div className="size-7 rounded-full bg-amber-100 overflow-hidden shrink-0 mb-1">
                                    {me?.photo_url
                                        ? <img src={me.photo_url} alt={me.name} className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center font-bold text-amber-600 text-[10px]">{me?.name?.charAt(0).toUpperCase() ?? '?'}</div>
                                    }
                                </div>
                            );
                        })()}
                        <div className="flex-1 relative">
                            <textarea
                                ref={textareaRef}
                                rows={1}
                                className="w-full bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 rounded-xl px-3 py-2 pr-10 text-sm text-slate-900 outline-none transition-all focus:bg-white resize-none"
                                placeholder="Escreva um comentário..."
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                disabled={submitting}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        (e.currentTarget.form as HTMLFormElement)?.requestSubmit();
                                    }
                                }}
                            />
                            <button
                                type="submit"
                                disabled={submitting || !commentText.trim()}
                                className="absolute right-1.5 bottom-1.5 p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                <Send size={12} />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}