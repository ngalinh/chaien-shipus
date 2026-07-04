/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Brand — ShipUS cyan (Verdant redesign)
        primary: {
          50: '#ECF7FB',
          100: '#D6EEF5',
          200: '#ABDCEA',
          300: '#7FCBE3',
          400: '#5EBEDC',
          500: '#3AAFD3',
          600: '#2A9ABE',
          700: '#21809E',
          800: '#1A6580',
          900: '#16506A',
          950: '#0E3547',
        },
        // Neutrals — cool light grey canvas
        greige: {
          50: '#F4F6F7',
          100: '#EAEDEF',
          200: '#E9ECEE',
          300: '#D4DADE',
        },
        // Ink — cool navy near-blacks
        ink: {
          300: '#C2CACF',
          400: '#93A0A8',
          500: '#586A74',
          700: '#2E404A',
          900: '#16242C',
        },
        // Soft cyan icon-chip surface
        sand: {
          100: '#DEF2F9',
          200: '#C3E7F2',
        },
      },
      borderRadius: {
        tile: '16px',
        card: '22px',
        frame: '28px',
      },
      boxShadow: {
        card: '0 8px 24px -12px rgba(40, 44, 32, 0.14)',
        raised: '0 12px 32px -10px rgba(40, 44, 32, 0.20)',
        pill: '0 4px 12px -4px rgba(40, 44, 32, 0.16)',
      },
    },
  },
  plugins: [],
};
