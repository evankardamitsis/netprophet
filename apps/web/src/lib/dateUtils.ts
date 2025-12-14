/**
 * Date utility functions for handling date of birth in DD/MM/YYYY format
 */

/**
 * Convert date from YYYY-MM-DD (ISO format) to DD/MM/YYYY
 */
export function formatDateToDDMMYYYY(isoDate: string): string {
  if (!isoDate) return "";

  // Handle both YYYY-MM-DD and DD/MM/YYYY formats
  if (isoDate.includes("/")) {
    // Already in DD/MM/YYYY format
    return isoDate;
  }

  const date = new Date(isoDate);
  if (isNaN(date.getTime())) {
    return isoDate; // Return original if invalid
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Convert date from DD/MM/YYYY to YYYY-MM-DD (ISO format)
 */
export function formatDateToISO(ddmmYYYY: string): string {
  if (!ddmmYYYY) return "";

  // Handle both formats
  if (ddmmYYYY.includes("-")) {
    // Already in YYYY-MM-DD format
    return ddmmYYYY;
  }

  const parts = ddmmYYYY.split("/");
  if (parts.length !== 3) {
    return ddmmYYYY; // Return original if invalid format
  }

  const day = parts[0].padStart(2, "0");
  const month = parts[1].padStart(2, "0");
  const year = parts[2];

  return `${year}-${month}-${day}`;
}

/**
 * Calculate age from date of birth
 * Accepts both YYYY-MM-DD and DD/MM/YYYY formats
 */
export function calculateAgeFromDOB(dateOfBirth: string): number {
  if (!dateOfBirth) return 0;

  let birthDate: Date;

  // Check format and parse accordingly
  if (dateOfBirth.includes("/")) {
    // DD/MM/YYYY format
    const parts = dateOfBirth.split("/");
    if (parts.length !== 3) return 0;
    birthDate = new Date(
      parseInt(parts[2]),
      parseInt(parts[1]) - 1,
      parseInt(parts[0])
    );
  } else {
    // YYYY-MM-DD format (ISO)
    birthDate = new Date(dateOfBirth);
  }

  if (isNaN(birthDate.getTime())) {
    return 0;
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

/**
 * Validate date of birth format and value
 * Accepts both YYYY-MM-DD and DD/MM/YYYY formats
 */
export function isValidDOB(dateOfBirth: string): boolean {
  if (!dateOfBirth) return false;

  let date: Date;

  if (dateOfBirth.includes("/")) {
    // DD/MM/YYYY format
    const parts = dateOfBirth.split("/");
    if (parts.length !== 3) return false;
    date = new Date(
      parseInt(parts[2]),
      parseInt(parts[1]) - 1,
      parseInt(parts[0])
    );
  } else {
    // YYYY-MM-DD format
    date = new Date(dateOfBirth);
  }

  return !isNaN(date.getTime());
}
