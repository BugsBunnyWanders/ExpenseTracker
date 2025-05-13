import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { EXPENSE_CATEGORIES } from '../../constants/categories';
import { createExpense, getUserExpenses } from '../../services/expenseService';
import { getGroupById, getUserGroups } from '../../services/groupService';
import { getUsersByIds } from '../../services/userService';
import { useAuth } from '../../utils/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getUserId } from '../../utils/UserAdapter';

export default function ExpensesScreen() {
  const { currentUser } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isPersonalExpense, setIsPersonalExpense] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [splitType, setSplitType] = useState('equal'); // 'equal' or 'custom'
  const [customSplits, setCustomSplits] = useState({});
  const [groupMembers, setGroupMembers] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Load user's expenses and groups on component mount
  useEffect(() => {
    if (currentUser) {
      loadExpenses();
      loadGroups();
    }
  }, [currentUser]);

  // Load group members when a group is selected
  useEffect(() => {
    if (selectedGroup && !isPersonalExpense) {
      loadGroupMembers(selectedGroup.id);
    }
  }, [selectedGroup]);

  // Reset custom splits when the expense amount or split type changes
  useEffect(() => {
    if (selectedGroup && splitType === 'custom') {
      initializeCustomSplits();
    }
  }, [expenseAmount, splitType, selectedGroup]);

  const loadExpenses = async () => {
    try {
      setIsLoading(true);
      
      // Get user ID safely using the adapter
      const userId = getUserId(currentUser);
      
      if (!userId) {
        console.error('User ID not found');
        Alert.alert('Error', 'Unable to identify user. Please log out and log in again.');
        return;
      }
      
      console.log('Loading expenses for user:', userId);
      const userExpenses = await getUserExpenses(userId);
      setExpenses(userExpenses);
    } catch (error) {
      console.error('Error loading expenses:', error);
      Alert.alert('Error', 'Failed to load expenses. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadGroups = async () => {
    try {
      // Get user ID safely using the adapter
      const userId = getUserId(currentUser);
      
      if (!userId) {
        console.error('User ID not found');
        return;
      }
      
      const userGroups = await getUserGroups(userId);
      setGroups(userGroups);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadGroupMembers = async (groupId) => {
    try {
      setIsLoadingMembers(true);
      
      // Get the group to get member IDs
      const group = await getGroupById(groupId);
      if (!group || !group.members || group.members.length === 0) {
        console.log('No members found in group or invalid group');
        setIsLoadingMembers(false);
        return;
      }
      
      console.log('Group members IDs:', group.members);
      
      // Get user details for all members
      const members = await getUsersByIds(group.members);
      console.log('Retrieved member details:', members);
      
      setGroupMembers(members);
      
      // Initialize custom splits with equal amounts
      initializeCustomSplits();
    } catch (error) {
      console.error('Error loading group members:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const initializeCustomSplits = () => {
    if (!selectedGroup || !selectedGroup.members || !expenseAmount) {
      setCustomSplits({});
      return;
    }
    
    const amount = parseFloat(expenseAmount) || 0;
    const memberCount = selectedGroup.members.length;
    
    if (memberCount === 0 || amount === 0) {
      setCustomSplits({});
      return;
    }
    
    // For equal split, divide evenly
    if (splitType === 'equal') {
      const equalAmount = (amount / memberCount).toFixed(2);
      const newSplits = {};
      
      selectedGroup.members.forEach(memberId => {
        newSplits[memberId] = parseFloat(equalAmount);
      });
      
      setCustomSplits(newSplits);
    } else {
      // For custom split, initialize with existing values or zeroes
      const newSplits = { ...customSplits };
      
      selectedGroup.members.forEach(memberId => {
        // Keep existing value or set to 0
        newSplits[memberId] = newSplits[memberId] || 0;
      });
      
      setCustomSplits(newSplits);
    }
  };

  const handleCustomSplitChange = (memberId, value) => {
    // Remove non-numeric characters except for the decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = cleanValue.split('.');
    const formattedValue = parts[0] + (parts.length > 1 ? '.' + parts[1] : '');
    
    const numericValue = parseFloat(formattedValue) || 0;
    setCustomSplits(prev => ({
      ...prev,
      [memberId]: numericValue
    }));
  };

  const validateCustomSplits = () => {
    if (!selectedGroup || splitType !== 'custom') return true;
    
    const totalAmount = parseFloat(expenseAmount) || 0;
    const totalSplitAmount = Object.values(customSplits).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);
    
    // Check if total split amount equals the expense amount (with small rounding margin)
    const isValid = Math.abs(totalAmount - totalSplitAmount) < 0.01;
    
    if (!isValid) {
      Alert.alert(
        'Invalid Split',
        `The total of all splits (${totalSplitAmount.toFixed(2)}) must equal the expense amount (${totalAmount.toFixed(2)}).`
      );
    }
    
    return isValid;
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadExpenses();
  };

  const handleAddExpense = async () => {
    if (!expenseTitle.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    
    if (!expenseAmount.trim() || isNaN(parseFloat(expenseAmount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    if (!isPersonalExpense && !selectedGroup) {
      Alert.alert('Error', 'Please select a group for this expense');
      return;
    }
    
    // Validate custom splits if applicable
    if (!isPersonalExpense && splitType === 'custom' && !validateCustomSplits()) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Get user ID safely using the adapter
      const userId = getUserId(currentUser);
      
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      const expenseData = {
        title: expenseTitle,
        amount: parseFloat(expenseAmount),
        category: selectedCategory,
        isPersonal: isPersonalExpense,
        paidBy: userId,
        date: new Date(),
        splitType: isPersonalExpense ? 'equal' : splitType,
        splits: isPersonalExpense ? null : (splitType === 'custom' ? customSplits : null),
        groupId: isPersonalExpense ? null : selectedGroup.id
      };
      
      // Create expense in database
      await createExpense(expenseData);
      
      // Reset form and close modal
      setExpenseTitle('');
      setExpenseAmount('');
      setSelectedCategory(null);
      setIsPersonalExpense(true);
      setSelectedGroup(null);
      setSplitType('equal');
      setCustomSplits({});
      setModalVisible(false);
      
      // Reload expenses to show the new one
      await loadExpenses();
    } catch (error) {
      console.error('Error adding expense:', error);
      Alert.alert('Error', 'Failed to add expense. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCategoryItem = (category) => (
    <TouchableOpacity 
      key={category.id}
      style={[
        styles.categoryItem,
        selectedCategory?.id === category.id && styles.selectedCategoryItem
      ]}
      onPress={() => setSelectedCategory(category)}
    >
      <Ionicons 
        name={category.icon} 
        size={24} 
        color={selectedCategory?.id === category.id ? '#fff' : '#5C6BC0'} 
      />
      <Text 
        style={[
          styles.categoryText,
          selectedCategory?.id === category.id && styles.selectedCategoryText
        ]}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  const renderGroupItem = (group) => (
    <TouchableOpacity 
      key={group.id}
      style={[
        styles.groupItem,
        selectedGroup?.id === group.id && styles.selectedGroupItem
      ]}
      onPress={() => {
        setSelectedGroup(group);
        // Clear custom splits when changing groups
        setCustomSplits({});
        // Reset split type to equal when changing groups
        setSplitType('equal');
      }}
    >
      <Text 
        style={[
          styles.groupText,
          selectedGroup?.id === group.id && styles.selectedGroupText
        ]}
      >
        {group.name}
      </Text>
    </TouchableOpacity>
  );

  const renderMemberSplitItem = (memberId) => {
    console.log('Rendering member split for ID:', memberId);
    console.log('GroupMembers state:', JSON.stringify(groupMembers, null, 2));
    
    let memberName = 'Unknown User';
    let memberEmail = '';
    
    // Check if member exists in groupMembers
    if (groupMembers[memberId]) {
      memberName = groupMembers[memberId].name || 'User';
      memberEmail = groupMembers[memberId].email || '';
      console.log('Found member in groupMembers:', memberName, memberEmail);
    } else {
      console.warn('Member not found in groupMembers:', memberId);
    }
    
    const split = customSplits[memberId] || 0;
    
    return (
      <View key={memberId} style={styles.memberSplitRow}>
        <View style={styles.memberInfoContainer}>
          <Text style={styles.memberName} numberOfLines={1} ellipsizeMode="tail">
            {memberName}
          </Text>
          {memberEmail ? (
            <Text style={styles.memberEmail} numberOfLines={1} ellipsizeMode="tail">
              {memberEmail}
            </Text>
          ) : null}
        </View>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>₹</Text>
          <TextInput
            style={styles.amountInput}
            value={split === 0 ? '' : split.toString()}
            onChangeText={value => handleCustomSplitChange(memberId, value)}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        </View>
      </View>
    );
  };

  const renderExpenseItem = ({ item }) => {
    // Find the category object
    const category = EXPENSE_CATEGORIES.find(cat => cat.id === item.category?.id) || { icon: 'list-outline' };
    
    return (
      <TouchableOpacity 
        style={styles.expenseItem}
        onPress={() => router.push({
          pathname: `/expense/${item.id}`,
          params: { expenseId: item.id }
        })}
      >
        <View style={styles.expenseIconContainer}>
          <Ionicons 
            name={category.icon} 
            size={20} 
            color="#fff" 
          />
        </View>
        <View style={styles.expenseDetails}>
          <Text style={styles.expenseTitle}>{item.title}</Text>
          <Text style={styles.expenseCategory}>
            {item.isPersonal ? 'Personal' : 'Group'} • {item.category?.name || 'Other'} • {formatDate(item.date)}
          </Text>
        </View>
        <Text style={styles.expenseAmount}>{formatCurrency(item.amount)}</Text>
      </TouchableOpacity>
    );
  };

  const getTotalSplitAmount = () => {
    if (!customSplits) return 0;
    return Object.values(customSplits).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);
  };

  const getSplitStatus = () => {
    if (!expenseAmount.trim() || splitType !== 'custom') return null;
    
    const totalAmount = parseFloat(expenseAmount) || 0;
    const totalSplitAmount = getTotalSplitAmount();
    const difference = totalAmount - totalSplitAmount;
    
    if (Math.abs(difference) < 0.01) {
      return <Text style={styles.splitStatusCorrect}>Splits are correct</Text>;
    } else if (difference > 0) {
      return <Text style={styles.splitStatusIncomplete}>{`${formatCurrency(difference)} left to assign`}</Text>;
    } else {
      return <Text style={styles.splitStatusExcess}>{`${formatCurrency(Math.abs(difference))} excess assigned`}</Text>;
    }
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5C6BC0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={expenses}
        renderItem={renderExpenseItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No expenses yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Add your first expense by clicking the "+" button
            </Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New Expense</Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={expenseTitle}
                  onChangeText={setExpenseTitle}
                  placeholder="What was this expense for?"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Amount</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={expenseAmount}
                    onChangeText={setExpenseAmount}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoriesContainer}>
                  {EXPENSE_CATEGORIES.map(renderCategoryItem)}
                </View>
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Expense Type</Text>
                <View style={styles.expenseTypeContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.expenseTypeButton,
                      isPersonalExpense && styles.selectedExpenseTypeButton
                    ]}
                    onPress={() => setIsPersonalExpense(true)}
                  >
                    <Text 
                      style={[
                        styles.expenseTypeText,
                        isPersonalExpense && styles.selectedExpenseTypeText
                      ]}
                    >
                      Personal
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.expenseTypeButton,
                      !isPersonalExpense && styles.selectedExpenseTypeButton
                    ]}
                    onPress={() => setIsPersonalExpense(false)}
                  >
                    <Text 
                      style={[
                        styles.expenseTypeText,
                        !isPersonalExpense && styles.selectedExpenseTypeText
                      ]}
                    >
                      Group
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {!isPersonalExpense && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Select Group</Text>
                  {groups.length === 0 ? (
                    <Text style={styles.noGroupsText}>
                      You don't have any groups. Create a group first.
                    </Text>
                  ) : (
                    <View style={styles.groupsContainer}>
                      {groups.map(renderGroupItem)}
                    </View>
                  )}
                </View>
              )}
              
              {!isPersonalExpense && selectedGroup && (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Split Type</Text>
                  <View style={styles.expenseTypeContainer}>
                    <TouchableOpacity 
                      style={[
                        styles.expenseTypeButton,
                        splitType === 'equal' && styles.selectedExpenseTypeButton
                      ]}
                      onPress={() => setSplitType('equal')}
                    >
                      <Text 
                        style={[
                          styles.expenseTypeText,
                          splitType === 'equal' && styles.selectedExpenseTypeText
                        ]}
                      >
                        Equal Split
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[
                        styles.expenseTypeButton,
                        splitType === 'custom' && styles.selectedExpenseTypeButton
                      ]}
                      onPress={() => {
                        setSplitType('custom');
                        
                        // If we don't have members loaded yet, load them now
                        if (selectedGroup && Object.keys(groupMembers).length === 0) {
                          loadGroupMembers(selectedGroup.id);
                        }
                      }}
                    >
                      <Text 
                        style={[
                          styles.expenseTypeText,
                          splitType === 'custom' && styles.selectedExpenseTypeText
                        ]}
                      >
                        Custom Split
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              {!isPersonalExpense && selectedGroup && splitType === 'custom' && expenseAmount.trim() && (
                <View style={styles.inputContainer}>
                  <View style={styles.splitHeaderRow}>
                    <Text style={styles.label}>Custom Split Amounts</Text>
                    {getSplitStatus()}
                  </View>
                  
                  <View style={styles.customSplitContainer}>
                    {isLoadingMembers ? (
                      <View style={styles.loadingMembersContainer}>
                        <ActivityIndicator size="small" color="#5C6BC0" />
                        <Text style={styles.loadingMembersText}>Loading group members...</Text>
                      </View>
                    ) : selectedGroup.members && selectedGroup.members.length > 0 ? (
                      <>
                        {Object.keys(groupMembers).length === 0 ? (
                          <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>Could not load member details</Text>
                            <TouchableOpacity 
                              style={styles.retryButton}
                              onPress={() => loadGroupMembers(selectedGroup.id)}
                            >
                              <Text style={styles.retryButtonText}>Retry</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <>
                            <View style={styles.memberHeaderRow}>
                              <Text style={styles.memberHeaderText}>Member</Text>
                              <Text style={styles.amountHeaderText}>Amount</Text>
                            </View>
                            {selectedGroup.members.map(renderMemberSplitItem)}
                          </>
                        )}
                      </>
                    ) : (
                      <Text style={styles.noMembersText}>This group has no members</Text>
                    )}
                  </View>
                  
                  {Object.keys(groupMembers).length > 0 && (
                    <>
                      <View style={styles.splitTotalRow}>
                        <Text style={styles.splitTotalLabel}>Total Split:</Text>
                        <Text style={styles.splitTotalAmount}>{formatCurrency(getTotalSplitAmount())}</Text>
                      </View>
                      <View style={styles.splitTotalRow}>
                        <Text style={styles.splitTotalLabel}>Expense Total:</Text>
                        <Text style={styles.splitTotalAmount}>{formatCurrency(parseFloat(expenseAmount) || 0)}</Text>
                      </View>
                    </>
                  )}
                </View>
              )}
              
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.button, styles.cancelButton]} 
                  onPress={() => {
                    setModalVisible(false);
                    setExpenseTitle('');
                    setExpenseAmount('');
                    setSelectedCategory(null);
                    setIsPersonalExpense(true);
                    setSelectedGroup(null);
                    setSplitType('equal');
                    setCustomSplits({});
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.button, styles.createButton]}
                  onPress={handleAddExpense}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.createButtonText}>Add</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  expenseIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5C6BC0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  expenseCategory: {
    fontSize: 14,
    color: '#6B7280',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5C6BC0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 8,
    marginHorizontal: 5,
    marginBottom: 10,
  },
  selectedCategoryItem: {
    backgroundColor: '#5C6BC0',
  },
  categoryText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 6,
  },
  selectedCategoryText: {
    color: '#fff',
  },
  expenseTypeContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  expenseTypeButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  selectedExpenseTypeButton: {
    backgroundColor: '#5C6BC0',
  },
  expenseTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  selectedExpenseTypeText: {
    color: '#fff',
  },
  groupsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  groupItem: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 5,
    marginBottom: 10,
  },
  selectedGroupItem: {
    backgroundColor: '#5C6BC0',
  },
  groupText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  selectedGroupText: {
    color: '#fff',
  },
  noGroupsText: {
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  createButton: {
    backgroundColor: '#5C6BC0',
  },
  cancelButtonText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: 16,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    minWidth: 100,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    paddingLeft: 12,
    paddingRight: 4,
  },
  amountInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  memberSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    marginBottom: 4,
    borderRadius: 6,
  },
  memberInfoContainer: {
    flex: 1,
    marginRight: 10,
    justifyContent: 'center',
    minHeight: 40,
  },
  memberName: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  splitHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  splitStatusCorrect: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  splitStatusIncomplete: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  splitStatusExcess: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  splitTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  splitTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  splitTotalAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  noMembersText: {
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
  },
  loadingMembersContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMembersText: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#5C6BC0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  customSplitContainer: {
    backgroundColor: '#F3F4F8',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  memberHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#D1D5DB',
    marginBottom: 8,
  },
  memberHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  amountHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginRight: 40,
  },
}); 