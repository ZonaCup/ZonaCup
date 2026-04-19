/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: '#070a0d',
          dark: '#0c1017',
          card: '#111820',
          hover: '#161e28',
        },
        fire: {
          core: '#ff6a00',
          mid: '#e24b0f',
          deep: '#c23a0a',
          glow: '#ff8c33',
        },
        ember: '#ff4500',
        gold: { DEFAULT: '#f5a623', light: '#ffd700' },
        ash: '#8a8478',
        smoke: '#a09a8f',
        bone: '#e8e2d6',
        ivory: '#f5f0e8',
        discord: '#5865f2',
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        heading: ['Bebas Neue', 'sans-serif'],
        body: ['Rajdhani', 'sans-serif'],
      },
      animation: {
        'pulse-dot': 'pulse-dot 2s infinite',
        'fade-up': 'fade-up 0.6s ease forwards',
        'float-up': 'float-up 4s infinite',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'float-up': {
          '0%': { opacity: '0', transform: 'translateY(100vh) scale(1)' },
          '20%': { opacity: '0.6' },
          '80%': { opacity: '0.3' },
          '100%': { opacity: '0', transform: 'translateY(-100px) scale(0)' },
        },
      },
    },
  },
  plugins: [],
};
