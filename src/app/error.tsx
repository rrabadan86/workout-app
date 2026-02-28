'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('[GlobalError]', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center flex flex-col items-center gap-6">
                <div className="size-16 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-xl font-extrabold font-inter text-slate-900 mb-2">Algo deu errado</h2>
                    <p className="text-sm text-slate-500 font-roboto">
                        Ocorreu um erro inesperado. Tente novamente ou recarregue a página.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <button
                        onClick={reset}
                        className="flex-1 py-3 bg-primary text-white rounded-xl font-bold font-montserrat hover:opacity-90 transition-opacity"
                    >
                        Tentar Novamente
                    </button>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold font-montserrat hover:bg-slate-200 transition-colors"
                    >
                        Ir para Login
                    </button>
                </div>
            </div>
        </div>
    );
}
