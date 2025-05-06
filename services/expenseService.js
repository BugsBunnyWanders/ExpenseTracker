import { getGroupById } from './groupService';
import { getGroupSettlements } from './settlementService';
import { deleteData, getCurrentUser, getDataFromTable, insertData, supabase } from './supabase';

/**
 * Create a new expense
 * @param {Object} expenseData - Expense data
 * @returns {Promise<string>} - ID of the created expense
 */
export const createExpense = async (expenseData) => {
  try {
    console.log('Creating expense:', expenseData);
    
    if (!expenseData.paid_by) {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User must be logged in to create an expense');
      }
      expenseData.paid_by = user.id;
      console.log('Using current user ID for expense creation:', expenseData.paid_by);
    }
    
    // Format the data for Supabase (snake_case fields)
    const formattedData = {
      title: expenseData.title,
      amount: expenseData.amount,
      paid_by: expenseData.paid_by,
      category: typeof expenseData.category === 'object' ? expenseData.category : JSON.stringify(expenseData.category),
      date: expenseData.date || new Date().toISOString(),
      is_personal: !!expenseData.isPersonal,
      group_id: expenseData.groupId || null,
      split_type: expenseData.splitType || 'equal',
      splits: expenseData.splits ? JSON.stringify(expenseData.splits) : null,
      notes: expenseData.notes || '',
      attachments: expenseData.attachments || [],
      is_settled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const result = await insertData('expenses', formattedData);
    
    if (!result || result.length === 0) {
      throw new Error('Failed to create expense: No result returned from database');
    }
    
    console.log('Expense created successfully:', result[0].id);
    return result[0].id;
  } catch (error) {
    console.error('Error creating expense:', error);
    throw error;
  }
};

/**
 * Get an expense by ID
 * @param {string} expenseId - Expense ID
 * @returns {Promise<Object|null>} - Expense data or null if not found
 */
export const getExpenseById = async (expenseId) => {
  try {
    console.log('Getting expense by ID:', expenseId);
    
    const result = await getDataFromTable('expenses', {
      equals: { id: expenseId }
    });
    
    if (!result || result.length === 0) {
      console.log('No expense found with ID:', expenseId);
      return null;
    }
    
    // Parse dates and JSON fields
    const expense = result[0];
    if (expense.date) {
      expense.date = new Date(expense.date);
    }
    
    console.log('Retrieved expense:', expense.id);
    return expense;
  } catch (error) {
    console.error('Error getting expense:', error);
    throw error;
  }
};

/**
 * Get all expenses for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of expense objects
 */
export const getUserExpenses = async (userId) => {
  try {
    console.log('Getting expenses for user:', userId);
    
    if (!userId) {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User must be logged in to get their expenses');
      }
      userId = user.id;
      console.log('Using current user ID for expenses lookup:', userId);
    }
    
    // Get the user's personal expenses
    const { data: personalExpenses, error: personalError } = await supabase
      .from('expenses')
      .select('*')
      .eq('paid_by', userId)
      .eq('is_personal', true)
      .order('date', { ascending: false });
    
    if (personalError) {
      console.error('Error getting personal expenses:', personalError);
      throw personalError;
    }
    
    // Get all groups the user is a member of
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id')
      .contains('members', [userId]);
    
    if (groupsError) {
      console.error('Error getting user groups:', groupsError);
      throw groupsError;
    }
    
    // Get group expenses if the user is in any groups
    let groupExpenses = [];
    if (groups && groups.length > 0) {
      const groupIds = groups.map(g => g.id);
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('is_personal', false)
        .in('group_id', groupIds)
        .order('date', { ascending: false });
      
      if (expensesError) {
        console.error('Error getting group expenses:', expensesError);
        throw expensesError;
      }
      
      groupExpenses = expenses || [];
    }
    
    // Combine and format all expenses
    const allExpenses = [...(personalExpenses || []), ...groupExpenses];
    
    // Parse dates
    allExpenses.forEach(expense => {
      if (expense.date) {
        expense.date = new Date(expense.date);
      }
    });
    
    console.log(`Found ${allExpenses.length} expenses for user ${userId}`);
    return allExpenses;
  } catch (error) {
    console.error('Error getting user expenses:', error);
    throw error;
  }
};

/**
 * Get all expenses for a group
 * @param {string} groupId - Group ID
 * @returns {Promise<Array>} - Array of expense objects
 */
