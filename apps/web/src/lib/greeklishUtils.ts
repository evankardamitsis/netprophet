/**
 * Greeklish utilities for client-side name normalization and transliteration
 * This provides consistent Greeklish handling on the frontend
 */

// Common Greek name variations and their Greeklish equivalents
const GREEK_NAME_VARIATIONS: Record<string, string[]> = {
  // First names
  ευάγγελος: ["evangelos", "vangelis", "vangelos"],
  βαγγέλης: ["vangelis", "vangelos", "evangelos"],
  δημήτριος: ["dimitrios", "dimitris"],
  δημήτρης: ["dimitris", "dimitrios"],
  κωνσταντίνος: ["konstantinos", "kostas"],
  κώστας: ["kostas", "konstantinos"],
  ιωάννης: ["ioannis", "giannis"],
  γιάννης: ["giannis", "ioannis"],
  νικόλαος: ["nikolaos", "nikos"],
  νίκος: ["nikos", "nikolaos"],
  παναγιώτης: ["panagiotis", "panos"],
  πάνος: ["panos", "panagiotis"],
  στέλιος: ["stelios"],
  χρήστος: ["christos"],
  μαρία: ["maria"],
  ελένη: ["eleni"],
  κατερίνα: ["katerina"],
  σοφία: ["sofia"],
  άννα: ["anna"],
  δέσποινα: ["despina"],

  // Common surnames
  παπαδόπουλος: ["papadopoulos"],
  παπαδοπούλου: ["papadopoulou"],
  γεωργίου: ["georgiou"],
  γεωργιάδης: ["georgiadis"],
  αντωνίου: ["antoniou"],
  αντωνιάδης: ["antoniadis"],
  νικολάου: ["nikolaou"],
  νικολαΐδης: ["nikolaidis"],
  κωστόπουλος: ["kostopoulos"],
  κωστοπούλου: ["kostopoulou"],
  βασιλείου: ["vasileiou"],
  βασιλιάδης: ["vasiliadis"],
  πέτρου: ["petrou"],
  πετρίδης: ["petridis"],
  μάκρης: ["makris"],
  μάκρη: ["makri"],
  καραγιάννης: ["karagiannis"],
  καραγιάννη: ["karagianni"],
  τσίπρας: ["tsipras"],
  τσίπρα: ["tsipra"],
  μητσοτάκης: ["mitsotakis"],
  μητσοτάκη: ["mitsotaki"],
  καρδαμίτσης: ["kardamitsis"],
};

// Reverse mapping for Greeklish to Greek
const GREEKLISH_TO_GREEK: Record<string, string> = {};
Object.entries(GREEK_NAME_VARIATIONS).forEach(([greek, greeklishVariants]) => {
  greeklishVariants.forEach((greeklish) => {
    GREEKLISH_TO_GREEK[greeklish.toLowerCase()] = greek;
  });
});

/**
 * Normalizes a name by removing accents and converting to lowercase
 */
export function normalizeName(name: string): string {
  if (!name) return "";

  return (
    name
      .toLowerCase()
      .trim()
      // Remove Greek accents
      .replace(/[άέήίόύώΐΰ]/g, (char) => {
        const accentMap: Record<string, string> = {
          ά: "α",
          έ: "ε",
          ή: "η",
          ί: "ι",
          ό: "ο",
          ύ: "υ",
          ώ: "ω",
          ΐ: "ι",
          ΰ: "υ",
        };
        return accentMap[char] || char;
      })
      .replace(/[ΆΈΉΊΌΎΏΪΫ]/g, (char) => {
        const accentMap: Record<string, string> = {
          Ά: "Α",
          Έ: "Ε",
          Ή: "Η",
          Ί: "Ι",
          Ό: "Ο",
          Ύ: "Υ",
          Ώ: "Ω",
          Ϊ: "Ι",
          Ϋ: "Υ",
        };
        return accentMap[char] || char;
      })
  );
}

/**
 * Converts Greeklish to Greek using common name mappings
 */
