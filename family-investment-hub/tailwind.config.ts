import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F1A2B",
        paper: "#F7F5EF",
        brand: {
          50: "#EEF4F1",
          100: "#D7E5DE",
          300: "#8FB8A5",
          500: "#2F6B4F",
          600: "#255943",
          700: "#1C4634",
          900: "#0F2A20",
        },
        gold: { 500: "#C79A3B", 600: "#A97F2C" },
        good: "#1E7B4D",
        warn: "#B4780E",
        bad: "#B23A34",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,26,43,.06), 0 6px 20px rgba(15,26,43,.06)",
      },
    },
  },
  plugins: [],
};
export default config;
