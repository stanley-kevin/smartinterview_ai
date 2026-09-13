/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E1116",
        surface: "#161A22",
        "surface-2": "#1E2430",
        edge: "#262D3A",
        text: {
          DEFAULT: "#ECEFF4",
          muted: "#8B95A7",
          faint: "#5B6474",
        },
        accent: {
          DEFAULT: "#4C7CFF",
          dim: "#2F4EAD",
        },
        signal: "#34D399",
        amber: "#F5A623",
        rose: "#F2617A",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.04) inset",
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(180deg, rgba(76,124,255,0.08) 0%, rgba(14,17,22,0) 60%)",
      },
    },
  },
  plugins: [],
};