export function greeklishToGreek(greeklish: string): string {
  if (!greeklish) return "";

  const normalized = greeklish.toLowerCase().trim();

  // Check if it's a known Greeklish variation
  if (GREEKLISH_TO_GREEK[normalized]) {
    return GREEKLISH_TO_GREEK[normalized];
  }

  // If not found in mappings, return original
  return greeklish;
}

/**
 * Gets all possible variations of a Greek name (including Greeklish)
 */
export function getNameVariations(name: string): string[] {
  if (!name) return [];

  const normalized = normalizeName(name);
  const variations = new Set<string>([name, normalized]);

  // Add Greeklish variations if it's a known Greek name
  if (GREEK_NAME_VARIATIONS[normalized]) {
    GREEK_NAME_VARIATIONS[normalized].forEach((variation) => {
      variations.add(variation);
    });
  }

  // Add Greek variations if it's a known Greeklish name
  if (GREEKLISH_TO_GREEK[normalized]) {
    variations.add(GREEKLISH_TO_GREEK[normalized]);
  }

  return Array.from(variations);
}

/**
 * Checks if a name contains Greek characters
 */
export function containsGreekCharacters(text: string): boolean {
  if (!text) return false;

  // Greek Unicode ranges
  const greekRegex = /[\u0370-\u03FF\u1F00-\u1FFF]/;
  return greekRegex.test(text);
}

/**
 * Checks if a name contains only Latin characters (likely Greeklish)
 */
export function isGreeklish(text: string): boolean {
  if (!text) return false;

  // Check if it contains only Latin characters and common Greeklish patterns
  const latinRegex = /^[a-zA-Z\s]+$/;
  const commonGreeklishPatterns =
    /^(dimitr|kost|nik|pan|stel|chr|mar|el|kat|sof|ann|desp|papad|georg|anton|nikol|kost|vasil|petr|makr|karag|tsip|mitsot)/i;

  return latinRegex.test(text) && commonGreeklishPatterns.test(text);
}

/**
 * Suggests possible Greek names for a given Greeklish input
 */
export function suggestGreekNames(greeklish: string): string[] {
  if (!greeklish) return [];

  const normalized = greeklish.toLowerCase().trim();
  const suggestions: string[] = [];

  // Direct mapping
  if (GREEKLISH_TO_GREEK[normalized]) {
    suggestions.push(GREEKLISH_TO_GREEK[normalized]);
  }

  // Partial matches
  Object.entries(GREEKLISH_TO_GREEK).forEach(([greeklishKey, greekValue]) => {
    if (
      greeklishKey.includes(normalized) ||
      normalized.includes(greeklishKey)
    ) {
      suggestions.push(greekValue);
    }
  });

  return [...new Set(suggestions)]; // Remove duplicates
}

/**
 * Validates if a name input is likely to be a valid Greek or Greeklish name
 * Now includes Greek accented characters (ά, έ, ή, ί, ό, ύ, ώ, etc.)
 */
export function isValidGreekName(name: string): boolean {
  if (!name || name.trim().length < 2) return false;

  const trimmed = name.trim();

  // Must contain only Greek characters (including accents), Latin characters, or spaces
  // Includes: α-ω, Α-Ω, άέήίόύώΐΰ, ΆΈΉΊΌΎΏΪΫ, and Latin a-z, A-Z
  const validCharsRegex = /^[α-ωΑ-ΩάέήίόύώΐΰΆΈΉΊΌΎΏΪΫa-zA-Z\s]+$/;
  if (!validCharsRegex.test(trimmed)) return false;

  // Must not be all numbers or special characters
  // Check for any letters (Greek with or without accents, or Latin)
  const hasLetters = /[α-ωΑ-ΩάέήίόύώΐΰΆΈΉΊΌΎΏΪΫa-zA-Z]/.test(trimmed);
  if (!hasLetters) return false;

  return true;
}

/**
 * Formats a name for display (capitalizes first letter of each word)
 */
export function formatNameForDisplay(name: string): string {
  if (!name) return "";

  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
