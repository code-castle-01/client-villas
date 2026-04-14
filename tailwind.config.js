/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  important: true, // Esto es crucial para sobrescribir los estilos de Ant Design
  theme: {
    extend: {},
  },
  plugins: [],
};
