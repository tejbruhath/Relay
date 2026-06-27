'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { useToast, Toast as ToastItem, ToastVariant } from '@/hooks/useToast'

const variantConfig: Record<
  ToastVariant,
  { icon: React.ReactNode; border: string; iconColor: string }
> = {
  success: {
    icon: <CheckCircle size={16} />,
    border: 'border-l-[var(--success)]',
    iconColor: 'text-[var(--success)]',
  },
  error: {
    icon: <XCircle size={16} />,
    border: 'border-l-[var(--error)]',
    iconColor: 'text-[var(--error)]',
  },
  info: {
    icon: <Info size={16} />,
    border: 'border-l-[var(--accent-blue)]',
    iconColor: 'text-[var(--accent-blue)]',
  },
}

function ToastItem_({ toast }: { toast: ToastItem }) {
  const { removeToast } = useToast()
  const [exiting, setExiting] = useState(false)
  const cfg = variantConfig[toast.variant]

  function handleClose() {
    setExiting(true)
    setTimeout(() => removeToast(toast.id), 300)
  }

  return (
    <div
      role="alert"
      className={[
        'flex items-start gap-3 px-4 py-3 rounded-[8px]',
        'bg-[var(--bg-surface)] border border-[var(--bg-border)] border-l-4',
        cfg.border,
        'shadow-xl min-w-[280px] max-w-sm',
        exiting
          ? 'animate-[toastOut_300ms_ease-in_forwards]'
          : 'animate-[toastSlide_300ms_ease-out_forwards]',
      ].join(' ')}
    >
      <span className={`mt-0.5 shrink-0 ${cfg.iconColor}`}>{cfg.icon}</span>
      <p className="flex-1 text-[13px] text-[var(--text-primary)] leading-relaxed">
        {toast.message}
      </p>
      <button
        onClick={handleClose}
        className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const { toasts } = useToast()

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem_ toast={t} />
        </div>
      ))}
    </div>
  )
}
