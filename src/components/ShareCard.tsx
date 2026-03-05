'use client';

import { useRef, useState } from 'react';
import { Share2, Download, ArrowLeft, Loader2 } from 'lucide-react';
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
    onClose: () => void;
}

// ─── Canvas drawing helpers ─────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
            ctx.fillText(line, x, currentY);
            line = word;
            currentY += lineHeight;
        } else {
            line = test;
        }
    }
    ctx.fillText(line, x, currentY);
    return currentY;
}

async function loadImageAsBlob(url: string): Promise<HTMLImageElement | null> {
    try {
        // Try fetching as blob first (avoids CORS taint)
        const resp = await fetch(url, { mode: 'cors', cache: 'force-cache' });
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        const img = new Image();
        await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = () => rej(new Error('img load fail'));
            img.src = blobUrl;
        });
        // Note: intentionally not revoking here so img stays valid
        return img;
    } catch {
        return null;
    }
}

async function generateShareCanvas(props: {
    workoutName: string; projectName?: string; date: string; duration: string;
    photoUrl?: string | null; userName?: string;
}): Promise<HTMLCanvasElement | null> {
    const W = 1080;
    const H = 1350;
    const PAD = 80;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // ── Background ───────────────────────────────────────────────
    if (props.photoUrl) {
        const img = await loadImageAsBlob(props.photoUrl);
        if (img) {
            const scale = Math.max(W / img.width, H / img.height);
            const dw = img.width * scale;
            const dh = img.height * scale;
            ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
        } else {
            // fallback gradient if image failed
            const grd = ctx.createLinearGradient(0, 0, W, H);
            grd.addColorStop(0, '#1e293b');
            grd.addColorStop(1, '#0f172a');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, W, H);
        }
        // Dark overlay
        const ov = ctx.createLinearGradient(0, 0, 0, H);
        ov.addColorStop(0, 'rgba(0,0,0,0.15)');
        ov.addColorStop(0.35, 'rgba(0,0,0,0.35)');
        ov.addColorStop(1, 'rgba(0,0,0,0.88)');
        ctx.fillStyle = ov;
        ctx.fillRect(0, 0, W, H);
    } else {
        const grd = ctx.createLinearGradient(0, 0, W, H);
        grd.addColorStop(0, '#1e293b');
        grd.addColorStop(0.6, '#0f172a');
        grd.addColorStop(1, '#020617');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);
    }

    // ── Brand: VIMU text ─────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '800 52px system-ui, -apple-system, Arial, sans-serif';
    ctx.fillText('VIMU', PAD, 130);

    // ── User name ────────────────────────────────────────────────
    if (props.userName) {
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.font = '600 38px system-ui, -apple-system, Arial, sans-serif';
        ctx.letterSpacing = '4px';
        ctx.fillText(props.userName.toUpperCase(), PAD, H - 660);
        ctx.letterSpacing = '0px';
    }

    // ── Workout name ─────────────────────────────────────────────
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 88px system-ui, -apple-system, Arial, sans-serif';
    const lastY = wrapText(ctx, props.workoutName, PAD, H - 560, W - PAD * 2, 100);

    // ── Project name ─────────────────────────────────────────────
    let projY = lastY + 55;
    if (props.projectName) {
        ctx.fillStyle = 'rgba(255,255,255,0.38)';
        ctx.font = '600 38px system-ui, -apple-system, Arial, sans-serif';
        ctx.fillText(props.projectName, PAD, projY);
        projY += 50;
    }

    // ── Date ─────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.30)';
    ctx.font = '600 34px system-ui, -apple-system, Arial, sans-serif';
    ctx.fillText(props.date.toUpperCase(), PAD, projY + 44);

    // ── Duration badge ───────────────────────────────────────────
    const badgeX = PAD;
    const badgeY = H - 160;
    const badgeW = Math.max(300, ctx.measureText(props.duration).width + 120);
    const badgeH = 110;
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    roundRect(ctx, badgeX, badgeY - badgeH + 20, badgeW, badgeH, 22);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '700 26px system-ui, -apple-system, Arial, sans-serif';
    ctx.fillText('DURAÇÃO', badgeX + 28, badgeY - badgeH + 55);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 62px system-ui, -apple-system, Arial, sans-serif';
    ctx.fillText(props.duration, badgeX + 28, badgeY + 10);

    // ── Emoji ────────────────────────────────────────────────────
    ctx.font = '90px serif';
    ctx.fillText('💪🔥', W - 220, H - 90);

    return canvas;
}

