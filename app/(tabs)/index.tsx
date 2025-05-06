import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { calculateGroupBalances, getUserExpenses } from '../../services/expenseService';
import { getUserSettlements } from '../../services/settlementService';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../utils/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import { useRefresh } from '../../utils/RefreshContext';
import { getUserId, getUserName } from '../../utils/UserAdapter';

interface Expense {
  id: string;
  title: string;
  amount: number;
  date: Date | string;
  category?: {
    id: string;
    name: string;
  };
  paidBy: string;
}

interface Settlement {
  id: string;
  amount: number;
  type: 'paid' | 'received';
}

export default function HomeScreen() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const { refreshTimestamps } = useRefresh();
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [totalOwed, setTotalOwed] = useState(0);
  const [totalOwe, setTotalOwe] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState({
    settlements: 0,
    balances: 0
  });

  // Refresh data when settlements change
  useEffect(() => {
    if (
      refreshTimestamps.settlements > lastRefreshTime.settlements || 
      refreshTimestamps.balances > lastRefreshTime.balances
    ) {
      console.log('Home: Refresh needed due to settlement changes');
      loadUserData();
      setLastRefreshTime({
        settlements: refreshTimestamps.settlements,
        balances: refreshTimestamps.balances
      });
    }
  }, [refreshTimestamps.settlements, refreshTimestamps.balances]);

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/login');
    } else if (currentUser) {
      loadUserData();
    }
  }, [currentUser, loading, router]);

  const loadUserData = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      
      // Get user ID safely using the adapter
      const userId = getUserId(currentUser);
      
      if (!userId) {
        console.error('User ID not found');
        return;
      }
      
      console.log('Loading expenses for user:', userId);
      
      // Load user's expenses
      const userExpenses = await getUserExpenses(userId);
      setExpenses(userExpenses.slice(0, 5)); // Show only 5 most recent expenses
      
      // Load user's settlements
      const userSettlements = await getUserSettlements(userId);
      setSettlements(userSettlements);
      
      // Get user's groups to calculate total balances
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id')
        .contains('members', [userId]);
      
      if (groupsError) {
        console.error('Error getting user groups:', groupsError);
        throw groupsError;
      }
      
      // Initialize total balances
      let totalOwed = 0;
      let totalOwe = 0;
      
      // Calculate balances from all groups
      const groupIds = groups?.map(g => g.id) || [];
      
      for (const groupId of groupIds) {
        console.log(`Calculating balances for group ${groupId}`);
        const balances = await calculateGroupBalances(groupId);
        const userBalance = balances[userId] || 0;
        
        // If balance is positive, user is owed money
        if (userBalance > 0) {
          totalOwed += userBalance;
        } 
        // If balance is negative, user owes money
        else if (userBalance < 0) {
          totalOwe += Math.abs(userBalance);
        }
      }
      
      console.log(`Total owed: ${totalOwed}, Total owe: ${totalOwe}`);
      setTotalOwed(totalOwed);
      setTotalOwe(totalOwe);
      
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUser]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadUserData();
  };

  const handleAddExpense = () => {
    // Navigate to the expenses tab where the user can add an expense
    router.navigate('/(tabs)/expenses' as any);
  };

  const handleCreateGroup = () => {
    // Navigate to the groups tab
    router.navigate('/(tabs)/groups' as any);
  };

  const handleSettleUp = () => {
    // We'll need to create this screen
    router.navigate('/settle' as any);
  };

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <TouchableOpacity
      style={styles.activityItem}
      onPress={() => router.navigate({
        pathname: `/expense/${item.id}`,
        params: { expenseId: item.id }
      } as any)}
    >
      <View style={styles.activityIconContainer}>
        <Ionicons name="receipt-outline" size={20} color="#fff" />
      </View>
      <View style={styles.activityDetails}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        <Text style={styles.activityDate}>
          {item.date instanceof Date 
            ? item.date.toLocaleDateString() 
            : new Date(item.date).toLocaleDateString()
          }
        </Text>
      </View>
      <Text style={styles.activityAmount}>{formatCurrency(item.amount)}</Text>
    </TouchableOpacity>
  );

  if (loading || isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5C6BC0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {getUserName(currentUser)}</Text>
      </View>
      
      <View style={styles.balanceContainer}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>You are owed</Text>
          <Text style={[styles.balanceAmount, styles.positiveAmount]}>
            {formatCurrency(totalOwed)}
          </Text>
        </View>
        
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>You owe</Text>
          <Text style={[styles.balanceAmount, styles.negativeAmount]}>
            {formatCurrency(totalOwe)}
          </Text>
        </View>
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleAddExpense}>
          <Text style={styles.actionButtonText}>Add Expense</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleCreateGroup}>
          <Text style={styles.actionButtonText}>Create Group</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleSettleUp}>
          <Text style={styles.actionButtonText}>Settle Up</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.recentActivityContainer}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        
        <FlatList
          data={expenses}
          renderItem={renderExpenseItem}
          keyExtractor={item => item.id}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No recent expenses</Text>
              <Text style={styles.emptyStateSubtext}>
                Add your first expense by clicking the "Add Expense" button
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  header: {
    marginTop: 20,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  positiveAmount: {
    color: '#10B981',
  },
  negativeAmount: {
    color: '#EF4444',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#5C6BC0',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  recentActivityContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5C6BC0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  activityAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyStateText: {
    fontSize: 16,
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
});
