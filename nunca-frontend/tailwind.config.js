/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  darkMode: "class", // 🌙 Habilita modo escuro via classe .dark

  theme: {
    extend: {
      colors: {
        primary: {
          50:  "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        neutral: {
          50:  "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
        },
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "Avenir", "Helvetica", "Arial", "sans-serif"],
      },

      boxShadow: {
        soft: "0 1px 3px rgba(0,0,0,0.08)",
      },

      transitionDuration: {
        DEFAULT: "200ms",
      },
    },
  },

  plugins: [
    require("@tailwindcss/forms"),       // 🧩 Melhora inputs e selects
    require("@tailwindcss/typography"),  // 📰 Estilo de textos longos
  ],
};
