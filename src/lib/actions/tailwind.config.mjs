/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",      // This covers [locale]
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Add your Lemi Kura brand colors here for easy use
        'gov-blue': '#0B3C5D',
        'dev-green': '#2E8B57',
        'const-orange': '#F4A261',
      },
    },
  },
  plugins: [],
}