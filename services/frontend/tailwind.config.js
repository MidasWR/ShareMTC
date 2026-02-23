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
        canvas: "#000000",
        surface: "#09090B",
        elevated: "#121214",
        border: "#1F1F22",
        borderStrong: "#27272A",
        textPrimary: "#FAFAFA",
        textSecondary: "#A1A1AA",
        textMuted: "#71717A",
        brand: "#00FF41",
        brandHover: "#00D632",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#38BDF8"
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px"
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0, 0, 0, 0.5)",
        md: "0 8px 24px rgba(0, 0, 0, 0.6)",
        lg: "0 16px 48px rgba(0, 0, 0, 0.8)",
        brand: "0 0 10px rgba(0, 255, 65, 0.4)",
        brandStrong: "0 0 20px rgba(0, 255, 65, 0.6)"
      },
      dropShadow: {
        brand: "0 0 8px rgba(0, 255, 65, 0.5)"
      },
      spacing: {
        18: "4.5rem"
      },
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "0.8", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.06)" }
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.5", filter: "blur(4px)" },
          "50%": { opacity: "1", filter: "blur(6px)" }
        }
      },
      animation: {
        pulseSoft: "pulseSoft 1.8s ease-in-out infinite",
        glowPulse: "glowPulse 2s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
