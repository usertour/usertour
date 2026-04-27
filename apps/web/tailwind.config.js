import { extendBase, extendSdk } from '@usertour-packages/tailwind';
import { deepmerge } from 'deepmerge-ts';

const extend = deepmerge(extendBase, extendSdk, {
  spacing: {
    // Theme builder needs sizes between Tailwind's 4px-step defaults.
    5.5: '22px',
    7.5: '30px',
    15: '60px',
  },
});

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@medusajs/ui-preset')],
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '../../packages/components/**/src/*.{js,ts,jsx,tsx}',
    '../../packages/shared/**/src/**/*.{js,ts,jsx,tsx}',
    '../../packages/shared/**/src/**/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
    },
    extend,
  },
  plugins: [require('tailwindcss-animate')],
};
