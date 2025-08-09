/** @type {import('tailwindcss').Config} */
module.exports = {
  // `darkMode: 'class'` ile HTML etiketine `dark` sınıfı eklendiğinde dark modu etkinleştirir.
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};