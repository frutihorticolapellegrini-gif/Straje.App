/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#000000',
          dark: '#1a1a1a', // Alternative dark for subtle gradients
          gray: '#808080',
          lightGray: '#f3f4f6',
          white: '#ffffff',
          blue: '#2563eb', // Accent color (Celeste/Azul)
          blueHover: '#1d4ed8',
          orange: '#f97316', // Orange for Cta Cte
          violet: '#8b5cf6', // Violet for Condicional
        }
      },
      borderRadius: {
        'semi': '0.375rem', // semi-recto (rounded-md)
      },
      boxShadow: {
        'btn': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
}
