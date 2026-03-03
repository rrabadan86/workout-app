'use client';

import { useState, useEffect } from 'react';
import { Dumbbell, X, Play } from 'lucide-react';

interface ExerciseThumbnailProps {
    thumbnailUrl?: string | null;
    gifUrl?: string | null;
    name: string;
    /** px size of the thumbnail square */
    size?: number;
    /** border radius class — defaults to rounded-xl */
    rounded?: string;
    /** additional className */
    className?: string;
}

/**
 * Reusable exercise thumbnail that:
 * - Shows the thumbnail image (static) if available, otherwise a Dumbbell icon
 * - When clicked (and gifUrl exists), opens a lightweight modal with the animated GIF
 */
export default function ExerciseThumbnail({
    thumbnailUrl, gifUrl, name, size = 40, rounded = 'rounded-xl', className = ''
}: ExerciseThumbnailProps) {
    const [showGif, setShowGif] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [gifLoaded, setGifLoaded] = useState(false);
    const [useProxy, setUseProxy] = useState(false);
    const [useGifProxy, setUseGifProxy] = useState(false);

    const actualThumbUrl = (thumbnailUrl || gifUrl)?.trim();
    const actualGifUrl = gifUrl?.trim();

    // Reset error state if the URL changes
    useEffect(() => {
        setImgError(false);
        setUseProxy(false);
        setUseGifProxy(false);
    }, [actualThumbUrl]);

    const hasThumb = !!actualThumbUrl && !imgError;
    const hasGif = !!actualGifUrl;

    const getProxiedUrl = (url: string | null | undefined) => {
        if (!url) return '';
        if (url.includes('supabase.co')) return url;
        return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    };

    return (
        <>
            {/* Thumbnail / Placeholder */}
            <button
                type="button"
                onClick={(e) => { if (hasGif) { e.stopPropagation(); setShowGif(true); setGifLoaded(false); } }}
                className={`shrink-0 flex items-center justify-center overflow-hidden transition-all ${rounded} ${className} ${hasGif ? 'cursor-pointer hover:ring-2 hover:ring-primary/40 hover:scale-105 active:scale-95' : 'cursor-default'}`}
                style={{ width: size, height: size }}
                title={hasGif ? `Ver execução de ${name}` : name}
            >
                {hasThumb ? (
                    <img
                        src={useProxy ? getProxiedUrl(actualThumbUrl) : actualThumbUrl!}
                        alt={name}
                        width={size}
                        height={size}
                        loading="lazy"
                        className={`object-cover w-full h-full ${rounded}`}
                        onError={(e) => {
                            if (!useProxy && actualThumbUrl && !actualThumbUrl.includes('supabase.co')) {
                                setUseProxy(true); // Retry with proxy!
                            } else {
                                console.error('Thumbnail load error:', e);
                                setImgError(true);
                            }
                        }}
                    />
                ) : (
                    <div className={`w-full h-full bg-primary/10 text-primary flex items-center justify-center ${rounded}`}>
                        <Dumbbell size={size * 0.5} />
                    </div>
                )}

                {/* Play indicator overlay */}
                {hasGif && hasThumb && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors rounded-xl">
                        <Play size={size * 0.35} className="text-white opacity-0 group-hover:opacity-80 drop-shadow transition-opacity" fill="white" />
                    </div>
                )}
            </button>

            {/* GIF Viewer Modal */}
            {showGif && hasGif && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade"
                    onClick={() => setShowGif(false)}
                >
                    <div
                        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-[90vw] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h3 className="font-extrabold text-slate-900 text-sm truncate pr-4">{name}</h3>
                            <button
                                onClick={() => setShowGif(false)}
                                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* GIF container */}
                        <div className="relative bg-slate-50 flex items-center justify-center" style={{ minHeight: 280 }}>
                            {!gifLoaded && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                    <span className="ex-thumb-spinner" />
                                    <span className="text-xs text-slate-400 font-medium">Carregando...</span>
                                </div>
                            )}
                            <img
                                src={useGifProxy ? getProxiedUrl(actualGifUrl) : actualGifUrl!}
                                alt={`Execução de ${name}`}
                                className={`w-full max-h-[60vh] object-contain transition-opacity ${gifLoaded ? 'opacity-100' : 'opacity-0'}`}
                                onLoad={() => setGifLoaded(true)}
                                onError={(e) => {
                                    if (!useGifProxy && actualGifUrl && !actualGifUrl.includes('supabase.co')) {
                                        setUseGifProxy(true); // Retry with proxy!
                                    } else {
                                        console.error('GIF load error:', e);
                                        setGifLoaded(true);
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Spinner CSS */}
                    <style>{`
                        @keyframes ex-thumb-spin { to { transform: rotate(360deg); } }
                        .ex-thumb-spinner {
                            display: inline-block; width: 28px; height: 28px;
                            border: 3px solid #E2E8F0;
                            border-top-color: #3B82F6;
                            border-radius: 50%;
                            animation: ex-thumb-spin 0.7s linear infinite;
                        }
                        @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
                        .animate-fade { animation: fade 0.2s ease-out; }
                    `}</style>
                </div>
            )}
        </>
    );
}
