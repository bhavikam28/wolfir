/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium palette
        wiz: {
          50: '#f0f4ff',
          100: '#dbe4ff',
          200: '#bac8ff',
          300: '#91a7ff',
          400: '#748ffc',
          500: '#5c7cfa',
          600: '#4c6ef5',
          700: '#4263eb',
          800: '#3b5bdb',
          900: '#364fc7',
          950: '#1a1b3a',
        },
        // Dark surface colors
        surface: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#0a0e1a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 15px -3px rgba(99, 102, 241, 0.25)',
        'glow-md': '0 0 30px -5px rgba(99, 102, 241, 0.3)',
        'glow-lg': '0 0 60px -10px rgba(99, 102, 241, 0.3)',
        'glow-blue': '0 0 30px -5px rgba(59, 130, 246, 0.3)',
        'glow-purple': '0 0 30px -5px rgba(139, 92, 246, 0.3)',
        'glow-red': '0 0 30px -5px rgba(239, 68, 68, 0.3)',
        'glow-orange': '0 0 30px -5px rgba(249, 115, 22, 0.3)',
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 20px 40px -12px rgba(0,0,0,0.1)',
        'elevated': '0 10px 40px -10px rgba(0,0,0,0.08), 0 2px 8px -2px rgba(0,0,0,0.04)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.1)',
        'node': '0 4px 20px -4px rgba(0,0,0,0.15)',
        'node-hover': '0 8px 30px -4px rgba(0,0,0,0.2)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-up': 'slide-up 0.5s ease-out',
        'fade-in': 'fade-in 0.5s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'flow': 'flow 2s linear infinite',
        'flow-reverse': 'flow-reverse 2s linear infinite',
        'particle': 'particle 3s linear infinite',
        'dash-flow': 'dash-flow 1.5s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'gradient-shift': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        flow: {
          '0%': { 'stroke-dashoffset': '24' },
          '100%': { 'stroke-dashoffset': '0' },
        },
        'flow-reverse': {
          '0%': { 'stroke-dashoffset': '0' },
          '100%': { 'stroke-dashoffset': '24' },
        },
        particle: {
          '0%': { offsetDistance: '0%', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { offsetDistance: '100%', opacity: '0' },
        },
        'dash-flow': {
          '0%': { 'stroke-dashoffset': '0' },
          '100%': { 'stroke-dashoffset': '-24' },
        },
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
}
