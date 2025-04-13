

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3f51b5',
          light: '#7986cb',
          dark: '#303f9f'
        },
        secondary: {
          DEFAULT: '#f50057',
          light: '#ff4081',
          dark: '#c51162'
        },
      },
      boxShadow: {
        card: '0 2px 10px 0 rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 20px 0 rgba(0, 0, 0, 0.15)',
      }
    },
  },
  plugins: [],
}