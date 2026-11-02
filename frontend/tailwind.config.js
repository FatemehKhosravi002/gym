/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sahel FD', 'Tahoma', 'sans-serif'],
      },
      colors: {
        bg: '#0A0A0A',
        surface1: '#141716',
        surface2: '#1B1F1D',
        surface3: '#232826',
        accent: '#B6F500',
        'accent-text': '#0A0A0A',
        'text-primary': '#FFFFFF',
        'text-secondary': '#9AA3A0',
        primary: {
          50: '#f7ffe6',
          100: '#edffcc',
          200: '#dbff99',
          300: '#c6f135',
          400: '#b6f500',
          500: '#B6F500',
          600: '#9ad400',
          700: '#7aa800',
          800: '#5c7f00',
          900: '#3d5400',
        },
      },
      borderRadius: {
        'xl': '24px',
        '2xl': '28px',
        'pill': '9999px',
        'sheet': '32px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
