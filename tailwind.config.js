/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}"],
  theme: {
    extend: {},
    colors: {
      transparent: 'transparent',
      'header-bg': '#FFEOBF',
      'green': '#D2EF9A',
      'black': '#1F1F1F',
      'primary':'#984d00',
      'secondary': '#FFE0BF',
      'button': '#C76400',
      'card': '#FFBE7F',
      'white': '#ffffff',
      'surface': '#FFE0BF',
      'red': '#DB4444',
      'purple': '#8684D4',
      'success': '#3DAB25',
      'yellow': '#ECB018',
      'pink': '#F4407D',
      'line': '#E9E9E9',

      'heading':'#FFE0BF',
      'primary-bg': '#3DAB25',
      'secondary-bg': '#FFBE7F',


      'outline': 'rgba(0, 0, 0, 0.15)',
      'surface2': 'rgba(255, 255, 255, 0.2)',
      'surface1': 'rgba(255, 255, 255, 0.1)',
    },
  },
  plugins: [],
}