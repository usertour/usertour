import { extendSdk } from '@usertour-packages/tailwind';

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/components/**/src/*.{js,ts,jsx,tsx}',
    '../../packages/shared/**/src/**/*.{js,ts,jsx,tsx}',
    '../../packages/shared/**/src/**/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: extendSdk,
  },
  plugins: [require('tailwindcss-animate')],
};
