/**
 * QR Code Utilities
 * 
 * This file contains utilities for generating and validating QR codes
 * for center check-ins.
 */

/**
 * Generates a QR code payload for a specific center
 * @param centerId The ID of the center
 * @returns A string payload that can be encoded in a QR code
 */
export const generateCenterQRPayload = (centerId: string): string => {
  if (!centerId) {
    throw new Error('Center ID is required');
  }
  
  return `paygo-center:${centerId}`;
};

/**
 * Extracts a center ID from a QR code payload
 * @param payload The QR code payload
 * @returns The center ID extracted from the payload, or null if the payload is invalid
 */
export const extractCenterIdFromQRPayload = (payload: string): string | null => {
  if (!payload || typeof payload !== 'string') {
    return null;
  }
  
  if (!payload.startsWith('paygo-center:')) {
    return null;
  }
  
  return payload.replace('paygo-center:', '');
};

/**
 * Validates if a QR code payload is for a center check-in
 * @param payload The QR code payload
 * @returns True if the payload is valid for a center check-in
 */
export const isValidCenterQRPayload = (payload: string): boolean => {
  return payload?.startsWith('paygo-center:') || false;
}; 