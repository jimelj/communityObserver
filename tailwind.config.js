/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#1E3551',
          gray: '#6F7F8C',
          light: '#BFCBD1',
          paper: '#FDFEFD'
        }
      },
      fontFamily: {
        serif: ['Merriweather', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
}

