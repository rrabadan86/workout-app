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
        const t = setTimeout(onDone, 3000);
        return () => clearTimeout(t);
    }, [onDone]);

    return (
        <div className={`toast toast-${type}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {type === 'success' ? <CheckCircle size={18} color="var(--success)" /> : <XCircle size={18} color="var(--danger)" />}
            {message}
        </div>
    );
}
