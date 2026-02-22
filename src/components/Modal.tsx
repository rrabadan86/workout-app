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
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal animate-slide">
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="btn-icon" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    );
}
