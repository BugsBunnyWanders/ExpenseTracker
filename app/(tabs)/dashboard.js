import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getUserExpenses } from '../../services/expenseService';
import { getUserGroups } from '../../services/groupService';
import { useAuth } from '../../utils/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getUserId } from '../../utils/UserAdapter';

export default function DashboardScreen() {
  const { currentUser } = useAuth();
  const [userGroups, setUserGroups] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadDashboardData();
    }
  }, [currentUser]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Get user ID
      const userId = getUserId(currentUser);
      
      if (!userId) {
        console.error('User ID not found');
        return;
      }
      
      // Load user groups
      const groups = await getUserGroups(userId);
      setUserGroups(groups);
      
      // Load recent expenses
      const expenses = await getUserExpenses(userId, 5); // Get only 5 most recent
      setRecentExpenses(expenses);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData();
  };

  const renderGroupItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.groupCard}
      onPress={() => router.push({
        pathname: `/group/${item.id}`,
        params: { groupId: item.id }
      })}
    >
      <View style={styles.groupIconContainer}>
        <Text style={styles.groupIcon}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.groupMembers}>
          {item.members?.length || 0} member{item.members?.length !== 1 ? 's' : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
  
  const renderExpenseItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.expenseItem}
      onPress={() => router.push({
        pathname: `/expense/${item.id}`,
        params: { expenseId: item.id }
      })}
    >
      <View style={styles.expenseIconContainer}>
        <Ionicons 
          name={item.category?.icon || 'receipt-outline'} 
          size={20} 
          color="#fff" 
        />
      </View>
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseTitle}>{item.title}</Text>
        <Text style={styles.expenseDate}>{formatDate(item.date)}</Text>
      </View>
      <Text style={styles.expenseAmount}>
        {formatCurrency(item.amount)}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5C6BC0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {currentUser?.name || 'there'}!</Text>
        <Text style={styles.subtitle}>Here's your expense overview</Text>
      </View>
      
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Groups</Text>
                <TouchableOpacity onPress={() => router.push('/groups')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              
              {userGroups.length > 0 ? (
                <FlatList
                  data={userGroups.slice(0, 3)} // Show only first 3 groups
                  renderItem={renderGroupItem}
                  keyExtractor={item => item.id}
                  horizontal={false}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No groups yet</Text>
                  <TouchableOpacity 
                    style={styles.createButton}
                    onPress={() => router.push('/create-group')}
                  >
                    <Text style={styles.createButtonText}>Create a Group</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Expenses</Text>
                <TouchableOpacity onPress={() => router.push('/expenses')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              </View>
              
              {recentExpenses.length > 0 ? (
                <FlatList
                  data={recentExpenses}
                  renderItem={renderExpenseItem}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No expenses yet</Text>
                  <TouchableOpacity 
                    style={styles.createButton}
                    onPress={() => router.push('/add-expense')}
                  >
                    <Text style={styles.createButtonText}>Add an Expense</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        }
        contentContainerStyle={styles.scrollContent}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
      />
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#5C6BC0',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  seeAllText: {
    fontSize: 14,
    color: '#5C6BC0',
    fontWeight: '500',
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  groupIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5C6BC0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  groupMembers: {
    fontSize: 14,
    color: '#6B7280',
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
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
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  createButton: {
    backgroundColor: '#5C6BC0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
}); 