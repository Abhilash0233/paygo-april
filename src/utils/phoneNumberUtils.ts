/**
 * Utility functions for working with phone numbers
 */

// List of phone numbers that are considered development/test numbers
const DEV_PHONE_NUMBERS = [
  '+915555555555',  // Test number 1
  '+916666666666',  // Test number 2
  '+917777777777',  // Test number 3
  '+918888888888',  // Test number 4
  '+919999999999',  // Test number 5
  '+914444444444',  // Test number 6
  '+916301998133',  // Admin number
];

// Export the DEV_PHONE_NUMBERS array for use in other files
export { DEV_PHONE_NUMBERS };

/**
 * Checks if a phone number is a development/test number
 * 
 * @param phoneNumber The phone number to check (with or without country code)
 * @returns True if this is a development phone number
 */
export function isDevelopmentPhone(phoneNumber: string): boolean {
  // If the phone number doesn't have a country code, add the default +91 (India)
  const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
  
  // Check if the phone number is in the list of dev numbers
  return DEV_PHONE_NUMBERS.includes(formattedNumber);
}

/**
 * Formats a phone number for display (e.g. +91 9876 543210)
 * 
 * @param phoneNumber The phone number to format
 * @returns Formatted phone number for display
 */
export function formatPhoneNumberForDisplay(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Ensure it has a country code
  const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;
  
  // Simple formatting: separate country code and add space between groups
  // This is a basic implementation - for more complex formatting, consider a library
  const parts = formattedNumber.match(/^\+(\d{1,3})(\d{4})(\d{1,})$/);
  
  if (parts) {
    return `+${parts[1]} ${parts[2]} ${parts[3]}`;
  }
  
  // If pattern doesn't match, return original with some basic formatting
  return formattedNumber.replace(/(\d{4})(\d{1,})$/, '$1 $2');
} 