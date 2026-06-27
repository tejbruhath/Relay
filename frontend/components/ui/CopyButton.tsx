'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

interface CopyButtonProps {
  value: string
  label?: string
  className?: string
}

export function CopyButton({ value, label = 'Copy', className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const { addToast } = useToast()

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      addToast('Copied to clipboard!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      addToast('Failed to copy', 'error')
    }
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : label}
      aria-label={copied ? 'Copied!' : label}
      className={[
        'inline-flex items-center gap-1.5 px-3 h-8 rounded-[6px] text-[12px] font-medium',
        'border border-[var(--bg-border)] bg-[var(--bg-surface)]',
        'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
        'hover:border-[rgba(255,69,0,0.3)] transition-all duration-150',
        className,
      ].join(' ')}
    >
      {copied ? (
        <Check size={13} className="text-[var(--success)]" />
      ) : (
        <Copy size={13} />
      )}
      {copied ? 'Copied!' : label}
    </button>
  )
}
