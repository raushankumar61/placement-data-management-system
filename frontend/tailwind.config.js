/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          electric: '#00A3FF',
          dark: '#0077CC',
          glow: '#00C6FF',
        },
        gold: {
          DEFAULT: '#F5A623',
          light: '#FFD166',
          dark: '#C47D0E',
        },
        dark: {
          900: '#050811',
          800: '#080D1A',
          700: '#0D1425',
          600: '#131C33',
          500: '#1A2540',
          400: '#243050',
        },
        glass: {
          DEFAULT: 'rgba(255,255,255,0.05)',
          border: 'rgba(255,255,255,0.1)',
        }
      },
      fontFamily: {
        heading: ['Syne', 'system-ui', 'sans-serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s ease-in-out infinite',
        'spin-slow': 'spin 20s linear infinite',
        'counter': 'counter 2s ease-out',
      },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundImage: {
        'mesh-gradient': 'radial-gradient(at 40% 20%, #00A3FF22 0px, transparent 50%), radial-gradient(at 80% 0%, #F5A62322 0px, transparent 50%), radial-gradient(at 0% 50%, #00A3FF11 0px, transparent 50%)',
      },
      boxShadow: {
        'glow-blue': '0 0 30px rgba(0,163,255,0.3)',
        'glow-gold': '0 0 30px rgba(245,166,35,0.3)',
        'glass': '0 8px 32px rgba(0,0,0,0.4)',
      }
    },
  },
  plugins: [],
}
