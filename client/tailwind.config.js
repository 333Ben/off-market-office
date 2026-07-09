/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#EEF0F7",
        card: "#FFFFFF",
        border: "#E5E8F2",
        ink: "#14162E",
        secondary: "#565D78",
        muted: "#949BB4",
        violet: {
          DEFAULT: "#6C5CE7",
          hover: "#5A48D6",
          tint: "#EEECFC",
        },
        coral: {
          DEFAULT: "#FF5A5F",
          tint: "#FFECED",
        },
        success: "#16A34A",
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
        soft: "0 10px 30px rgba(20,22,46,0.10)",
        pop: "0 16px 40px rgba(20,22,46,0.16)",
      },
    },
  },
  plugins: [],
};
