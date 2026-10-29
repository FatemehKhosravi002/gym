/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'Tahoma', 'Arial', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
        },
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
}