export const getGroupExpenses = async (groupId) => {
  try {
    console.log('Getting expenses for group:', groupId);
    
    // Verify the group exists
    const group = await getGroupById(groupId);
    if (!group) {
      throw new Error(`Group with ID ${groupId} not found`);
    }
    
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('group_id', groupId)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error getting group expenses:', error);
      throw error;
    }
    
    // Parse dates if needed
    const expenses = data || [];
    expenses.forEach(expense => {
      if (expense.date) {
        expense.date = new Date(expense.date);
      }
    });
    
    console.log(`Found ${expenses.length} expenses for group ${groupId}`);
    return expenses;
  } catch (error) {
    console.error('Error getting group expenses:', error);
    throw error;
  }
};

/**
 * Update an expense
 * @param {string} expenseId - Expense ID
 * @param {Object} data - Data to update
 * @returns {Promise<Object>} - Updated expense data
 */
export const updateExpense = async (expenseId, data) => {
  try {
    console.log('Updating expense:', { expenseId, data });
    
    // Get the expense to check permissions
    const expense = await getExpenseById(expenseId);
    if (!expense) {
      throw new Error(`Expense with ID ${expenseId} not found`);
    }
    
    // Format the update data
    const updateData = {
      ...data,
      updated_at: new Date().toISOString()
    };
    
    // Convert any object fields to JSON strings
    if (updateData.category && typeof updateData.category === 'object') {
      updateData.category = JSON.stringify(updateData.category);
    }
    
    if (updateData.splits && typeof updateData.splits === 'object') {
      updateData.splits = JSON.stringify(updateData.splits);
    }
    
    const result = await updateData('expenses', expenseId, updateData);
    console.log(`Expense ${expenseId} updated successfully`);
    return result;
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
};

/**
 * Delete an expense
 * @param {string} expenseId - Expense ID
 * @returns {Promise<void>}
 */
export const deleteExpense = async (expenseId) => {
  try {
    console.log('Deleting expense:', expenseId);
    
    // Get the expense to check permissions
    const expense = await getExpenseById(expenseId);
    if (!expense) {
      throw new Error(`Expense with ID ${expenseId} not found`);
    }
    
    await deleteData('expenses', expenseId);
    console.log(`Expense ${expenseId} deleted successfully`);
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
};

/**
 * Calculate balances for a group
 * @param {string} groupId - Group ID
 * @returns {Promise<Object>} - Object containing user balances
 */
export const calculateGroupBalances = async (groupId) => {
  try {
    console.log('Calculating balances for group:', groupId);
    
    const expenses = await getGroupExpenses(groupId);
    
    // Get group details to get members
    const group = await getGroupById(groupId);
    if (!group) {
      throw new Error(`Group with ID ${groupId} not found`);
    }
    
    const members = group.members || [];
    
    // Initialize balances for each member
    const balances = {};
    members.forEach(memberId => {
      balances[memberId] = 0;
    });
    
    // Calculate balances from expenses
    expenses.forEach(expense => {
      const { paid_by, amount, split_type, splits } = expense;
      let customSplit = null;
      
      // Parse splits if it's a string
      if (split_type === 'custom' && splits) {
        try {
          customSplit = typeof splits === 'string' ? JSON.parse(splits) : splits;
        } catch (e) {
          console.error('Error parsing custom splits:', e);
        }
      }
      
      // Handle different split types
      if (split_type === 'equal') {
        // Equal split among all members
        const perPersonAmount = amount / members.length;
        
        members.forEach(memberId => {
          if (memberId === paid_by) {
            // Payer receives money from others
            balances[memberId] += amount - perPersonAmount;
          } else {
            // Others owe money to payer
            balances[memberId] -= perPersonAmount;
          }
        });
      } else if (split_type === 'custom' && customSplit) {
        // Custom split as defined in the expense
        Object.keys(customSplit).forEach(memberId => {
          const memberAmount = customSplit[memberId];
          
          if (memberId === paid_by) {
            // Payer receives money from others
            balances[memberId] += amount - memberAmount;
          } else {
            // Others owe money to payer based on their share
            balances[memberId] -= memberAmount;
          }
        });
      }
    });
    
    // Get all settlements for this group and adjust balances
    const settlements = await getGroupSettlements(groupId);
    
    // Apply settlements to adjust balances
    settlements.forEach(settlement => {
      // Only consider completed settlements
      if (settlement.status === 'completed') {
        const { from_user, to_user, amount } = settlement;
        
        // Payer's balance decreases (they've paid their debt)
        if (balances[from_user] !== undefined) {
          balances[from_user] += amount;
        }
        
        // Receiver's balance decreases (they've been paid)
        if (balances[to_user] !== undefined) {
          balances[to_user] -= amount;
        }
      }
    });
    
    console.log('Group balances calculated (with settlements):', balances);
    return balances;
  } catch (error) {
    console.error('Error calculating balances:', error);
    throw error;
  }
}; 