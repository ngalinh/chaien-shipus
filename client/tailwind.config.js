/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '2xs':        ['11px', { lineHeight: '16px' }],
        'micro':      ['13px', { lineHeight: '18px' }],
        'body-md':    ['15px', { lineHeight: '22px' }],
        'nav':        ['15px', { lineHeight: '20px' }],
        'section':    ['17px', { lineHeight: '24px' }],
        'wordmark':   ['19px', { lineHeight: '24px' }],
        'display-sm': ['20px', { lineHeight: '28px' }],
        'display-md': ['26px', { lineHeight: '32px' }],
        'page':       ['28px', { lineHeight: '36px' }],
        'display-lg': ['36px', { lineHeight: '44px' }],
      },
      colors: {
        // Brand — ShipUS cyan
        primary: {
          50:  '#ECF7FB',
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
        // Semantic — danger (red)
        danger: {
          50:  '#FDF2F1',
          100: '#F8E1E0',
          200: '#F0BCBA',
          500: '#D95550',
          600: '#C2453F',
          700: '#A03530',
        },
        // Semantic — success (green)
        success: {
          50:  '#EDF9F2',
          100: '#DCF3E7',
          200: '#B8E8CE',
          500: '#38A169',
          700: '#2F855A',
        },
        // Semantic — warning / warm accent
        warning: {
          50:  '#FFF8EE',
          100: '#FBE9D7',
          200: '#F5D0A4',
          500: '#D97706',
          700: '#B4691E',
        },
        // Neutrals — cool light grey canvas
        greige: {
          50:  '#F4F6F7',
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
        tile:  '16px',
        card:  '22px',
        frame: '28px',
      },
      boxShadow: {
        card:   '0 8px 24px -12px rgba(40, 44, 32, 0.14)',
        raised: '0 12px 32px -10px rgba(40, 44, 32, 0.20)',
        pill:   '0 4px 12px -4px rgba(40, 44, 32, 0.16)',
      },
    },
  },
  plugins: [],
};
