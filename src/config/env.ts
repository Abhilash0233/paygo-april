/**
 * Environment Configuration
 * 
 * IMPORTANT: This file should be gitignored in production.
 * Create a .env file in the root directory with these values.
 */

// Environment type
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Twilio configuration
export const TWILIO_CONFIG = {
  accountSid: process.env.TWILIO_ACCOUNT_SID || 'TWILIO_ACCOUNT_SID_PLACEHOLDER',
  authToken: process.env.TWILIO_AUTH_TOKEN || 'TWILIO_AUTH_TOKEN_PLACEHOLDER',
  verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || 'TWILIO_VERIFY_SERVICE_SID_PLACEHOLDER',
  phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'PHONE_NUMBER_PLACEHOLDER'
};

// API configuration
export const API_CONFIG = {
  baseUrl: IS_PRODUCTION 
    ? 'https://api.yourapp.com'  // Replace with your production API URL
    : 'https://dev-api.yourapp.com',  // Replace with your development API URL
  timeout: 30000, // 30 seconds
};

// Feature flags
export const FEATURES = {
  enableSmsRetriever: process.env.ENABLE_SMS_RETRIEVER === 'true',
  enableBiometrics: process.env.ENABLE_BIOMETRICS === 'true',
  enableAnalytics: IS_PRODUCTION && process.env.ENABLE_ANALYTICS === 'true',
  enableErrorReporting: IS_PRODUCTION && process.env.ENABLE_ERROR_REPORTING === 'true',
};

// Validation
if (IS_PRODUCTION) {
  const missingVars = [];
  
  if (!TWILIO_CONFIG.accountSid) missingVars.push('TWILIO_ACCOUNT_SID');
  if (!TWILIO_CONFIG.authToken) missingVars.push('TWILIO_AUTH_TOKEN');
  if (!TWILIO_CONFIG.verifyServiceSid) missingVars.push('TWILIO_VERIFY_SERVICE_SID');
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

// Log configuration status (in development)
if (IS_DEVELOPMENT) {
  console.log('Environment Configuration:', {
    isDevelopment: IS_DEVELOPMENT,
    isProduction: IS_PRODUCTION,
    hasTwilioConfig: {
      accountSid: !!TWILIO_CONFIG.accountSid,
      authToken: !!TWILIO_CONFIG.authToken,
      verifyServiceSid: !!TWILIO_CONFIG.verifyServiceSid
    },
    features: FEATURES
  });
} 