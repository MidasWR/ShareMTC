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
        canvas: "#0B1220",
        surface: "#111827",
        elevated: "#1F2937",
        border: "#334155",
        borderStrong: "#475569",
        textPrimary: "#F8FAFC",
        textSecondary: "#CBD5E1",
        textMuted: "#94A3B8",
        brand: "#6366F1",
        brandHover: "#4F46E5",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6"
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
      }
    }
  },
  plugins: []
};
