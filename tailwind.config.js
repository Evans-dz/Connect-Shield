/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#14213D",
          deep: "#0E1830",
          raised: "#1E2C4E",
          line: "#243354",
        },
        gold: {
          DEFAULT: "#B8863F",
          soft: "#E8CFA0",
          cream: "#F7F0E1",
        },
        ink: "#16202E",
        slate: { DEFAULT: "#64708A", mute: "#8992A3", faint: "#93A0B8" },
        paper: "#F5F6F8",
        line: "#E3E7ED",
        risk: { low: "#2E9E62", mid: "#C98A1F", high: "#D14343" },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: { content: "1180px" },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "ring-fill": {
          "0%": { strokeDashoffset: "var(--dash)" },
          "100%": { strokeDashoffset: "var(--offset)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};
