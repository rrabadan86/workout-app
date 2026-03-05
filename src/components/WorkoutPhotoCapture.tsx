'use client';

import { useState, useRef } from 'react';
import { Camera, ImagePlus, X, RotateCcw } from 'lucide-react';

interface WorkoutPhotoCaptureProps {
    photo: File | null;
    onPhotoChange: (file: File | null) => void;
}

const MAX_SIZE_MB = 5;
const MAX_WIDTH = 1200;
const QUALITY = 0.8;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob) { reject(new Error('Falha ao comprimir imagem')); return; }

                    if (blob.size > MAX_SIZE_MB * 1024 * 1024) {
                        reject(new Error(`Imagem muito grande (${(blob.size / 1024 / 1024).toFixed(1)}MB). Máximo: ${MAX_SIZE_MB}MB.`));
                        return;
                    }

                    const compressed = new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' });
                    resolve(compressed);
                },
                'image/webp',
                QUALITY
            );
        };
        img.onerror = () => reject(new Error('Falha ao carregar imagem'));
        img.src = URL.createObjectURL(file);
    });
}

export default function WorkoutPhotoCapture({ photo, onPhotoChange }: WorkoutPhotoCaptureProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [compressing, setCompressing] = useState(false);
    const cameraRef = useRef<HTMLInputElement>(null);
    const galleryRef = useRef<HTMLInputElement>(null);

    async function handleFile(file: File | undefined) {
        if (!file) return;
        setError(null);

        if (!ACCEPTED_TYPES.includes(file.type)) {
            setError('Formato inválido. Use JPEG, PNG ou WebP.');
            return;
        }

        setCompressing(true);
        try {
            const compressed = await compressImage(file);
            const url = URL.createObjectURL(compressed);
            setPreview(url);
            onPhotoChange(compressed);
        } catch (err: any) {
            setError(err.message || 'Erro ao processar imagem.');
        } finally {
            setCompressing(false);
        }
    }

    function handleRemove() {
        setPreview(null);
        setError(null);
        onPhotoChange(null);
        if (cameraRef.current) cameraRef.current.value = '';
        if (galleryRef.current) galleryRef.current.value = '';
    }

    if (preview && photo) {
        return (
            <div className="relative group">
                <div className="relative w-full h-48 rounded-2xl overflow-hidden border-2 border-dashed border-primary/30 bg-primary/5">
                    <img src={preview} alt="Preview do treino" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                        <button
                            type="button"
                            onClick={() => { handleRemove(); galleryRef.current?.click(); }}
                            className="p-2.5 bg-white/90 backdrop-blur-sm rounded-xl text-slate-700 hover:bg-white transition-all shadow-lg"
                            title="Trocar foto"
                        >
                            <RotateCcw size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="p-2.5 bg-white/90 backdrop-blur-sm rounded-xl text-rose-500 hover:bg-white transition-all shadow-lg"
                            title="Remover foto"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-2 text-center">
                    ✓ Foto pronta para compartilhar
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                📸 Foto do Treino <span className="text-slate-300 font-bold normal-case">(opcional)</span>
            </p>

            {compressing && (
                <div className="flex items-center justify-center py-8 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3 text-sm text-slate-500 font-bold">
                        <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Processando imagem...
                    </div>
                </div>
            )}

            {!compressing && (
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => cameraRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-2 py-6 bg-slate-50 hover:bg-primary/5 border-2 border-dashed border-slate-200 hover:border-primary/30 rounded-2xl transition-all group"
                    >
                        <Camera size={24} className="text-slate-400 group-hover:text-primary transition-colors" />
                        <span className="text-xs font-bold text-slate-500 group-hover:text-primary transition-colors">Câmera</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => galleryRef.current?.click()}
                        className="flex flex-col items-center justify-center gap-2 py-6 bg-slate-50 hover:bg-primary/5 border-2 border-dashed border-slate-200 hover:border-primary/30 rounded-2xl transition-all group"
                    >
                        <ImagePlus size={24} className="text-slate-400 group-hover:text-primary transition-colors" />
                        <span className="text-xs font-bold text-slate-500 group-hover:text-primary transition-colors">Galeria</span>
                    </button>
                </div>
            )}

            {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 text-xs font-bold text-rose-600">
                    ⚠️ {error}
                </div>
            )}

            <input
                ref={cameraRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <input
                ref={galleryRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
            />
        </div>
    );
}
