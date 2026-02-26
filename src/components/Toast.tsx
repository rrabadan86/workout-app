'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface ToastProps {
    message: string;
    type?: 'success' | 'error';
    onDone: () => void;
}

export default function Toast({ message, type = 'success', onDone }: ToastProps) {
    useEffect(() => {
        const t = setTimeout(onDone, 2000);
        return () => clearTimeout(t);
    }, [onDone]);

    return (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl z-[100] transition-all animate-in fade-in slide-in-from-bottom-8 ${type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-500 text-white'}`}>
            {type === 'success' ? <CheckCircle size={20} className="text-emerald-400" /> : <XCircle size={20} className="text-white" />}
            <span className="font-roboto font-bold text-sm">{message}</span>
        </div>
    );
}
