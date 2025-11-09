/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f4ff',
          100: '#bae0ff',
          200: '#91caff',
          300: '#69b1ff',
          400: '#4096ff',
          500: '#1677ff', // Ant Design 主色
          600: '#0958d9',
          700: '#003eb3',
          800: '#002c8c',
          900: '#001d66',
        },
        accent: {
          500: '#3b82f6', // Tailwind UI 点缀色
          600: '#2563eb',
        },
        material: {
          primary: '#6200ee', // Material Design 主色
          secondary: '#03dac6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Source Han Sans CN', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'ant': '4px',
        'ant-lg': '8px',
      },
      boxShadow: {
        'ant': '0 2px 8px rgba(0, 0, 0, 0.15)',
        'ant-hover': '0 4px 12px rgba(0, 0, 0, 0.15)',
        'material': '0 2px 4px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.1)',
        'material-hover': '0 4px 8px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.12)',
      },
      spacing: {
        'grid': '8px',
      },
      transitionDuration: {
        'tailwind': '200ms',
      },
      scale: {
        'hover': '1.02',
      }
    },
  },
  plugins: [],
}

