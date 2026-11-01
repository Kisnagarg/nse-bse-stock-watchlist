'use client';

import React from 'react';
import { Undo2, X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  onUndo?: () => void;
  duration?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg shadow-xl border text-sm transition-all duration-200 animate-in slide-in-from-bottom-5 ${
            toast.type === 'success'
              ? 'bg-[#1e222d] border-[#089981]/50 text-[#d1d4dc]'
              : toast.type === 'error'
              ? 'bg-[#1e222d] border-[#f23645]/50 text-[#d1d4dc]'
              : 'bg-[#1e222d] border-[#2962ff]/50 text-[#d1d4dc]'
          }`}
        >
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#089981] shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-[#f23645] shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-[#2962ff] shrink-0" />}
            <span className="truncate">{toast.message}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {toast.onUndo && (
              <button
                onClick={() => {
                  toast.onUndo?.();
                  onDismiss(toast.id);
                }}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#2962ff] hover:bg-[#1e53e5] text-white rounded transition"
              >
                <Undo2 className="w-3 h-3" />
                Undo
              </button>
            )}
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 text-[#787b86] hover:text-[#d1d4dc] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

