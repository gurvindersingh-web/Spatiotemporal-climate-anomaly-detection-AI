/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          900: '#020412',
          800: '#070B1A',
          700: '#120B2E',
        },
        neon: {
          cyan: '#00f3ff',
          purple: '#bc13fe',
          blue: '#2563EB',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Orbitron', 'sans-serif'],
      }
    },
  },
  corePlugins: {
    preflight: false, // Disable preflight so it doesn't mess up existing custom CSS
  },
  plugins: [],
}
