/** Colours are CSS variables (src/design-system/tokens.css) so light/dark and per-product accents switch without new classes. */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: v('canvas'),
        surface: { DEFAULT: v('surface'), 2: v('surface-2'), 3: v('surface-3') },
        line: { DEFAULT: v('line'), strong: v('line-strong') },
        ink: { DEFAULT: v('ink'), 2: v('ink-2'), muted: v('muted'), faint: v('faint') },
        brand: { DEFAULT: v('brand'), ink: v('brand-ink') },
        accent: { DEFAULT: v('accent'), 2: v('accent-2') },
        success: v('success'),
        warning: v('warning'),
        danger: v('danger'),
        info: v('info'),
        navy: v('navy'),
        night: v('night'),
        product: {
          agentflow: v('p-agentflow'),
          dialflow: v('p-dialflow'),
          businesspulse: v('p-businesspulse'),
          ultrachat: v('p-ultrachat'),
          insights: v('p-insights'),
          commons: v('p-commons'),
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: { xl: '14px', '2xl': '18px', '3xl': '24px' },
      boxShadow: {
        card: '0 1px 2px rgb(11 16 32 / .04), 0 8px 24px -16px rgb(11 16 32 / .16)',
        pop: '0 1px 2px rgb(11 16 32 / .05), 0 24px 48px -20px rgb(11 16 32 / .35)',
        glow: '0 10px 24px -10px rgb(var(--brand) / .6)',
      },
      fontSize: { '2xs': ['11px', '16px'] },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'rise': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        'pulse-dot': { '0%,100%': { opacity: 1 }, '50%': { opacity: .35 } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        bar: { '0%,100%': { transform: 'scaleY(.3)' }, '50%': { transform: 'scaleY(1)' } },
      },
      animation: {
        'fade-in': 'fade-in .18s ease',
        rise: 'rise .22s ease both',
        'slide-in': 'slide-in .24s cubic-bezier(.2,.8,.2,1)',
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
        shimmer: 'shimmer 1.4s infinite',
        bar: 'bar 1.1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