// ─── Component ───────────────────────────────────────────────
export default function ShareCard({
    workoutName, projectName, date, duration, totalSets, completedSets,
    totalVolume, exercises, photoUrl, userName, onClose,
}: ShareCardProps) {
    const [busy, setBusy] = useState(false);

    async function handleSaveImage() {
        setBusy(true);
        try {
            const canvas = await generateShareCanvas({ workoutName, projectName, date, duration, photoUrl, userName });
            if (!canvas) throw new Error('canvas null');
            const link = document.createElement('a');
            link.download = `vimu-treino-${workoutName.replace(/\s+/g, '-').toLowerCase()}.png`;
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('[ShareCard] Save failed:', err);
            alert('Erro ao salvar imagem. Tente novamente.');
        } finally {
            setBusy(false);
        }
    }

    async function handleShare() {
        setBusy(true);
        try {
            const canvas = await generateShareCanvas({ workoutName, projectName, date, duration, photoUrl, userName });
            if (!canvas) throw new Error('canvas null');
            canvas.toBlob(async (blob) => {
                if (!blob) { setBusy(false); alert('Erro ao gerar imagem.'); return; }
                const file = new File([blob], 'vimu-treino.png', { type: 'image/png' });
                try {
                    if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: `Treino "${workoutName}" concluído! 💪`,
                            text: `Acabei de concluir meu treino "${workoutName}" no VIMU 🔥`,
                        });
                    } else {
                        handleSaveImage();
                    }
                } catch (err: any) {
                    if (err?.name !== 'AbortError') console.error('[ShareCard] Share error:', err);
                } finally {
                    setBusy(false);
                }
            }, 'image/png');
        } catch (err) {
            console.error('[ShareCard] Generate failed:', err);
            setBusy(false);
            alert('Erro ao gerar imagem. Tente novamente.');
        }
    }

    const completionPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 100;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
            {/* Scrollable preview card */}
            <div className="flex-1 overflow-y-auto flex items-start justify-center px-4 py-6">
                <div
                    className="relative w-full max-w-[420px] rounded-3xl overflow-hidden shadow-2xl"
                    style={{ minHeight: 500 }}
                >
                    {/* Background */}
                    {photoUrl ? (
                        <>
                            <img src={photoUrl} alt="Foto do treino" className="absolute inset-0 w-full h-full object-cover" crossOrigin="anonymous" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950" />
                    )}

                    {/* Content */}
                    <div className="relative z-10 flex flex-col p-6 pt-8" style={{ minHeight: 500 }}>
                        {/* Brand */}
                        <div className="flex items-center gap-2 mb-8">
                            <VimoLogo width={32} height={32} />
                            <span className="text-white/80 font-extrabold text-xs uppercase tracking-[0.2em]">VIMU</span>
                        </div>

                        {/* Workout info — pushed to bottom */}
                        <div className="flex-1 flex flex-col justify-end mt-32">
                            {userName && (
                                <p className="text-white/50 text-xs font-bold uppercase tracking-[0.15em] mb-2">{userName}</p>
                            )}
                            <h2 className="text-white font-black text-2xl leading-tight mb-1">{workoutName}</h2>
                            {projectName && <p className="text-white/40 text-sm font-bold mb-3">{projectName}</p>}
                            <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-5">{date}</p>

                            {/* Duration only */}
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-4 flex flex-col items-center mb-5 w-fit min-w-[140px]">
                                <span className="text-white/50 text-[9px] font-bold uppercase tracking-wider mb-1">Duração</span>
                                <span className="text-white font-black text-3xl">{duration}</span>
                            </div>

                            <div className="text-center text-3xl">💪🔥</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action buttons */}
            <div className="shrink-0 w-full max-w-[420px] mx-auto px-4 pb-6 pt-3 flex flex-col gap-3">
                {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                    <button
                        onClick={handleShare}
                        disabled={busy}
                        className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-white rounded-2xl font-extrabold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 active:scale-[0.98] disabled:opacity-70"
                    >
                        {busy ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                        {busy ? 'Gerando...' : 'Compartilhar nos Stories'}
                    </button>
                )}
                <button
                    onClick={handleSaveImage}
                    disabled={busy}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-extrabold text-sm hover:bg-white/20 transition-all active:scale-[0.98] backdrop-blur-sm disabled:opacity-70"
                >
                    {busy ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    {busy ? 'Gerando...' : 'Salvar Imagem'}
                </button>
                <button
                    onClick={onClose}
                    disabled={busy}
                    className="flex items-center justify-center gap-2 w-full py-3 text-white/60 font-bold text-sm hover:text-white transition-colors"
                >
                    <ArrowLeft size={16} /> Voltar ao App
                </button>
            </div>
        </div>
    );
}
