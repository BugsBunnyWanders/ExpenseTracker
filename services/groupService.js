import { deleteData, getCurrentUser, getDataFromTable, insertData, supabase, updateData } from './supabase';

/**
 * Create a new group
 * @param {string} name - Group name
 * @param {string} description - Group description
 * @param {string} createdBy - User ID of the creator
 * @returns {Promise<string>} - ID of the created group
 */
export const createGroup = async (name, description, createdBy) => {
  try {
    console.log('Creating group:', { name, description, createdBy });
    
    if (!createdBy) {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User must be logged in to create a group');
      }
      createdBy = user.id;
      console.log('Using current user ID for group creation:', createdBy);
    }
    
    const groupData = {
      name,
      description,
      members: [createdBy],
      created_by: createdBy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const result = await insertData('groups', groupData);
    
    if (!result || result.length === 0) {
      throw new Error('Failed to create group: No result returned from database');
    }
    
    return result[0].id;
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
};

/**
 * Get a group by its ID
 * @param {string} groupId - Group ID
 * @returns {Promise<Object|null>} - Group data or null if not found
 */
export const getGroupById = async (groupId) => {
  try {
    console.log('Getting group by ID:', groupId);
    
    const result = await getDataFromTable('groups', {
      equals: { id: groupId }
    });
    
    if (!result || result.length === 0) {
      console.log('No group found with ID:', groupId);
      return null;
    }
    
    return result[0];
  } catch (error) {
    console.error('Error getting group:', error);
    throw error;
  }
};

/**
 * Get all groups a user is a member of
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of group objects
 */
export const getUserGroups = async (userId) => {
  try {
    console.log('Getting groups for user:', userId);
    
    if (!userId) {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User must be logged in to get their groups');
      }
      userId = user.id;
      console.log('Using current user ID for groups lookup:', userId);
    }
    
    // Due to the contains operator limitation in the wrapper, we'll use the direct query
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .contains('members', [userId])
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error in getUserGroups query:', error);
      throw error;
    }
    
    console.log(`Found ${data?.length || 0} groups for user ${userId}`);
    return data || [];
  } catch (error) {
    console.error('Error getting user groups:', error);
    throw error;
  }
};

/**
 * Add a user to a group
 * @param {string} groupId - Group ID
 * @param {string} userId - User ID to add
 * @returns {Promise<void>}
 */
export const addUserToGroup = async (groupId, userId) => {
  try {
    console.log('Adding user to group:', { groupId, userId });
    
    // Get the current group to get the members array
    const group = await getGroupById(groupId);
    
    if (!group) {
      throw new Error(`Group with ID ${groupId} not found`);
    }
    
    // Add the user to the members array if not already a member
    const members = group.members || [];
    if (!members.includes(userId)) {
      members.push(userId);
      
      // Update the group with the new members array
      await updateData('groups', groupId, { 
        members,
        updated_at: new Date().toISOString()
      });
      
      console.log(`User ${userId} added to group ${groupId}`);
    } else {
      console.log(`User ${userId} is already a member of group ${groupId}`);
    }
  } catch (error) {
    console.error('Error adding user to group:', error);
    throw error;
  }
};

/**
 * Remove a user from a group
 * @param {string} groupId - Group ID
 * @param {string} userId - User ID to remove
 * @returns {Promise<void>}
 */
export const removeUserFromGroup = async (groupId, userId) => {
  try {
    console.log('Removing user from group:', { groupId, userId });
    
    // Get the current group to get the members array
    const group = await getGroupById(groupId);
    
    if (!group) {
      throw new Error(`Group with ID ${groupId} not found`);
    }
    
    // Remove the user from the members array
    const members = group.members || [];
    const updatedMembers = members.filter(id => id !== userId);
    
    if (members.length === updatedMembers.length) {
      console.log(`User ${userId} is not a member of group ${groupId}`);
      return;
    }
    
    // Update the group with the new members array
    await updateData('groups', groupId, { 
      members: updatedMembers,
      updated_at: new Date().toISOString()
    });
    
    console.log(`User ${userId} removed from group ${groupId}`);
  } catch (error) {
    console.error('Error removing user from group:', error);
    throw error;
  }
};

/**
 * Update group information
 * @param {string} groupId - Group ID
 * @param {Object} data - Data to update
 * @returns {Promise<void>}
 */
export const updateGroup = async (groupId, data) => {
  try {
    console.log('Updating group:', { groupId, data });
    
    const updateData = {
      ...data,
      updated_at: new Date().toISOString()
    };
    
    await updateData('groups', groupId, updateData);
    console.log(`Group ${groupId} updated successfully`);
  } catch (error) {
    console.error('Error updating group:', error);
    throw error;
  }
};

/**
 * Delete a group
 * @param {string} groupId - Group ID
 * @returns {Promise<void>}
 */
export const deleteGroup = async (groupId) => {
  try {
    console.log('Deleting group:', groupId);
    
    await deleteData('groups', groupId);
    console.log(`Group ${groupId} deleted successfully`);
  } catch (error) {
    console.error('Error deleting group:', error);
    throw error;
  }
}; 