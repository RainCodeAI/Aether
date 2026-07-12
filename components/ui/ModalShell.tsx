// components/ui/ModalShell.tsx
// Shared portal + scrollable overlay so tall modals are never clipped at the top.
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  /** Accessible name for the dialog */
  label: string;
  children: ReactNode;
  /** Max width class, e.g. max-w-md / max-w-lg (default max-w-md) */
  maxWidthClass?: string;
  /** Max height of the panel (default min(90dvh, 720px)) */
  maxHeightClass?: string;
  /** z-index class (default z-[80]) */
  zClass?: string;
  /** Extra classes on the glass panel */
  panelClassName?: string;
}

/**
 * Full-screen modal host:
 * - portals to document.body (escapes overflow/transform ancestors)
 * - outer overlay scrolls if needed
 * - panel uses max-height; put overflow-y-auto on the body region of children
 */
export default function ModalShell({
  isOpen,
  onClose,
  label,
  children,
  maxWidthClass = 'max-w-md',
  maxHeightClass = 'max-h-[min(90dvh,720px)]',
  zClass = 'z-[80]',
  panelClassName = '',
}: ModalShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 ${zClass} overflow-y-auto overscroll-contain`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="relative min-h-full flex items-start sm:items-center justify-center p-4 sm:p-6">
        <div
          className={`glass relative w-full ${maxWidthClass} ${maxHeightClass} rounded-3xl shadow-2xl border border-slate-700/60 flex flex-col my-4 sm:my-0 ${panelClassName}`}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
