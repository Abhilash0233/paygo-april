/**
 * Manages test phone numbers and their predefined OTPs
 * These numbers can be used during development and testing without sending real OTPs
 */

/**
 * Map of test phone numbers to their predefined OTPs
 */
export const TEST_PHONE_NUMBERS: Record<string, string> = {
  // Standard Test Numbers
  '+915555555555': '555555',
  '+916666666666': '666666',
  '+917777777777': '777777',
  '+918888888888': '888888',
  '+919999999999': '999999',
  '+914444444444': '444444',
  
  // Development and Testing Team Numbers
  '+916301998133': '123456', // Admin number
  '+919876543210': '123456', // Dev team 1
  '+919876543211': '123456', // Dev team 2
  '+919876543212': '123456', // Dev team 3
  '+919876543213': '123456', // QA team 1
  '+919876543214': '123456', // QA team 2
};

/**
 * Normalizes a phone number to ensure consistent format checking
 * @param phoneNumber The phone number to normalize
 * @returns The normalized phone number in E.164 format
 */
export function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters except the + sign at the beginning
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Ensure phone number has +91 prefix for India
  if (cleaned.startsWith('+91')) {
    return cleaned;
  } else if (cleaned.startsWith('91')) {
    return `+${cleaned}`;
  } else if (cleaned.length === 10) {
    // Assume 10-digit Indian number
    return `+91${cleaned}`;
  }
  
  // Return with + prefix if not already there
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

/**
 * Checks if a phone number is in the test list
 * @param phoneNumber The phone number to check
 * @returns boolean indicating if this is a test phone number
 */
export function isTestPhoneNumber(phoneNumber: string): boolean {
  // Normalize the phone number first
  const normalizedNumber = normalizePhoneNumber(phoneNumber);
  return Object.keys(TEST_PHONE_NUMBERS).includes(normalizedNumber);
}

/**
 * Gets the predefined OTP for a test phone number
 * @param phoneNumber The test phone number
 * @returns The predefined OTP or null if not a test phone number
 */
export function getTestOTP(phoneNumber: string): string | null {
  // Normalize the phone number first
  const normalizedNumber = normalizePhoneNumber(phoneNumber);
  return TEST_PHONE_NUMBERS[normalizedNumber] || null;
} 