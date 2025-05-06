/**
 * User Adapter Utility
 * 
 * This utility provides a consistent interface for user properties
 * between Firebase and Supabase authentication systems.
 */

/**
 * Get the user ID safely from a user object
 * @param {Object|null} user - The user object from auth context
 * @returns {string|null} - The user ID or null if no user
 */
export const getUserId = (user) => {
  if (!user) return null;
  
  // Handle Supabase user object (primary)
  if (user.id) return user.id;
  
  // Fallback for Firebase-style user objects
  if (user.uid) return user.uid;
  
  return null;
};

/**
 * Get the user display name safely
 * @param {Object|null} user - The user object from auth context
 * @returns {string} - The user display name or 'User' if not available
 */
export const getUserName = (user) => {
  if (!user) return 'User';
  
  // Try different potential name properties
  const name = user.name || user.displayName || user.user_metadata?.name;
  
  return name || 'User';
};

/**
 * Get the user email safely
 * @param {Object|null} user - The user object from auth context
 * @returns {string|null} - The user email or null if not available
 */
export const getUserEmail = (user) => {
  if (!user) return null;
  
  return user.email || null;
};

/**
 * Get the user profile picture URL safely
 * @param {Object|null} user - The user object from auth context
 * @returns {string|null} - The profile picture URL or null if not available
 */
export const getUserProfilePicture = (user) => {
  if (!user) return null;
  
  return user.profile_picture || user.profilePicture || user.photoURL || null;
};

/**
 * Create a normalized user object with consistent properties
 * @param {Object|null} user - The user object from auth context
 * @returns {Object|null} - A normalized user object or null if no user
 */
export const normalizeUser = (user) => {
  if (!user) return null;
  
  return {
    id: getUserId(user),
    name: getUserName(user),
    email: getUserEmail(user),
    profilePicture: getUserProfilePicture(user),
    // Original user object for custom properties
    original: user
  };
}; 