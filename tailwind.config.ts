import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B3A6B',
          50:  '#E8EEF7',
          100: '#C5D3E8',
          500: '#2E86AB',
          600: '#1B3A6B',
          700: '#142D52',
        },
        accent: '#2E86AB',
      },
      fontFamily: {
        arabic: ['IBM Plex Sans Arabic', 'Noto Sans Arabic', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
