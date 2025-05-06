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
import { getUserGroups } from '../../services/groupService';
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
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // New state variables for payer and splits
  const [selectedPayer, setSelectedPayer] = useState(null);
  const [splitType, setSplitType] = useState('equal');
  const [customSplits, setCustomSplits] = useState({});
  const [groupMembers, setGroupMembers] = useState([]);

  // Load user's expenses and groups on component mount
  useEffect(() => {
    if (currentUser) {
      loadExpenses();
      loadGroups();
    }
  }, [currentUser]);

  // Reset splits when group selection changes
  useEffect(() => {
    if (selectedGroup) {
      loadGroupMembers();
    } else {
      setGroupMembers([]);
      setCustomSplits({});
    }
    
    // Reset selected payer when group changes
    setSelectedPayer(null);
  }, [selectedGroup]);

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

  const loadGroupMembers = async () => {
    if (!selectedGroup || !selectedGroup.members) return;
    
    try {
      const members = await getUsersByIds(selectedGroup.members);
      
      // Convert to array format for easier rendering
      const membersArray = Object.values(members).map(member => ({
        id: member.id,
        name: member.name,
      }));
      
      setGroupMembers(membersArray);
      
      // Initialize custom splits with equal distribution
      const equalPercentage = 100 / membersArray.length;
      const splits = {};
      membersArray.forEach(member => {
        splits[member.id] = equalPercentage;
      });
      setCustomSplits(splits);
      
      // Set current user as default payer
      const userId = getUserId(currentUser);
      const currentUserInGroup = membersArray.find(member => member.id === userId);
      if (currentUserInGroup) {
        setSelectedPayer(currentUserInGroup);
      } else if (membersArray.length > 0) {
        setSelectedPayer(membersArray[0]);
      }
    } catch (error) {
      console.error('Error loading group members:', error);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadExpenses();
  };

  const updateCustomSplit = (memberId, value) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    
    // Update the split for this member
    setCustomSplits(prev => ({
      ...prev,
      [memberId]: numValue
    }));
  };

  const getTotalSplitPercentage = () => {
    return Object.values(customSplits).reduce((sum, value) => sum + (value || 0), 0);
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

    if (!isPersonalExpense) {
      if (!selectedGroup) {
        Alert.alert('Error', 'Please select a group for this expense');
        return;
      }
      
      if (!selectedPayer) {
        Alert.alert('Error', 'Please select who paid for this expense');
        return;
      }
      
      // Validate custom splits if applicable
      if (splitType === 'custom') {
        const totalPercentage = getTotalSplitPercentage();
        if (Math.abs(totalPercentage - 100) > 0.1) {
          Alert.alert('Error', `Split percentages must add up to 100%. Current total: ${totalPercentage.toFixed(1)}%`);
          return;
        }
      }
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
        paidBy: isPersonalExpense ? userId : selectedPayer.id,
        date: new Date(),
        splitType: isPersonalExpense ? 'equal' : splitType,
        groupId: isPersonalExpense ? null : selectedGroup.id,
        splits: splitType === 'custom' ? customSplits : null
      };
      
      // Create expense in database
      await createExpense(expenseData);
      
      // Reset form and close modal
      setExpenseTitle('');
      setExpenseAmount('');
      setSelectedCategory(null);
      setIsPersonalExpense(true);
      setSelectedGroup(null);
      setSelectedPayer(null);
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
      onPress={() => setSelectedGroup(group)}
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

  const renderMemberItem = (member) => (
    <TouchableOpacity 
      key={member.id}
      style={[
        styles.memberItem,
        selectedPayer?.id === member.id && styles.selectedMemberItem
      ]}
      onPress={() => setSelectedPayer(member)}
    >
      <Text 
        style={[
          styles.memberText,
          selectedPayer?.id === member.id && styles.selectedMemberText
        ]}
      >
        {member.name}
      </Text>
    </TouchableOpacity>
  );

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
                <>
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

                  {selectedGroup && (
                    <>
                      <View style={styles.inputContainer}>
                        <Text style={styles.label}>Paid By</Text>
                        <View style={styles.membersContainer}>
                          {groupMembers.length > 0 ? (
                            groupMembers.map(renderMemberItem)
                          ) : (
                            <Text style={styles.noMembersText}>
                              Loading group members...
                            </Text>
                          )}
                        </View>
                      </View>

                      <View style={styles.inputContainer}>
                        <Text style={styles.label}>Split Type</Text>
                        <View style={styles.splitTypeContainer}>
                          <TouchableOpacity 
                            style={[
                              styles.splitTypeButton,
                              splitType === 'equal' && styles.selectedSplitTypeButton
                            ]}
                            onPress={() => setSplitType('equal')}
                          >
                            <Text 
                              style={[
                                styles.splitTypeText,
                                splitType === 'equal' && styles.selectedSplitTypeText
                              ]}
                            >
                              Equal
                            </Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={[
                              styles.splitTypeButton,
                              splitType === 'custom' && styles.selectedSplitTypeButton
                            ]}
                            onPress={() => setSplitType('custom')}
                          >
                            <Text 
                              style={[
                                styles.splitTypeText,
                                splitType === 'custom' && styles.selectedSplitTypeText
                              ]}
                            >
                              Custom
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {splitType === 'custom' && groupMembers.length > 0 && (
                        <View style={styles.inputContainer}>
                          <Text style={styles.label}>Custom Split Percentages</Text>
                          <Text style={styles.splitHint}>
                            Total: {getTotalSplitPercentage().toFixed(1)}% 
                            {Math.abs(getTotalSplitPercentage() - 100) > 0.1 
                              ? " (should be 100%)" 
                              : ""}
                          </Text>
                          {groupMembers.map(member => (
                            <View key={member.id} style={styles.splitRow}>
                              <Text style={styles.splitName}>{member.name}</Text>
                              <View style={styles.splitInputContainer}>
                                <TextInput
                                  style={styles.splitInput}
                                  value={customSplits[member.id]?.toString() || '0'}
                                  onChangeText={(value) => updateCustomSplit(member.id, value)}
                                  keyboardType="decimal-pad"
                                  placeholder="0"
                                />
                                <Text style={styles.percentSymbol}>%</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </>
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
                    setSelectedPayer(null);
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
  // New styles for payer and split UI
  membersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  memberItem: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 5,
    marginBottom: 10,
  },
  selectedMemberItem: {
    backgroundColor: '#5C6BC0',
  },
  memberText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  selectedMemberText: {
    color: '#fff',
  },
  noMembersText: {
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 10,
  },
  splitTypeContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  splitTypeButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  selectedSplitTypeButton: {
    backgroundColor: '#5C6BC0',
  },
  splitTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  selectedSplitTypeText: {
    color: '#fff',
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  splitName: {
    flex: 2,
    fontSize: 14,
    color: '#4B5563',
  },
  splitInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  splitInput: {
    flex: 1,
    padding: 8,
    fontSize: 14,
    color: '#1F2937',
  },
  percentSymbol: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 2,
  },
  splitHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
    fontStyle: 'italic',
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
}); 