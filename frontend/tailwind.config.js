/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#005EB8',
          foreground: '#FFFFFF'
        },
        secondary: {
          DEFAULT: '#327BBD',
          foreground: '#FFFFFF'
        },
        accent: {
          DEFAULT: '#0F172A',
          foreground: '#FFFFFF'
        },
        background: '#F8FAFC',
        foreground: '#0F172A',
        border: '#E2E8F0',
        input: '#E2E8F0',
        ring: '#005EB8',
        muted: {
          DEFAULT: '#F1F5F9',
          foreground: '#64748B'
        },
        destructive: {
          DEFAULT: '#EF4444',
          foreground: '#FFFFFF'
        },
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#0F172A'
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#0F172A'
        }
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem'
      },
      fontFamily: {
        sans: ['Public Sans', 'sans-serif'],
        heading: ['Manrope', 'sans-serif']
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
}