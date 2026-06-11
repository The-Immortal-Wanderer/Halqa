import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./hooks/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],

  theme: {
    extend: {
      colors: {
        halqa: {
          // Primary
          teal: "#1D6A58",
          "teal-light": "#E6F4F0",
          "teal-dark": "#0F4A3C",

          // Sand
          sand: "#F7F4EE",
          "sand-mid": "#EDE9DF",
          "sand-dark": "#C9C3B4",

          // Amber (emergency only)
          amber: "#C97A1B",
          "amber-light": "#FDF3E3",
          "amber-dark": "#8A5210",

          // Ink
          ink: "#1E1C18",
          "ink-mid": "#5C574E",
          "ink-light": "#9C9589",

          // Semantic
          success: "#2E7D5C",
          "success-bg": "#EBF6F1",
          danger: "#B84040",
          "danger-bg": "#FAEAEA",

          // Category (civic dashboard only)
          "cat-power": "#1D6A58",
          "cat-security": "#4A5B7A",
          "cat-infrastructure": "#7A5C3A",
          "cat-water": "#3A7A8C",
          "cat-other": "#9C9589",
        },
      },

      fontFamily: {
        sans: ["var(--font-plus-jakarta-sans)", "system-ui", "sans-serif"],
        urdu: ["var(--font-noto-nastaliq-urdu)", "serif"],
      },

      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        full: "9999px",
      },

      spacing: {
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "8": "32px",
        "10": "40px",
        "12": "48px",
      },
    },
  },

  plugins: [],
};

export default config;
