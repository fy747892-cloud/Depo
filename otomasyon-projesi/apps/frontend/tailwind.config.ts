import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: '#2563eb', foreground: '#ffffff' },
        accent: { DEFAULT: '#38bdf8', foreground: '#0f172a' },
        muted: { DEFAULT: '#f4f4f5', foreground: '#52525b' }
      }
    }
  },
  plugins: []
};

export default config;
