'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useStore } from '@/lib/store';
import { FeedEvent, Kudo } from '@/lib/types';
import { uid } from '@/lib/utils';

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
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Feed({ friendIds, myId }: { friendIds: string[], myId: string }) {
    const { store, toggleKudo } = useStore();
    const router = useRouter();

    const allRelevantIds = [...friendIds, myId];

    const feedItems = useMemo(() => {
        return store.feedEvents
            .filter(e => allRelevantIds.includes(e.userId))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 20);
    }, [store.feedEvents, allRelevantIds]);

    if (feedItems.length === 0) {
        return (
            <div className="bg-white rounded-xl card-depth p-8 text-center flex flex-col items-center justify-center h-48">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">forum</span>
                <p className="text-slate-500 font-bold mb-1">Nenhuma atividade recente.</p>
                <p className="text-xs text-slate-400">Os treinos concluídos por você e seus amigos aparecerão aqui.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {feedItems.map(event => {
                const user = store.profiles.find(u => u.id === event.userId);
                if (!user) return null;

                const eventKudos = store.kudos.filter(k => k.feedEventId === event.id);
                const hasMyKudo = eventKudos.some(k => k.userId === myId);

                let eventText = 'concluiu um treino';
                let statsUI = null;
                let actionOnClick: (() => void) | undefined;

                if (event.eventType === 'WO_COMPLETED') {
                    const workout = store.workouts.find(w => w.id === event.referenceId);
                    const project = workout ? store.projects.find(p => p.id === workout.projectId) : null;

                    if (workout) {
                        eventText = project ? `Treino "${workout.name}" • ${project.name}` : `Treino "${workout.name}"`;

                        if (project) {
                            actionOnClick = () => router.push(`/projects/${project.id}`);
                        }

                        const eventDateObj = new Date(event.createdAt);
                        const localDateStr = `${eventDateObj.getFullYear()}-${String(eventDateObj.getMonth() + 1).padStart(2, '0')}-${String(eventDateObj.getDate()).padStart(2, '0')}`;
                        const dayLogs = store.logs.filter(l => l.userId === event.userId && l.workoutId === workout.id && l.date === localDateStr);

                        // Calculate total volume
                        let totalVolume = 0;
                        const exerciseCount = dayLogs.length;

                        dayLogs.forEach(log => {
                            log.sets.forEach(set => {
                                totalVolume += set.weight || 0;
                            });
                        });

                        statsUI = (
                            <>
                                <div className="grid grid-cols-3 gap-4 bg-slate-50 rounded-xl p-6 mt-4">
                                    <div className="flex flex-col">
                                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Duração</span>
                                        <span className="text-2xl font-extrabold text-slate-900">{formatDuration(event.duration)}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Volume</span>
                                        <span className="text-2xl font-extrabold text-slate-900">{totalVolume} <span className="text-primary text-sm font-bold tracking-normal">kg</span></span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Exercícios</span>
                                        <span className="text-2xl font-extrabold text-slate-900">{exerciseCount}</span>
                                    </div>
                                </div>
                                {dayLogs.length > 0 && (
                                    <div className="mt-4 flex flex-col gap-2">
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
                                                <div key={log.id} className="flex justify-between items-center text-sm py-0.5">
                                                    <span className="text-slate-500 font-bold font-inter uppercase">{exName}</span>
                                                    <span className="text-primary font-normal font-roboto">{setsDisplay}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        );
                    }
                }

                return (
                    <div key={event.id} className="bg-white rounded-xl card-depth p-6 flex flex-col gap-6 animate-fade border border-transparent hover:border-slate-100 transition-colors">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 cursor-pointer" onClick={() => actionOnClick && actionOnClick()}>
                                <div className="size-12 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center shrink-0">
                                    <span className="text-lg font-bold text-slate-600">{user.name.charAt(0).toUpperCase()}</span>
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold font-inter text-slate-900 hover:text-primary transition-colors">{user.id === myId ? 'Você' : user.name}</h4>
                                    <p className="text-slate-400 text-sm font-normal font-roboto">{timeAgo(event.createdAt)} • {eventText}</p>
                                </div>
                            </div>
                            {actionOnClick && (
                                <button className="text-slate-500 hover:text-slate-800 transition-colors text-[10px] font-bold uppercase tracking-widest font-roboto" onClick={actionOnClick}>
                                    Mais detalhes
                                </button>
                            )}
                        </div>

                        {statsUI}

                        <div className="flex items-center gap-4 pt-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleKudo({ id: uid(), feedEventId: event.id, userId: myId, createdAt: new Date().toISOString() });
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold font-montserrat transition-transform active:scale-95 bg-primary text-white hover:scale-[1.02] shadow-lg ${hasMyKudo ? 'shadow-primary/40' : 'shadow-primary/10'}`}
                            >
                                {eventKudos.length} {eventKudos.length === 1 ? 'curtida' : 'curtidas'}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
