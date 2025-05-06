import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { calculateGroupBalances, getGroupExpenses } from '../../services/expenseService';
import { getGroupById } from '../../services/groupService';
import { calculateSettlementPlan } from '../../services/settlementService';
import { getUsersByIds } from '../../services/userService';
import { useAuth } from '../../utils/AuthContext';
import { useRefresh } from '../../utils/RefreshContext';

export default function GroupDetailsScreen() {
  const { groupId } = useLocalSearchParams();
  const { currentUser } = useAuth();
  const router = useRouter();
  const { refreshTimestamps } = useRefresh();
  
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [members, setMembers] = useState({});
  const [balances, setBalances] = useState({});
  const [settleUpPlan, setSettleUpPlan] = useState([]);
  const [activeTab, setActiveTab] = useState('expenses');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState({
    settlements: 0,
    balances: 0
  });

  // Track if we need to refresh due to settlement changes
  useEffect(() => {
    if (
      refreshTimestamps.settlements > lastRefreshTime.settlements || 
      refreshTimestamps.balances > lastRefreshTime.balances
    ) {
      console.log('Refresh needed due to settlement changes');
      loadGroupData();
      setLastRefreshTime({
        settlements: refreshTimestamps.settlements,
        balances: refreshTimestamps.balances
      });
    }
  }, [refreshTimestamps.settlements, refreshTimestamps.balances]);

  useEffect(() => {
    if (groupId && currentUser) {
      loadGroupData();
    }
  }, [groupId, currentUser]);

  const loadGroupData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch group details
      const groupData = await getGroupById(groupId);
      if (!groupData) {
        Alert.alert('Error', 'Group not found');
        router.back();
        return;
      }
      setGroup(groupData);
      
      // Fetch members data
      const membersData = await getUsersByIds(groupData.members || []);
      setMembers(membersData);
      
      // Fetch group expenses
      const groupExpenses = await getGroupExpenses(groupId);
      setExpenses(groupExpenses);
      
      // Calculate balances
      const groupBalances = await calculateGroupBalances(groupId);
      setBalances(groupBalances);
      
      // Calculate settlement plan
      const plan = await calculateSettlementPlan(groupId);
      setSettleUpPlan(plan);
    } catch (error) {
      console.error('Error loading group data:', error);
      Alert.alert('Error', 'Failed to load group data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [groupId, router]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadGroupData();
  };

  const handleCreateExpense = () => {
    // Navigate to add expense screen with pre-selected group
    router.push({
      pathname: '/add-expense',
      params: { groupId }
    });
  };

  const handleAddMember = () => {
    // Navigate to add member screen
    router.push({
      pathname: '/add-member',
      params: { groupId }
    });
  };

  const handleExpensePress = (expense) => {
    // Navigate to expense details screen
    router.push({
      pathname: `/expense/${expense.id}`,
      params: { expenseId: expense.id }
    });
  };

  const renderExpenseItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.expenseItem}
      onPress={() => handleExpensePress(item)}
    >
      <View style={styles.expenseIconContainer}>
        <Ionicons name="receipt-outline" size={20} color="#fff" />
      </View>
      <View style={styles.expenseDetails}>
        <Text style={styles.expenseTitle}>{item.title}</Text>
        <Text style={styles.expenseDate}>
          {item.date instanceof Date 
            ? item.date.toLocaleDateString() 
            : new Date(item.date).toLocaleDateString()
          }
        </Text>
      </View>
      <View style={styles.expenseAmountContainer}>
        <Text style={styles.expenseAmount}>₹{parseFloat(item.amount).toFixed(2)}</Text>
        <Text style={styles.expensePayer}>
          Paid by {members[item.paidBy]?.name || 'Unknown'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderMemberItem = ({ item }) => {
    const memberData = members[item];
    const memberBalance = balances[item] || 0;
    
    return (
      <View style={styles.memberItem}>
        <View style={styles.memberIconContainer}>
          <Text style={styles.memberIcon}>
            {memberData?.name?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.memberDetails}>
          <Text style={styles.memberName}>{memberData?.name || 'Unknown'}</Text>
          <Text style={styles.memberEmail}>{memberData?.email || ''}</Text>
        </View>
        <Text 
          style={[
            styles.memberBalance,
            memberBalance > 0 ? styles.positiveBalance : 
            memberBalance < 0 ? styles.negativeBalance : styles.neutralBalance
          ]}
        >
          {memberBalance > 0 ? `+₹${memberBalance.toFixed(2)}` : 
           memberBalance < 0 ? `-₹${Math.abs(memberBalance).toFixed(2)}` : 
           '₹0.00'}
        </Text>
      </View>
    );
  };

  const renderSettlementItem = ({ item }) => {
    const payer = members[item.payerId]?.name || 'Unknown';
    const payee = members[item.payeeId]?.name || 'Unknown';
    
    return (
      <View style={styles.settlementItem}>
        <View style={styles.settlementIconContainer}>
          <Ionicons name="swap-horizontal-outline" size={20} color="#fff" />
        </View>
        <View style={styles.settlementDetails}>
          <Text style={styles.settlementText}>
            {payer} pays {payee}
          </Text>
        </View>
        <Text style={styles.settlementAmount}>₹{item.amount.toFixed(2)}</Text>
      </View>
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
      <View style={styles.header}>
        <Text style={styles.groupName}>{group?.name || 'Group'}</Text>
        <Text style={styles.groupDescription}>
          {group?.description || 'No description'}
        </Text>
      </View>
      
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'expenses' && styles.activeTab]}
          onPress={() => setActiveTab('expenses')}
        >
          <Text style={[styles.tabText, activeTab === 'expenses' && styles.activeTabText]}>
            Expenses
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.activeTab]}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>
            Members
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settle' && styles.activeTab]}
          onPress={() => setActiveTab('settle')}
        >
          <Text style={[styles.tabText, activeTab === 'settle' && styles.activeTabText]}>
            Settle Up
          </Text>
        </TouchableOpacity>
      </View>
      
      {activeTab === 'expenses' && (
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
                Add your first expense by clicking the "Add Expense" button
              </Text>
            </View>
          }
        />
      )}
      
      {activeTab === 'members' && (
        <FlatList
          data={group?.members || []}
          renderItem={renderMemberItem}
          keyExtractor={item => item}
          contentContainerStyle={styles.listContainer}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No members yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Add members to this group to track shared expenses
              </Text>
            </View>
          }
        />
      )}
      
      {activeTab === 'settle' && (
        <FlatList
          data={settleUpPlan}
          renderItem={renderSettlementItem}
          keyExtractor={(item, index) => `settlement-${index}`}
          contentContainerStyle={styles.listContainer}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Everyone is settled up!</Text>
              <Text style={styles.emptyStateSubtext}>
                There are no outstanding balances in this group
              </Text>
            </View>
          }
        />
      )}
      
      <View style={styles.actionButtons}>
        {activeTab === 'expenses' && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleCreateExpense}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Add Expense</Text>
          </TouchableOpacity>
        )}
        
        {activeTab === 'members' && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleAddMember}
          >
            <Ionicons name="person-add-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Add Member</Text>
          </TouchableOpacity>
        )}
        
        {activeTab === 'settle' && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              // Navigate to settle up confirmation screen
              router.push({
                pathname: '/settle',
                params: { groupId }
              });
            }}
          >
            <Ionicons name="swap-horizontal-outline" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Settle Up</Text>
          </TouchableOpacity>
        )}
      </View>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  groupName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#5C6BC0',
  },
  tabText: {
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#5C6BC0',
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
  expenseDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  expenseAmountContainer: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  expensePayer: {
    fontSize: 12,
    color: '#6B7280',
  },
  memberItem: {
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
  memberIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5C6BC0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  memberBalance: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  positiveBalance: {
    color: '#10B981',
  },
  negativeBalance: {
    color: '#EF4444',
  },
  neutralBalance: {
    color: '#6B7280',
  },
  settlementItem: {
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
  settlementIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5C6BC0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settlementDetails: {
    flex: 1,
  },
  settlementText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  settlementAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
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
  actionButtons: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#5C6BC0',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
}); 