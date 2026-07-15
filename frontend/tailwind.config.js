/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F3F6FA',
        navy: '#131A33',
        indigo: { DEFAULT: '#3B4A8C', deep: '#2E3B72' },
        slate: { DEFAULT: '#5B6478', light: '#8890A0' },
        line: '#E4E8F0',
        lavender: '#EDEFFB',
        rose: { DEFAULT: '#F3E3E6', ink: '#B15C6E' },
        sage: { DEFAULT: '#E4F1E6', ink: '#4C8B5A' },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        xl2: '20px',
      },
    },
  },
  plugins: [],
}
