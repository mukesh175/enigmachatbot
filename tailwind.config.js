/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eeeef9",
          100: "#d6d7f0",
          200: "#b0b2e3",
          300: "#8285d1",
          400: "#5a5d7a",
          500: "#2f3192",
          600: "#1a1c5c",
          700: "#171958",
          800: "#141650",
          900: "#0f1140",
        },
        accent: {
          DEFAULT: "#ed5e4e",
          light: "rgba(237,94,78,0.14)",
        },
        surface: {
          DEFAULT: "#1a1c5c",
          panel: "#22245e",
          border: "#2f3192",
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #ed5e4e 0%, #ff8272 100%)",
        "glow": "radial-gradient(circle at top left, rgba(47,49,146,0.28), transparent 60%)",
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
