/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#13ecec',
          '50': '#e6fffe',
          '100': '#ccfffd',
          '200': '#99fffb',
          '300': '#66fff9',
          '400': '#33fff7',
          '500': '#13ecec',
          '600': '#0fbcbc',
          '700': '#0c8d8d',
          '800': '#085e5e',
          '900': '#042f2f'
        },
        secondary: '#007BFF',
        'background-light': '#f6f8f8',
        'background-dark': '#102222',
        'card-dark': '#1a2e2e',
        'card-light': '#ffffff',
        'text-light-primary': '#1A202C',
        'text-light-secondary': '#4A5568',
        'text-dark-primary': '#E2E8F0',
        'text-dark-secondary': '#9db9b9',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'DEFAULT': '0.5rem',
        'lg': '1rem',
        'xl': '1.5rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
}

