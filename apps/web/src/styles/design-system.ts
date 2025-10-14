/**
 * NetProphet Design System
 * Game-like, vibrant aesthetic for the main app
 */

export const gradients = {
  // Primary gradients
  purple: "bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600",
  purpleVertical: "bg-gradient-to-b from-purple-600 via-pink-600 to-indigo-600",

  // Accent gradients
  blue: "bg-gradient-to-r from-blue-600 to-indigo-600",
  green: "bg-gradient-to-r from-green-600 to-emerald-600",
  orange: "bg-gradient-to-r from-orange-600 to-red-600",
  yellow: "bg-gradient-to-r from-yellow-400 to-orange-500",
  pink: "bg-gradient-to-r from-pink-500 to-purple-600",

  // Subtle backgrounds
  purpleSubtle: "bg-gradient-to-br from-purple-50 to-indigo-50",
  blueSubtle: "bg-gradient-to-br from-blue-50 to-indigo-50",
  greenSubtle: "bg-gradient-to-br from-green-50 to-emerald-50",
  orangeSubtle: "bg-gradient-to-br from-orange-50 to-red-50",
  yellowSubtle: "bg-gradient-to-br from-yellow-50 to-orange-50",
  pinkSubtle: "bg-gradient-to-br from-pink-50 to-purple-50",

  // Game background
  gameBackground:
    "bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800",
  headerBackground: "#121A39",
};

export const shadows = {
  glow: {
    purple:
      "shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40",
    blue: "shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40",
    green:
      "shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40",
    orange:
      "shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40",
    yellow:
      "shadow-lg shadow-yellow-500/30 hover:shadow-xl hover:shadow-yellow-500/40",
    pink: "shadow-lg shadow-pink-500/30 hover:shadow-xl hover:shadow-pink-500/40",
  },
  card: "shadow-xl",
  cardHover: "shadow-2xl",
};

export const borders = {
  thick: "border-2",
  rounded: {
    sm: "rounded-lg",
    md: "rounded-xl",
    lg: "rounded-2xl",
    full: "rounded-full",
  },
};

export const transitions = {
  default: "transition-all duration-300",
  fast: "transition-all duration-150",
  slow: "transition-all duration-500",
  transform: "transition-transform duration-300",
};

export const animations = {
  hover: {
    scale: "hover:scale-[1.02] transform",
    scaleSmall: "hover:scale-105 transform",
    lift: "hover:-translate-y-1 transform",
  },
  pulse: "animate-pulse",
};

export const typography = {
  heading: {
    xl: "text-2xl sm:text-3xl lg:text-4xl font-black",
    lg: "text-xl sm:text-2xl lg:text-3xl font-black",
    md: "text-lg sm:text-xl lg:text-2xl font-bold",
    sm: "text-base sm:text-lg font-bold",
  },
  body: {
    lg: "text-base sm:text-lg",
    md: "text-sm sm:text-base",
    sm: "text-xs sm:text-sm",
  },
};

export const spacing = {
  section: "py-8 sm:py-12 lg:py-16",
  sectionGap: "space-y-6 sm:space-y-8",
  card: "p-4 sm:p-6 lg:p-8",
  cardCompact: "p-3 sm:p-4 lg:p-6",
};

export const buttons = {
  // Main CTA button: yellow background (#F7E65D) with purple text (#4E1289)
  primary: {
    base: "font-bold rounded-xl px-6 py-3 transition-all duration-300",
    bg: "#F7E65D",
    color: "#4E1289",
    hover: "hover:opacity-90 hover:scale-[1.02]",
    className:
      "font-bold rounded-xl px-6 py-3 transition-all duration-300 hover:opacity-90 hover:scale-[1.02]",
  },
  // Secondary button: white 8% opacity background with white text
  secondary: {
    base: "font-bold rounded-xl px-6 py-3 transition-all duration-300",
    bg: "rgba(255, 255, 255, 0.08)",
    color: "#ffffff",
    hover: "hover:bg-opacity-15 hover:scale-[1.02]",
    className:
      "font-bold rounded-xl px-6 py-3 transition-all duration-300 hover:scale-[1.02]",
    bgHover: "rgba(255, 255, 255, 0.15)",
  },
};

export const headerStyles = {
  base: "sticky top-0 z-50",
  bg: "#121A39",
  border: "border-b border-white/8",
  shadow: "shadow-[0px_0px_24px_0px_rgba(255,255,255,0.08)]",
  className:
    "sticky top-0 z-50 border-b border-white/8 shadow-[0px_0px_24px_0px_rgba(255,255,255,0.08)]",
};

// Helper function to combine classes
export const cx = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(" ");
};
