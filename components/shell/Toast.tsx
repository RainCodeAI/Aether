// components/shell/Toast.tsx
'use client';

import { CheckCircle2, XCircle, X } from 'lucide-react';

export interface ToastState {
  type: 'success' | 'error';
  title: string;
  message: string;
}

export default function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  const isSuccess = toast.type === 'success';
  return (
    <div
      className={`fixed top-6 right-6 z-[100] flex items-start gap-3 rounded-2xl p-4 max-w-sm shadow-2xl border backdrop-blur-sm aether-toast ${
        isSuccess
          ? 'bg-emerald-950/95 border-emerald-500/30'
          : 'bg-rose-950/95 border-rose-500/30'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
          isSuccess ? 'bg-emerald-500/20' : 'bg-rose-500/20'
        }`}
      >
        {isSuccess
          ? <CheckCircle2 size={16} className="text-emerald-400" />
          : <XCircle size={16} className="text-rose-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${isSuccess ? 'text-emerald-300' : 'text-rose-300'}`}>
          {toast.title}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{toast.message}</p>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 p-0.5 text-slate-500 hover:text-slate-200 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}
