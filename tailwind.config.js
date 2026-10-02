/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        ink: { DEFAULT: '#0f1b2d', soft: '#3d4a5c', mute: '#6b7788', faint: '#9aa5b4' },
        line: '#e4eaf2',
        canvas: '#f4f7fb',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        accent2: 'rgb(var(--accent2) / <alpha-value>)',
        accentdeep: 'rgb(var(--accent-deep) / <alpha-value>)',
        good: '#0e9f6e',
        warn: '#d97706',
        bad: '#e11d48',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,27,45,.04), 0 8px 24px -12px rgba(15,27,45,.12)',
        lift: '0 2px 4px rgba(15,27,45,.05), 0 18px 40px -16px rgba(15,27,45,.22)',
        glow: '0 10px 30px -10px rgb(var(--accent) / .55)',
      },
      borderRadius: { xl2: '1.25rem' },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        'scale-in': { '0%': { opacity: 0, transform: 'scale(.96)' }, '100%': { opacity: 1, transform: 'none' } },
        'sheet-up': { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'none' } },
        'slide-in': { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'none' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
      animation: {
        'fade-up': 'fade-up .45s cubic-bezier(.2,.7,.2,1) both',
        'scale-in': 'scale-in .2s ease-out both',
        'sheet-up': 'sheet-up .28s cubic-bezier(.2,.8,.2,1) both',
        'slide-in': 'slide-in .3s cubic-bezier(.2,.8,.2,1) both',
        shimmer: 'shimmer 3s linear infinite',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
