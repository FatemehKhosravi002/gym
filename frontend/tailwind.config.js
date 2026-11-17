/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sahel FD', 'Tahoma', 'sans-serif'],
      },
      colors: {
        // Brand green — 600 (#16A34A) is the brand token.
        // Solid fills use 700 so white text passes WCAG AA (5.3:1).
        primary: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },
        // Deep green for headings and navigation.
        ink: {
          900: '#0F1B12',
          800: '#1B2A20',
          700: '#2E4034',
          600: '#45564B',
          500: '#64756A',
          400: '#96A29A',
          300: '#C7D0C9',
        },
        // Warm neutrals.
        canvas: '#F7FAF5',
        surface: '#FFFFFF',
        'surface-2': '#F1F6EF',
        'surface-3': '#E7EFE3',
        border: '#E3EADF',
        'border-strong': '#CBD8C8',
        // Accent orange. Text on orange fills is ink-900 (6.2:1);
        // orange text on white must use accent-700 (#C2410C, 5.2:1).
        accent: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        success: { 50: '#ECFDF3', 100: '#D1FADF', 200: '#A6F4C5', 600: '#079455', 700: '#067647' },
        warning: { 50: '#FFFAEB', 100: '#FEF0C7', 200: '#FEDF89', 600: '#B54708', 700: '#93370D' },
        error: { 50: '#FEF3F2', 100: '#FEE4E2', 200: '#FECDCA', 600: '#D92D20', 700: '#B42318' },
      },
      borderRadius: {
        field: '16px',
        card: '24px',
        sheet: '28px',
        pill: '9999px',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 27, 18, 0.04), 0 8px 24px -12px rgba(15, 27, 18, 0.12)',
        lifted: '0 2px 4px rgba(15, 27, 18, 0.05), 0 18px 40px -18px rgba(15, 27, 18, 0.22)',
        glow: '0 10px 30px -12px rgba(22, 163, 74, 0.55)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '250ms',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        sheetUp: {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.45' } },
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
        'sheet-up': 'sheetUp 250ms cubic-bezier(0.22, 1, 0.36, 1)',
        'pulse-soft': 'pulseSoft 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

