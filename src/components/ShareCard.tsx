'use client';

import { useRef, useState } from 'react';
import { Share2, Download, ArrowLeft, MapPin } from 'lucide-react';
import { VimoLogo } from '@/components/UFitLogo';

interface ShareCardProps {
    workoutName: string;
    projectName?: string;
    date: string;
    duration: string;
    totalSets: number;
    completedSets: number;
    totalVolume: number;
    exercises: { name: string; sets: string }[];
    photoUrl?: string | null;
    userName?: string;
    checkinName?: string;
    onClose: () => void;
}

export default function ShareCard({
    workoutName,
    projectName,
    date,
    duration,
    totalSets,
    completedSets,
    totalVolume,
    exercises,
    photoUrl,
    userName,
    checkinName,
    onClose,
}: ShareCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [saving, setSaving] = useState(false);

    async function handleSaveImage() {
        if (!cardRef.current) return;
        setSaving(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(cardRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: null,
                logging: false,
            });
            const link = document.createElement('a');
            link.download = `treino-${workoutName.replace(/\s+/g, '-').toLowerCase()}-${date.replace(/\//g, '-')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('[ShareCard] Failed to save image:', err);
        } finally {
            setSaving(false);
        }
    }

    async function handleShare() {
        if (!cardRef.current) return;
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(cardRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: null,
                logging: false,
            });

            canvas.toBlob(async (blob) => {
                if (!blob) return;
                const file = new File([blob], 'share-card.png', { type: 'image/png' });

                if (navigator.share && navigator.canShare?.({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: `Treino ${workoutName} concluído!`,
                        text: `Acabei de concluir meu treino "${workoutName}" 💪🔥`,
                    });
                } else {
                    // Fallback: download
                    handleSaveImage();
                }
            }, 'image/png');
        } catch (err) {
            console.error('[ShareCard] Share failed:', err);
        }
    }

    const completionPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 100;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            {/* Scrollable card area */}
            <div className="flex-1 overflow-y-auto flex items-start justify-center px-4 py-6">
                <div
                    ref={cardRef}
                    className="relative w-full max-w-[420px] rounded-3xl overflow-hidden shadow-2xl"
                    style={{ minHeight: 500 }}
                >
                    {/* Background */}
                    {photoUrl ? (
                        <>
                            <img
                                src={photoUrl}
                                alt="Foto do treino"
                                className="absolute inset-0 w-full h-full object-cover"
                                crossOrigin="anonymous"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-primary/80" />
                    )}

                    {/* Content */}
                    <div className="relative z-10 flex flex-col h-full p-6 pt-8" style={{ minHeight: 500 }}>
                        {/* Logo/Brand */}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-2">
                                <VimoLogo width={32} height={32} />
                                <span className="text-white/80 font-extrabold text-xs uppercase tracking-[0.2em]">vimu</span>
                            </div>
                        </div>

                        {/* Workout Info */}
                        <div className="flex-1 flex flex-col justify-end">
                            {userName && (
                                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-2">
                                    {userName}
                                </p>
                            )}
                            <h2 className="text-white font-black text-2xl leading-tight mb-1">
                                {workoutName}
                            </h2>
                            {projectName && (
                                <p className="text-white/50 text-sm font-bold mb-4">{projectName}</p>
                            )}

                            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">{date}</p>

                            {checkinName && (
                                <div className="flex items-center gap-1.5 text-emerald-400 mb-4 bg-emerald-500/10 w-fit px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                    <MapPin size={14} />
                                    <span className="text-[11px] font-bold tracking-wide uppercase">{checkinName}</span>
                                </div>
                            )}

                            {/* Stats — only Duração */}
                            <div className="mb-5">
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-4 flex flex-col items-center">
                                    <span className="text-white/50 text-[9px] font-bold uppercase tracking-wider mb-1">Duração</span>
                                    <span className="text-white font-black text-3xl">{duration}</span>
                                </div>
                            </div>


                            {/* Exercise list */}
                            {exercises.length > 0 && (
                                <div className="flex flex-col gap-1.5 mb-4">
                                    <span className="text-white/40 text-[9px] font-bold uppercase tracking-wider mb-1">Exercícios</span>
                                    {exercises.slice(0, 8).map((ex, i) => (
                                        <div key={i} className="flex items-center justify-between px-3 py-1.5 bg-white/5 rounded-xl">
                                            <span className="text-white/80 text-xs font-bold truncate max-w-[55%]">{ex.name}</span>
                                            <span className="text-primary text-[11px] font-bold shrink-0">{ex.sets}</span>
                                        </div>
                                    ))}
                                    {exercises.length > 8 && (
                                        <span className="text-white/30 text-[10px] font-bold text-center mt-1">
                                            + {exercises.length - 8} exercício(s)
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Action buttons - Fixed at bottom */}
            <div className="shrink-0 w-full max-w-[420px] mx-auto px-4 pb-6 pt-3 flex flex-col gap-3">
                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                    <button
                        onClick={handleShare}
                        className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-white rounded-2xl font-extrabold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 active:scale-[0.98]"
                    >
                        <Share2 size={18} /> Compartilhar nos Stories
                    </button>
                )}
                <button
                    onClick={handleSaveImage}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-extrabold text-sm hover:bg-white/20 transition-all active:scale-[0.98] backdrop-blur-sm"
                >
                    <Download size={18} /> {saving ? 'Salvando...' : 'Salvar Imagem'}
                </button>
                <button
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-white/5 text-white/80 rounded-2xl font-bold text-sm hover:bg-white/10 hover:text-white transition-colors"
                >
                    <ArrowLeft size={16} /> Voltar aos Treinos
                </button>
            </div>
        </div>
    );
}
