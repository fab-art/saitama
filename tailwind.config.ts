import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: {
          50: '#f0f0f5',
          100: '#e0e0eb',
          200: '#b8b8d0',
          300: '#8080a8',
          400: '#555575',
          500: '#353550',
          600: '#252538',
          700: '#1a1a27',
          800: '#12121a',
          900: '#0a0a0f',
          950: '#05050a',
        },
        accent: {
          DEFAULT: '#00d4ff',
          glow: '#0af5ff',
          muted: '#0080a0',
        },
        xp: {
          DEFAULT: '#ffd700',
          glow: '#ffed4a',
          muted: '#a08000',
        },
        rank: {
          civilian: '#6b7280',
          trainee: '#10b981',
          fighter: '#3b82f6',
          hunter: '#8b5cf6',
          elite: '#f59e0b',
          candidate: '#ef4444',
          hero: '#ec4899',
          caped: '#e2e8f0',
        },
      },
      boxShadow: {
        'glow-accent': '0 0 20px rgba(0, 212, 255, 0.4)',
        'glow-xp': '0 0 20px rgba(255, 215, 0, 0.4)',
        'glow-sm': '0 0 8px rgba(0, 212, 255, 0.25)',
      },
    },
  },
  plugins: [],
} satisfies Config
