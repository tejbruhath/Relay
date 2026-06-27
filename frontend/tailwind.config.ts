import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-base': 'var(--bg-base)',
        'bg-surface': 'var(--bg-surface)',
        'bg-border': 'var(--bg-border)',
        'accent-signal': 'var(--accent-signal)',
        'accent-glow': 'var(--accent-glow)',
        'accent-blue': 'var(--accent-blue)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      fontSize: {
        xs: '10px',
        sm: '13px',
        base: '16px',
        lg: '26px',
        xl: '42px',
        '2xl': '68px',
        '3xl': '110px',
      },
      spacing: {
        '18': '72px',
        '22': '88px',
      },
      borderRadius: {
        card: '12px',
      },
      animation: {
        'fade-up': 'fadeUp 200ms ease-out forwards',
        'slide-in': 'slideIn 300ms ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
