'use client';

import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface ModalProps {
    title: string;
    onClose: () => void;
    children: ReactNode;
    footer?: ReactNode;
}

export default function Modal({ title, onClose, children, footer }: ModalProps) {
    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center px-6 md:px-8 py-5 border-b border-slate-100 shrink-0">
                    <h2 className="text-xl font-bold font-inter text-slate-900">{title}</h2>
                    <button className="p-2 -mr-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="px-6 md:px-8 py-6 overflow-y-auto w-full">
                    {children}
                </div>
                {footer && <div className="px-6 md:px-8 pb-6 shrink-0">{footer}</div>}
            </div>
        </div>
    );
}
