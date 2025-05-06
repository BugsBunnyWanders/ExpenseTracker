import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { EXPENSE_CATEGORIES } from '../../constants/categories';
import { deleteExpense, getExpenseById } from '../../services/expenseService';
import { getGroupById } from '../../services/groupService';
import { getUsersByIds } from '../../services/userService';
import { formatDate } from '../../utils/formatters';

export default function ExpenseDetailScreen() {
  const { expenseId } = useLocalSearchParams();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [expense, setExpense] = useState(null);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState({});
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    if (expenseId) {
      loadExpenseData();
    } else {
      Alert.alert('Error', 'No expense ID provided');
      router.back();
    }
  }, [expenseId]);
  
  const loadExpenseData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch expense details
      const expenseData = await getExpenseById(expenseId);
      if (!expenseData) {
        Alert.alert('Error', 'Expense not found');
        router.back();
        return;
      }
      setExpense(expenseData);
      
      // If it's a group expense, fetch group details
      if (expenseData.group_id) {
        const groupData = await getGroupById(expenseData.group_id);
        setGroup(groupData);
        
        if (groupData && groupData.members) {
          // Fetch member data
          const membersData = await getUsersByIds(groupData.members);
          setMembers(membersData);
        }
      } else {
        // For personal expenses, just fetch the payer
        if (expenseData.paid_by) {
          const membersData = await getUsersByIds([expenseData.paid_by]);
          setMembers(membersData);
        }
      }
      
    } catch (error) {
      console.error('Error loading expense data:', error);
      Alert.alert('Error', 'Failed to load expense data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEditExpense = () => {
    router.push({
      pathname: '/edit-expense',
      params: { expenseId }
    });
  };
  
  const handleDeleteExpense = () => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteExpense(expenseId);
              Alert.alert('Success', 'Expense has been deleted.');
              router.back();
            } catch (error) {
              console.error('Error deleting expense:', error);
              Alert.alert('Error', 'Failed to delete expense. Please try again.');
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };
  
  // Find category based on ID
  const getCategory = (categoryData) => {
    if (!categoryData) return null;
    
    let categoryObj = expense.category;
    if (typeof categoryObj === 'string') {
      try {
        categoryObj = JSON.parse(categoryObj);
      } catch (e) {
        console.error('Failed to parse category:', e);
      }
    }
    
    // Try to find by ID first
    const id = categoryObj?.id;
    if (id) {
      const found = EXPENSE_CATEGORIES.find(cat => cat.id === id);
      if (found) return found;
    }
    
    // Fallback to name match
    const name = categoryObj?.name;
    if (name) {
      const found = EXPENSE_CATEGORIES.find(cat => 
        cat.name.toLowerCase() === name.toLowerCase()
      );
      if (found) return found;
    }
    
    return EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]; // Return "Other" as fallback
  };
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5C6BC0" />
      </View>
    );
  }
  
  if (!expense) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Expense not found</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const category = getCategory(expense.category);
  const payer = members[expense.paid_by] || { name: 'Unknown' };
  const isGroupExpense = !!expense.group_id;
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#5C6BC0" />
        </TouchableOpacity>
        <Text style={styles.title}>Expense Details</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.editBtn}
            onPress={handleEditExpense}
          >
            <Ionicons name="create-outline" size={24} color="#5C6BC0" />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.amountSection}>
          <View style={styles.categoryIcon}>
            <Ionicons 
              name={category?.icon || 'list-outline'} 
              size={32} 
              color="#fff" 
            />
          </View>
          <Text style={styles.amount}>₹{parseFloat(expense.amount).toFixed(2)}</Text>
          <Text style={styles.expenseTitle}>{expense.title}</Text>
          <Text style={styles.expenseDate}>{formatDate(expense.date)}</Text>
        </View>
        
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{category?.name || 'Other'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Paid By</Text>
            <Text style={styles.detailValue}>{payer.name}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type</Text>
            <Text style={styles.detailValue}>
              {isGroupExpense ? (
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>Group</Text>
                </View>
              ) : (
                <View style={[styles.typeBadge, styles.personalBadge]}>
                  <Text style={styles.typeBadgeText}>Personal</Text>
                </View>
              )}
            </Text>
          </View>
          
          {isGroupExpense && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Group</Text>
              <Text style={styles.detailValue}>{group?.name || 'Unknown'}</Text>
            </View>
          )}
          
          {isGroupExpense && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Split Type</Text>
              <Text style={styles.detailValue}>
                {expense.split_type === 'equal' ? 'Equal Split' : 'Custom Split'}
              </Text>
            </View>
          )}
          
          {expense.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.detailLabel}>Notes</Text>
              <Text style={styles.notesText}>{expense.notes}</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={handleDeleteExpense}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>Delete Expense</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#5C6BC0',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  editBtn: {
    padding: 8,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  amountSection: {
    backgroundColor: '#fff',
    paddingVertical: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#5C6BC0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  expenseTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailsSection: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  typeBadge: {
    backgroundColor: '#5C6BC0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  personalBadge: {
    backgroundColor: '#10B981',
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  notesSection: {
    marginTop: 16,
  },
  notesText: {
    fontSize: 16,
    color: '#1F2937',
    marginTop: 8,
    lineHeight: 24,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 