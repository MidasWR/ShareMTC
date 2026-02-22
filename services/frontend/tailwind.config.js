/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#0b1021",
        card: "#111933",
        accent: "#7c3aed",
        accentLight: "#a78bfa"
      }
    }
  },
  plugins: []
};
