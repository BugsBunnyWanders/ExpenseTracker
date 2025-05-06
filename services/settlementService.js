import { calculateGroupBalances } from './expenseService';
import { supabase } from './supabase';

/**
 * Create a new settlement
 * @param {Object} settlementData - Settlement data
 * @returns {Promise<string>} - ID of the created settlement
 */
export const createSettlement = async (settlementData) => {
  try {
    const data = {
      ...settlementData,
      status: settlementData.status || 'completed', // Default to completed if not specified
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Creating settlement with data:', data);
    
    const { data: result, error } = await supabase
      .from('settlements')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    console.log('Settlement created successfully:', result.id);
    return result.id;
  } catch (error) {
    console.error('Error creating settlement:', error);
    throw error;
  }
};

/**
 * Get a settlement by ID
 * @param {string} settlementId - Settlement ID
 * @returns {Promise<Object|null>} - Settlement data or null if not found
 */
export const getSettlementById = async (settlementId) => {
  try {
    const { data, error } = await supabase
      .from('settlements')
      .select('*')
      .eq('id', settlementId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error getting settlement:', error);
    throw error;
  }
};

/**
 * Get all settlements for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of settlement objects
 */
export const getUserSettlements = async (userId) => {
  try {
    // Get settlements where the user is either the payer or the receiver
    const { data, error } = await supabase
      .from('settlements')
      .select('*')
      .or(`from_user.eq.${userId},to_user.eq.${userId}`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Process the settlements to add a type field for easier handling
    const settlements = data || [];
    return settlements.map(settlement => ({
      ...settlement,
      type: settlement.from_user === userId ? 'paid' : 'received',
    }));
  } catch (error) {
    console.error('Error getting user settlements:', error);
    throw error;
  }
};

/**
 * Get all settlements for a group
 * @param {string} groupId - Group ID
 * @returns {Promise<Array>} - Array of settlement objects
 */
export const getGroupSettlements = async (groupId) => {
  try {
    console.log(`Getting settlements for group: ${groupId}`);
    
    const { data, error } = await supabase
      .from('settlements')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const settlements = data || [];
    console.log(`Found ${settlements.length} settlements for group ${groupId}`);
    
    // Log completed settlements
    const completedSettlements = settlements.filter(s => s.status === 'completed');
    console.log(`Found ${completedSettlements.length} COMPLETED settlements for group ${groupId}`);
    
    return settlements;
  } catch (error) {
    console.error('Error getting group settlements:', error);
    throw error;
  }
};

/**
 * Generate settlement suggestions for a group
 * @param {string} groupId - Group ID
 * @returns {Promise<Array>} - Array of suggested settlement objects
 */
export const generateSettlementSuggestions = async (groupId) => {
  try {
    // Get the current balances for the group
    const balances = await calculateGroupBalances(groupId);
    
    // Get group members
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('members')
      .eq('id', groupId)
      .single();
    
    if (groupError) throw groupError;
    
    const members = group.members || [];
    
    // Get member profiles for better display
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, email, profile_picture')
      .in('id', members);
    
    if (profilesError) throw profilesError;
    
    // Create a map of user IDs to profiles
    const profileMap = {};
    profiles.forEach(profile => {
      profileMap[profile.id] = profile;
    });
    
    // Separate users with positive and negative balances
    const creditors = [];
    const debtors = [];
    
    Object.keys(balances).forEach(userId => {
      if (balances[userId] > 0) {
        creditors.push({ userId, amount: balances[userId] });
      } else if (balances[userId] < 0) {
        debtors.push({ userId, amount: -balances[userId] });
      }
    });
    
    // Sort by amount (highest first)
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);
    
    const suggestions = [];
    
    // Generate settlement suggestions
    while (creditors.length > 0 && debtors.length > 0) {
      const creditor = creditors[0];
      const debtor = debtors[0];
      
      // Calculate the amount that can be settled
      const amount = Math.min(creditor.amount, debtor.amount);
      
      // Create a settlement suggestion
      suggestions.push({
        from_user: debtor.userId,
        from_user_name: profileMap[debtor.userId]?.name || 'Unknown',
        to_user: creditor.userId,
        to_user_name: profileMap[creditor.userId]?.name || 'Unknown',
        amount,
        group_id: groupId
      });
      
      // Update balances
      creditor.amount -= amount;
      debtor.amount -= amount;
      
      // Remove users with zero balance
      if (creditor.amount < 0.01) {
        creditors.shift();
      }
      
      if (debtor.amount < 0.01) {
        debtors.shift();
      }
    }
    
    return suggestions;
  } catch (error) {
    console.error('Error generating settlement suggestions:', error);
    throw error;
  }
};

/**
 * Update settlement status
 * @param {string} settlementId - Settlement ID
 * @param {string} status - New status ('pending', 'completed', 'cancelled')
 * @returns {Promise<void>}
 */
export const updateSettlementStatus = async (settlementId, status) => {
  try {
    const { error } = await supabase
      .from('settlements')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', settlementId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error updating settlement status:', error);
    throw error;
  }
};

/**
 * Calculate an optimal settlement plan for a group
 * @param {string} groupId - Group ID
 * @returns {Promise<Array>} - Array of settlement transactions to optimize debt resolution
 */
export const calculateSettlementPlan = async (groupId) => {
  try {
    console.log(`Calculating settlement plan for group: ${groupId}`);
    
    // Get the current balances for the group
    const balances = await calculateGroupBalances(groupId);
    console.log(`Group balances calculated:`, balances);
    
    // Separate users with positive and negative balances
    const creditors = []; // People who are owed money (positive balance)
    const debtors = [];   // People who owe money (negative balance)
    
    Object.keys(balances).forEach(userId => {
      const balance = balances[userId];
      if (balance > 0) {
        creditors.push({ id: userId, amount: balance });
      } else if (balance < 0) {
        debtors.push({ id: userId, amount: Math.abs(balance) });
      }
    });
    
    // Sort by amount (highest first)
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);
    
    console.log(`Creditors:`, creditors);
    console.log(`Debtors:`, debtors);
    
    const settlementPlan = [];
    
    // Generate optimal settlement plan
    while (creditors.length > 0 && debtors.length > 0) {
      const creditor = creditors[0];
      const debtor = debtors[0];
      
      // Calculate the amount to settle (minimum of what's owed and what's due)
      const amount = Math.min(creditor.amount, debtor.amount);
      
      if (amount > 0) {
        // Add to settlement plan
        settlementPlan.push({
          payerId: debtor.id,
          payeeId: creditor.id,
          amount: parseFloat(amount.toFixed(2))
        });
      }
      
      // Update remaining balances
      creditor.amount -= amount;
      debtor.amount -= amount;
      
      // Remove users with zero balance (with small epsilon for floating point comparison)
      if (creditor.amount < 0.01) {
        creditors.shift();
      }
      
      if (debtor.amount < 0.01) {
        debtors.shift();
      }
    }
    
    console.log(`Settlement plan generated with ${settlementPlan.length} transactions`);
    return settlementPlan;
  } catch (error) {
    console.error('Error calculating settlement plan:', error);
    throw error;
  }
}; 