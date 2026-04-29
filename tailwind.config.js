/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-green': '#34d399',
        'neon-lime': '#a3e635',
        'brand-primary': '#059669',
        'brand-primary-dark': '#064e3b',
        'brand-accent': '#f59e0b',
        'brand-accent-dark': '#d97706',
      },
      boxShadow: {
        'neon-glow': '0 0 20px rgba(52, 211, 153, 0.45)',
        'neon-border': '0 0 0 1px rgba(52, 211, 153, 0.4)',
      }
    },
  },
  plugins: [],
}
