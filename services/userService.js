import { supabase } from './supabase';

/**
 * Get a user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - User data or null if not found
 */
export const getUserById = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

/**
 * Search for users by email
 * @param {string} email - Email to search for
 * @returns {Promise<Array>} - Array of user objects
 */
export const searchUsersByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', `%${email}%`)
      .limit(10);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching users:', error);
    throw error;
  }
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} data - User data to update
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (userId, data) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Update user profile picture
 * @param {string} userId - User ID
 * @param {File} file - Image file
 * @returns {Promise<string>} - URL of the uploaded image
 */
export const updateProfilePicture = async (userId, file) => {
  try {
    // Generate a unique file path
    const filePath = `profile_pictures/${userId}/${new Date().getTime()}_${file.name}`;
    
    // Upload the file to storage
    const { error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(filePath, file);
    
    if (uploadError) throw uploadError;
    
    // Get the public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    // Update the user profile with the new picture URL
    await updateUserProfile(userId, { profile_picture: publicUrl });
    
    return publicUrl;
  } catch (error) {
    console.error('Error updating profile picture:', error);
    throw error;
  }
};

/**
 * Get user's friends
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of user objects
 */
export const getUserFriends = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Extract friend IDs
    const friendIds = data.map(item => item.friend_id);
    
    // Get friend profiles
    const { data: friendProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', friendIds);
    
    if (profileError) throw profileError;
    return friendProfiles || [];
  } catch (error) {
    console.error('Error getting user friends:', error);
    throw error;
  }
};

/**
 * Add a friend
 * @param {string} userId - User ID
 * @param {string} friendId - Friend's user ID
 * @returns {Promise<void>}
 */
export const addFriend = async (userId, friendId) => {
  try {
    // Add the friend relationship in both directions for bidirectional friendship
    const { error } = await supabase
      .from('friends')
      .insert([
        { user_id: userId, friend_id: friendId, created_at: new Date().toISOString() },
        { user_id: friendId, friend_id: userId, created_at: new Date().toISOString() }
      ]);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error adding friend:', error);
    throw error;
  }
};

/**
 * Remove a friend
 * @param {string} userId - User ID
 * @param {string} friendId - Friend's user ID
 * @returns {Promise<void>}
 */
export const removeFriend = async (userId, friendId) => {
  try {
    // Remove the friend relationship in both directions
    const { error } = await supabase
      .from('friends')
      .delete()
      .or(`user_id.eq.${userId},user_id.eq.${friendId}`)
      .or(`friend_id.eq.${friendId},friend_id.eq.${userId}`);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error removing friend:', error);
    throw error;
  }
};

/**
 * Get multiple users by their IDs
 * @param {Array<string>} userIds - Array of user IDs
 * @returns {Promise<Object>} - Object with user IDs as keys and user data as values
 */
export const getUsersByIds = async (userIds) => {
  try {
    if (!userIds || userIds.length === 0) {
      return {};
    }
    
    console.log('Fetching users with IDs:', userIds);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds);
    
    if (error) throw error;
    
    // Convert the array of users to an object with ID as key for easier lookup
    const userMap = {};
    (data || []).forEach(user => {
      userMap[user.id] = user;
    });
    
    return userMap;
  } catch (error) {
    console.error('Error getting users by IDs:', error);
    throw error;
  }
}; 