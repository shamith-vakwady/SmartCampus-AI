/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#030712",      // Deep Slate (almost black)
        glassBg: "rgba(17, 24, 39, 0.7)", // Frosted Slate
        cyberPurple: "#8b5cf6", // Indigo/Purple Accent
        cyberCyan: "#06b6d4",   // Neon Cyan Accent
        cyberEmerald: "#10b981",// Emerald Accent
        cyberRose: "#f43f5e"    // Cyberpunk Rose Warning
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        cyber: "0 0 15px rgba(139, 92, 246, 0.4)",
        cyanGlow: "0 0 15px rgba(6, 182, 212, 0.4)",
        greenGlow: "0 0 15px rgba(16, 185, 129, 0.4)",
        redGlow: "0 0 15px rgba(244, 63, 94, 0.4)"
      }
    },
  },
  plugins: [],
}
