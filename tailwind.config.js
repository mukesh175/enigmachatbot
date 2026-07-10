/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f0ff",
          100: "#e6e1ff",
          200: "#cabdff",
          300: "#a894ff",
          400: "#8768ff",
          500: "#6d3ef7",
          600: "#5b2fe0",
          700: "#4a24b8",
          800: "#3a1c90",
          900: "#2c1670",
        },
        surface: {
          DEFAULT: "#0f0f17",
          panel: "#161622",
          border: "#242435",
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #6d3ef7 0%, #a894ff 100%)",
        "glow": "radial-gradient(circle at top left, rgba(109,62,247,0.25), transparent 60%)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.1)",
        popover: "0 10px 40px rgba(0,0,0,0.35)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
    },
  },
  plugins: [],
};
