/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      colors: {
        canvas: "#070A12",
        surface: "#0F172A",
        elevated: "#111C31",
        border: "#22314D",
        borderStrong: "#33507A",
        textPrimary: "#E8F1FF",
        textSecondary: "#AFC7E8",
        textMuted: "#7E99BC",
        brand: "#3B82F6",
        brandHover: "#2563EB",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#38BDF8"
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px"
      },
      boxShadow: {
        sm: "0 1px 2px rgba(15, 23, 42, 0.25)",
        md: "0 8px 24px rgba(15, 23, 42, 0.28)",
        lg: "0 16px 48px rgba(15, 23, 42, 0.35)"
      },
      spacing: {
        18: "4.5rem"
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "0.8", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.06)" }
        }
      },
      animation: {
        pulseSoft: "pulseSoft 1.8s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
