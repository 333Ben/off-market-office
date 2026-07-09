/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#F6F6F8",
        card: "#FFFFFF",
        border: "#ECECF1",
        ink: "#17171F",
        secondary: "#6B7280",
        muted: "#9CA3AF",
        violet: {
          DEFAULT: "#7C5CFC",
          hover: "#6A4BEF",
          tint: "#F1EDFF",
        },
        coral: {
          DEFAULT: "#FF6B5E",
          tint: "#FFEFED",
        },
        success: "#22C55E",
        warning: "#F59E0B",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontWeight: {
        400: "400",
        500: "500",
        600: "600",
        700: "700",
      },
      borderRadius: {
        card: "16px",
        panel: "20px",
        chip: "10px",
      },
      boxShadow: {
        soft: "0 8px 24px rgba(23,23,31,0.08)",
      },
    },
  },
  plugins: [],
};
