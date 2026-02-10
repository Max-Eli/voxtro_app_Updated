import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize a lead name to Title Case with cleaned spacing.
 * "JOHN DOE" → "John Doe", "  jane   smith " → "Jane Smith"
 */
export function formatLeadName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

/**
 * Normalize an email to lowercase with no extra whitespace.
 * "  JOHN@EXAMPLE.COM  " → "john@example.com"
 */
export function formatLeadEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.trim().replace(/\s+/g, '').toLowerCase();
}

/**
 * Normalize a phone number to a clean, professional format.
 * Strips extra spaces, then formats common patterns:
 *   10 digits → (XXX) XXX-XXXX
 *   11 digits starting with 1 → +1 (XXX) XXX-XXXX
 *   Other → cleaned with single spaces preserved
 */
export function formatLeadPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  // Extract just digits and any leading +
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  // For international / other formats: clean up spacing, keep + prefix
  const cleaned = trimmed.replace(/\s+/g, ' ');
  if (hasPlus && !cleaned.startsWith('+')) return '+' + cleaned;
  return cleaned;
}
