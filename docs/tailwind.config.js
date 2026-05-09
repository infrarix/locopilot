/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}', './docs/**/*.{md,mdx}'],
  // Disable preflight so Infima (Docusaurus default theme) keeps owning
  // the doc-page resets. Tailwind utilities still work inside our
  // marketing components.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#8B5CF6',
          violet: '#A78BFA',
          deep: '#6D28D9',
          indigo: '#4F46E5',
          blue: '#3B82F6',
          sky: '#60A5FA',
          cyan: '#22D3EE',
          dark: '#0B0D17',
          card: '#14172A',
          border: '#1F2237',
          muted: '#8B92AB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'hero-glow': 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(139,92,246,0.18), transparent)',
        'card-glow': 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(59,130,246,0.10), transparent)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
