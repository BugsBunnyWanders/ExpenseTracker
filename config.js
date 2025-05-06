// Load environment variables for React Native
// This serves as a centralized place to access environment variables

// In a real app, you would use a proper environment management library
// like react-native-config or expo-constants

// Email configuration
export const GOOGLE_EMAIL = "saswatray2505@gmail.com";
export const GOOGLE_APP_PASSWORD = "mnyt kmso ojay hnwa";

// EmailJS configuration (alternative email service)
export const EMAILJS_SERVICE_ID = process.env.EXPO_PUBLIC_EMAILJS_SERVICE_ID || "";
export const EMAILJS_TEMPLATE_ID = process.env.EXPO_PUBLIC_EMAILJS_TEMPLATE_ID || "";
export const EMAILJS_USER_ID = process.env.EXPO_PUBLIC_EMAILJS_USER_ID || "";

// App configuration
export const APP_URL = process.env.EXPO_PUBLIC_APP_URL || "expensetracker://app";

// Check if email configuration is available
export const isEmailConfigured = () => {
  return Boolean(GOOGLE_EMAIL && GOOGLE_APP_PASSWORD) || 
         Boolean(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_USER_ID);
}; 