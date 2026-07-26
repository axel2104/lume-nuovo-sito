/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        surface: '#111111',
        card: '#161616',
        line: '#262626',
        brand: { DEFAULT: '#C40042', dark: '#D7272A' },
        cream: '#F5F3EA',
        ink: '#f4f4f4',
        mut: '#9a9a9a',
      },
      fontFamily: {
        display: ['Anton', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: { site: '1600px' },
    },
  },
  plugins: [],
};
