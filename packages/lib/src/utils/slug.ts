/**
 * Convert a name to a URL-friendly slug
 * Handles Greek and other Unicode characters
 * This is the single source of truth for slug generation
 */
export function createSlug(text: string): string {
  if (!text || typeof text !== "string") return "";

  // Comprehensive Greek to Latin transliteration map (including both sigma variants)
  const greekToLatin: { [key: string]: string } = {
    // Lowercase Greek
    α: "a",
    β: "v",
    γ: "g",
    δ: "d",
    ε: "e",
    ζ: "z",
    η: "i",
    θ: "th",
    ι: "i",
    κ: "k",
    λ: "l",
    μ: "m",
    ν: "n",
    ξ: "x",
    ο: "o",
    π: "p",
    ρ: "r",
    σ: "s", // Regular sigma
    ς: "s", // Final sigma (word-end variant)
    τ: "t",
    υ: "y",
    φ: "f",
    χ: "ch",
    ψ: "ps",
    ω: "o",
    // Uppercase Greek
    Α: "a",
    Β: "v",
    Γ: "g",
    Δ: "d",
    Ε: "e",
    Ζ: "z",
    Η: "i",
    Θ: "th",
    Ι: "i",
    Κ: "k",
    Λ: "l",
    Μ: "m",
    Ν: "n",
    Ξ: "x",
    Ο: "o",
    Π: "p",
    Ρ: "r",
    Σ: "s", // Uppercase sigma (converts to lowercase 's')
    Τ: "t",
    Υ: "y",
    Φ: "f",
    Χ: "ch",
    Ψ: "ps",
    Ω: "o",
  };

  let slug = String(text);

  // First, normalize and remove diacritics
  slug = slug.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Convert Greek characters to Latin FIRST (before lowercasing)
  // This ensures Σ is converted to 's' correctly
  slug = slug
    .split("")
    .map((char) => greekToLatin[char] || char)
    .join("");

  // Then lowercase the result (now it's all Latin)
  slug = slug.toLowerCase();

  // Remove non-word characters (keeping only ASCII word chars, spaces, hyphens)
  slug = slug.replace(/[^\w\s-]/g, "");

  // Clean up whitespace and convert to hyphens
  slug = slug.trim().replace(/\s+/g, "-");

  // Remove multiple consecutive hyphens
  slug = slug.replace(/-+/g, "-");

  // Remove leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, "");

  return slug;
}
