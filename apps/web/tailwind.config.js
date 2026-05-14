/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "court-void":   "#080C18",
        "court-dark":   "#0F1628",
        "court-base":   "#161F35",
        "court-raised": "#1E2A45",
        "court-high":   "#263354",
        "gold":         "#FFD60A",
        "gold-dim":     "#C9980A",
        "neon-green":   "#00E676",
        "win-green":    "#00C853",
        "loss-red":     "#FF4545",
        "hot-orange":   "#FF6B2B",
        "violet":       "#8B5CF6",
        "sky":          "#38BDF8",
      },
      borderRadius: {
        "sm":  "8px",
        "md":  "12px",
        "lg":  "16px",
        "xl":  "20px",
        "2xl": "24px",
        "3xl": "32px",
      },
      boxShadow: {
        "card":        "0 2px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)",
        "elevated":    "0 8px 32px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.4)",
        "sheet":       "0 -8px 40px rgba(0,0,0,0.8)",
        "glow-gold":   "0 0 24px rgba(255,214,10,0.3), 0 0 8px rgba(255,214,10,0.15)",
        "glow-green":  "0 0 24px rgba(0,230,118,0.25), 0 0 8px rgba(0,230,118,0.12)",
        "glow-orange": "0 0 24px rgba(255,107,43,0.25), 0 0 8px rgba(255,107,43,0.12)",
        "glow-violet": "0 0 24px rgba(139,92,246,0.25), 0 0 8px rgba(139,92,246,0.12)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "coin-pop": {
          "0%":   { transform: "scale(1)" },
          "40%":  { transform: "scale(1.4) translateY(-8px)" },
          "70%":  { transform: "scale(0.95)" },
          "100%": { transform: "scale(1)" },
        },
        "odds-pulse": {
          "0%, 90%, 100%": { transform: "scale(1)" },
          "94%": { transform: "scale(1.04)" },
          "97%": { transform: "scale(0.99)" },
        },
        "win-flash": {
          "0%, 100%": { borderColor: "rgba(0,230,118,0.3)" },
          "50%": { borderColor: "#00E676" },
        },
        "streak-pulse": {
          "0%, 100%": { boxShadow: "none" },
          "50%": { boxShadow: "0 0 24px rgba(255,107,43,0.25)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to:   { transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down":  "accordion-down 0.2s ease-out",
        "accordion-up":    "accordion-up 0.2s ease-out",
        "fade-in-up":      "fade-in-up 250ms cubic-bezier(0.4,0,0.2,1) both",
        "coin-pop":        "coin-pop 500ms cubic-bezier(0.34,1.56,0.64,1)",
        "odds-pulse":      "odds-pulse 5s ease-in-out infinite",
        "win-flash":       "win-flash 1.5s ease-in-out 3",
        "streak-pulse":    "streak-pulse 2s ease-in-out infinite",
        "slide-up":        "slide-up 400ms cubic-bezier(0.4,0,0.2,1) both",
      },
      transitionTimingFunction: {
        "bounce-in": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "smooth":    "cubic-bezier(0.4, 0, 0.2, 1)",
        "snappy":    "cubic-bezier(0.2, 0, 0, 1)",
      },
      screens: {
        "xs": "375px",
      },
      fontFamily: {
        sans: ["Super Sans VF", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
