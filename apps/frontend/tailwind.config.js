/* eslint-disable @typescript-eslint/no-require-imports */
const { fontFamily, screens } = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  corePlugins: {
    preflight: false,
  },
  content: [`**/*.{js,ts,jsx,tsx}`],
  theme: {
    extend: {
      screens: {
        xs: { min: '100px', max: '767px' },
        ...screens,
      },
      fontFamily: {
        sans: ['IBM Plex Sans Thai', ...fontFamily.sans],
        loop: ['IBM Plex Sans Thai Looped', ...fontFamily.sans],
      },
      fontSize: {
        base: [
          '18px',
          {
            lineHeight: '26px',
            fontWeight: '600',
          },
        ],
        'd3-semi-bold': [
          '40px',
          {
            lineHeight: '60px',
            fontWeight: '600',
          },
        ],
        'd4-semi-bold': [
          '32px',
          {
            lineHeight: '48px',
            fontWeight: '600',
          },
        ],
        'd5-semi-bold': [
          '24px',
          {
            lineHeight: '36px',
            fontWeight: '600',
          },
        ],
        'd6-semi-bold': [
          '18px',
          {
            lineHeight: '26px',
            fontWeight: '600',
          },
        ],
        'd7-regular': [
          '14px',
          {
            lineHeight: '22px',
          },
        ],
        'd7-semi-bold': [
          '14px',
          {
            lineHeight: '22px',
            fontWeight: '600',
          },
        ],
        'h2-regular': [
          '14px',
          {
            lineHeight: '16px',
            fontWeight: '400',
          },
        ],
        'h2-bold': [
          '32px',
          {
            lineHeight: '48px',
            fontWeight: '700',
          },
        ],
        'h4-bold': [
          '24px',
          {
            lineHeight: '36px',
            fontWeight: '700',
          },
        ],
        'h6-semi-bold': [
          '18px',
          {
            lineHeight: '26px',
            fontWeight: '700',
          },
        ],
        't2-semi-bold': [
          '22px',
          {
            lineHeight: '32px',
            fontWeight: '600',
          },
        ],
        't3-semi-bold': [
          '20px',
          {
            lineHeight: '30px',
            fontWeight: '600',
          },
        ],
        't4-semi-bold': [
          '18px',
          {
            lineHeight: '28px',
            fontWeight: '600',
          },
        ],
        't5-semi-bold': [
          '16px',
          {
            lineHeight: '24px',
            fontWeight: '600',
          },
        ],
        'b4-regular': [
          '16px',
          {
            lineHeight: '24px',
            fontWeight: '400',
          },
        ],
        'bh4-semi-bold': [
          '16px',
          {
            lineHeight: '24px',
            fontWeight: '600',
          },
        ],
        'b5-regular': [
          '14px',
          {
            lineHeight: '22px',
            fontWeight: '400',
          },
        ],
        'bh5-semi-bold': [
          '14px',
          {
            lineHeight: '22px',
            fontWeight: '600',
          },
        ],
        'b6-regular': [
          '12px',
          {
            lineHeight: '18px',
            fontWeight: '400',
          },
        ],
        'bh6-semi-bold': [
          '12px',
          {
            lineHeight: '18px',
            fontWeight: '600',
          },
        ],
        'lu3-regular': [
          '18px',
          {
            lineHeight: '28px',
            fontWeight: '400',
          },
        ],
        'lu4-regular': [
          '16px',
          {
            lineHeight: '24px',
            fontWeight: '400',
          },
        ],
        'lu5-regular': [
          '14px',
          {
            lineHeight: '22px',
            fontWeight: '400',
          },
        ],
        'bt5-semi-bold': [
          '14px',
          {
            lineHeight: '20px',
            fontWeight: '600',
          },
        ],
      },
      colors: {
        primary: {
          25: '#F5FAFE',
          50: '#DEEDFE',
          100: '#BDDBFC',
          200: '#7BB6F9',
          300: '#3992F6',
          400: '#0A6EE1',
          500: '#074E9F',
          600: '#063E7F',
          700: '#042F5F',
          800: '#031F40',
          900: '#011020',
          950: '#010810',
        },
        secondary: {
          25: '#F7FCFA',
          50: '#E2F6EC',
          100: '#C8EEDB',
          200: '#96DDBA',
          300: '#6ACC9B',
          400: '#43BB80',
          500: '#22AB67',
          600: '#31885D',
          700: '#35664E',
          800: '#2E4439',
          900: '#1C221F',
          950: '#0F1110',
        },
        base: {
          25: '#FFFFFF',
          50: '#F9FAFB',
          75: '#F6F7F9',
          100: '#F2F4F7',
          200: '#E4E7EC',
          300: '#D0D5DD',
          400: '#98A2B3',
          500: '#667085',
          600: '#475467',
          700: '#344054',
          800: '#1D2939',
          900: '#101828',
        },
        positive: {
          25: '#F9FBF9',
          50: '#F1F7F2',
          100: '#E4F0E5',
          200: '#C6E0C7',
          300: '#A1CEA3',
          400: '#72BC76',
          500: '#07A721',
          600: '#06951E',
          700: '#05811A',
          800: '#046A15',
          900: '#2E443A',
          950: '#02340A',
        },
        positive2: {
          25: '#F9FCFB',
          50: '#F2F8F8',
          100: '#E4F1F0',
          200: '#C6E3E1',
          300: '#A1D4D0',
          400: '#72C3BE',
          500: '#00B2AA',
          600: '#009F98',
          700: '#008A84',
          800: '#00716C',
          900: '#004F4C',
          950: '#003836',
        },
        warning: {
          25: '#FFFCF9',
          50: '#FEF9F2',
          100: '#FEF3E5',
          200: '#FCE7C7',
          300: '#FBDAA4',
          400: '#F9CB77',
          500: '#F8BD26',
          600: '#DEA922',
          700: '#C0921D',
          800: '#9D7818',
          900: '#6F5511',
          950: '#4E3B0C',
        },
        warning2: {
          25: '#FFFBF9',
          50: '#FEF6F2',
          100: '#FDECE4',
          200: '#FCDAC6',
          300: '#FAC4A1',
          400: '#F8AC72',
          500: '#F79009',
          600: '#DD8108',
          700: '#BF7007',
          800: '#9C5B06',
          900: '#6E4004',
          950: '#4E2E03',
        },
        negative: {
          25: '#FDF9F9',
          50: '#FBF2F2',
          100: '#F8E5E5',
          200: '#F1C8C7',
          300: '#E8A5A3',
          400: '#E17976',
          500: '#D92D20',
          600: '#C2281D',
          700: '#A82319',
          800: '#891C14',
          900: '#61140E',
          950: '#440E0A',
        },
        negative2: {
          25: '#FDF8FA',
          50: '#FCF2F5',
          100: '#FAE5EB',
          200: '#F5C8D5',
          300: '#F0A6BC',
          400: '#EA7B9F',
          500: '#E5347C',
          600: '#CD2F6F',
          700: '#B12860',
          800: '#90204E',
          900: '#661737',
          950: '#481027',
        },
        new: {
          25: '#F9F9FC',
          50: '#F4F3F9',
          100: '#E9E7F4',
          200: '#D0CDE8',
          300: '#B3ADDB',
          400: '#9188CE',
          500: '#6554C0',
          600: '#5A4BAC',
          700: '#4E4195',
          800: '#3F3579',
          900: '#2D2656',
          950: '#201B3D',
        },
        new2: {
          25: '#FCF9FE',
          50: '#F9F4FE',
          100: '#F3E7FC',
          200: '#E8CEFA',
          300: '#DAAFF7',
          400: '#CD8CF5',
          500: '#BF5AF2',
          600: '#AA50D8',
          700: '#9345BB',
          800: '#783899',
          900: '#55286C',
          950: '#3C1C4D',
        },
        info: {
          25: '#F9FAFD',
          50: '#F2F6FA',
          100: '#ECF2F8',
          200: '#C6D7EB',
          300: '#A1BFE0',
          400: '#72A5D5',
          500: '#0086C9',
          600: '#0078B4',
          700: '#00689C',
          800: '#00557F',
          900: '#003C5A',
          950: '#002A40',
        },
        default: {
          25: '#FAFAFA',
          50: '#F5F5F5',
          100: '#EAEAEA',
          200: '#D3D3D3',
          300: '#B9B9B9',
          400: '#9A9A9A',
          500: '#757575',
          600: '#696969',
          700: '#5B5B5B',
          800: '#4A4A4A',
          900: '#343434',
          950: '#252525',
        },
        success: {
          50: '#F2F8F2',
          100: '#E3F7ED',
          400: '#43BC80',
        },
      },
      boxShadow: {
        'content-box': '0px 1px 18px rgba(181, 201, 235, 0.21), 0px 3px 5px rgba(132, 147, 198, 0.12)',
        'card-collapse': '0px 1px 6px rgba(181, 201, 235, 0.15), 0px 3px 10px rgba(132, 147, 198, 0.12)',
      },
      gridTemplateColumns: {
        16: 'repeat(16, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
}
