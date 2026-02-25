/** @type {import('tailwindcss').Config} */
const withOpacity = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      colors: {
        canvas: withOpacity("--color-canvas"),
        surface: withOpacity("--color-surface"),
        elevated: withOpacity("--color-elevated"),
        border: withOpacity("--color-border"),
        borderStrong: withOpacity("--color-border-strong"),
        textPrimary: withOpacity("--color-text-primary"),
        textSecondary: withOpacity("--color-text-secondary"),
        textMuted: withOpacity("--color-text-muted"),
        brand: withOpacity("--color-brand"),
        brandHover: withOpacity("--color-brand-hover"),
        success: withOpacity("--color-success"),
        warning: withOpacity("--color-warning"),
        danger: withOpacity("--color-danger"),
        info: withOpacity("--color-info")
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
        brand: "0 0 10px rgba(var(--brand-rgb), 0.4)",
        brandStrong: "0 0 20px rgba(var(--brand-rgb), 0.6)"
      },
      dropShadow: {
        brand: "0 0 8px rgba(var(--brand-rgb), 0.5)"
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
