import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './types.ts'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0284c7',
          dark: '#0c4a6e'
        }
      },
      animation: {
        growPulse: 'growPulse 1.3s ease-in-out infinite'
      },
      keyframes: {
        growPulse: {
          '0%': { transform: 'scale(0.9)', opacity: '0.6' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
          '100%': { transform: 'scale(0.9)', opacity: '0.6' }
        }
      }
    }
  },
  plugins: []
};

export default config;
