/**
 * Phone number normalization utilities for ClickUp MCP server.
 * Handles E.164 format conversion for phone numbers.
 */

/**
 * Normalize phone number to E.164 format.
 * E.164 format: ^\+?[1-9]\d{1,14}$
 * Rules:
 * - Optional + at the start
 * - Must start with digit 1-9 (not 0)
 * - Followed by 1-14 digits only
 * - NO spaces, dashes, parentheses, dots, or other characters
 * - NO extensions
 * @param phone - Phone number string to normalize
 * @returns Normalized E.164 phone number or empty string if invalid
 */
export function normalizePhoneToE164(phone: string | null | undefined): string {
  if (!phone) return '';
  
  let normalized = String(phone).trim();
  if (!normalized) return '';
  
  // Remove extensions (x206, ext 123, extension 456, etc.)
  // Match: x, ext, extension followed by optional space and digits
  normalized = normalized.replace(/\s*(?:x|ext|extension)\s*\d+/i, '');
  
  // Check if it starts with + (preserve it)
  const hasPlus = normalized.startsWith('+');
  if (hasPlus) {
    normalized = normalized.substring(1);
  }
  
  // Remove all non-digit characters
  normalized = normalized.replace(/\D/g, '');
  
  // If empty after cleaning, return empty
  if (!normalized) return '';
  
  // If number starts with 0, it's invalid for E.164 (must start with 1-9)
  if (normalized.startsWith('0')) {
    return '';
  }
  
  // Check if it already has a country code (starts with 1-9 and has 10+ digits)
  // If it's 10 digits and starts with 1, assume it's US/Canada with country code
  // If it's 10 digits and doesn't start with 1, assume it's missing country code
  // If it's 11 digits and starts with 1, it already has country code
  // If it's more than 11 digits, assume it already has country code
  
  if (normalized.length === 10) {
    // 10 digits without country code - add +1 for US/Canada
    normalized = '1' + normalized;
  } else if (normalized.length === 11 && normalized.startsWith('1')) {
    // Already has US/Canada country code
    // Keep as is
  } else if (normalized.length < 10) {
    // Too short to be a valid phone number
    return '';
  } else if (normalized.length > 15) {
    // Too long for E.164 (max 15 digits after country code)
    return '';
  }
  
  // Add + prefix
  normalized = '+' + normalized;
  
  // Validate E.164 format: ^\+?[1-9]\d{1,14}$
  // We already have the +, so check: [1-9]\d{1,14}
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  if (!e164Regex.test(normalized)) {
    return '';
  }
  
  return normalized;
}
