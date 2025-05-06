import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { getGroupById } from '../services/groupService';
import { calculateSettlementPlan, createSettlement } from '../services/settlementService';
import { getUsersByIds } from '../services/userService';
import { useAuth } from '../utils/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { getUserId } from '../utils/UserAdapter';

export default function SettleScreen() {
  const params = useLocalSearchParams();
  const { groupId } = params;
  const { currentUser } = useAuth();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState({});
  const [settlementPlan, setSettlementPlan] = useState([]);
  const [selectedSettlements, setSelectedSettlements] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (!groupId) {
      Alert.alert('Error', 'No group specified');
      router.back();
      return;
    }
    
    loadGroupData();
  }, [groupId]);
  
  const loadGroupData = async () => {
    try {
      setIsLoading(true);
      
      // Get group details
      const groupData = await getGroupById(groupId);
      if (!groupData) {
        Alert.alert('Error', 'Group not found');
        router.back();
        return;
      }
      setGroup(groupData);
      
      // Get members data
      const membersData = await getUsersByIds(groupData.members || []);
      setMembers(membersData);
      
      // Calculate settlement plan
      const plan = await calculateSettlementPlan(groupId);
      setSettlementPlan(plan);
      
      // Initialize selected settlements
      const initialSelected = {};
      plan.forEach((settlement, index) => {
        initialSelected[index] = false;
      });
      setSelectedSettlements(initialSelected);
      
    } catch (error) {
      console.error('Error loading group data for settlement:', error);
      Alert.alert('Error', 'Failed to load group data. Please try again.');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };
  
  const toggleSettlementSelection = (index) => {
    setSelectedSettlements({
      ...selectedSettlements,
      [index]: !selectedSettlements[index]
    });
  };
  
  const handleSettleSelected = async () => {
    // Check if any settlements are selected
    const hasSelected = Object.values(selectedSettlements).some(val => val);
    if (!hasSelected) {
      Alert.alert('No Settlements Selected', 'Please select at least one settlement to process.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const userId = getUserId(currentUser);
      const selectedSettlementsArr = Object.entries(selectedSettlements)
        .filter(([_, isSelected]) => isSelected)
        .map(([index]) => settlementPlan[Number(index)]);
      
      // Create settlement records for each selected settlement
      for (const settlement of selectedSettlementsArr) {
        await createSettlement({
          from_user: settlement.payerId,
          to_user: settlement.payeeId,
          amount: settlement.amount,
          group_id: groupId,
          status: 'completed',
          notes: 'Settled via ExpenseTracker app',
          created_by: userId
        });
      }
      
      Alert.alert(
        'Success',
        'The selected settlements have been recorded.',
        [
          { 
            text: 'OK', 
            onPress: () => router.push({
              pathname: `/group/${groupId}`
            }) 
          }
        ]
      );
      
    } catch (error) {
      console.error('Error recording settlements:', error);
      Alert.alert('Error', 'Failed to record settlements. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const renderSettlementItem = ({ item, index }) => {
    const payer = members[item.payerId]?.name || 'Unknown';
    const payee = members[item.payeeId]?.name || 'Unknown';
    const isSelected = selectedSettlements[index];
    
    return (
      <TouchableOpacity 
        style={[
          styles.settlementItem,
          isSelected ? styles.selectedSettlementItem : null
        ]}
        onPress={() => toggleSettlementSelection(index)}
      >
        <View style={styles.checkboxContainer}>
          <View style={[
            styles.checkbox, 
            isSelected ? styles.checkboxSelected : null
          ]}>
            {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
          </View>
        </View>
        
        <View style={styles.settlementContent}>
          <View style={styles.settlementIconContainer}>
            <Ionicons name="swap-horizontal-outline" size={20} color="#fff" />
          </View>
          
          <View style={styles.settlementDetails}>
            <Text style={styles.settlementText}>
              <Text style={styles.settlementName}>{payer}</Text> pays{' '}
              <Text style={styles.settlementName}>{payee}</Text>
            </Text>
            <Text style={styles.settlementDate}>
              {new Date().toLocaleDateString()}
            </Text>
          </View>
          
          <Text style={styles.settlementAmount}>{formatCurrency(item.amount)}</Text>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="checkmark-circle-outline" size={60} color="#10B981" />
      <Text style={styles.emptyStateText}>Everyone is settled up!</Text>
      <Text style={styles.emptyStateSubtext}>
        There are no outstanding balances in this group
      </Text>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>Back to Group</Text>
      </TouchableOpacity>
    </View>
  );
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5C6BC0" />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#5C6BC0" />
        </TouchableOpacity>
        <Text style={styles.title}>Settle Up</Text>
        <View style={styles.placeholder} />
      </View>
      
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{group?.name || 'Group'}</Text>
        <Text style={styles.groupDescription}>
          Select the settlements to record as completed
        </Text>
      </View>
      
      <FlatList
        data={settlementPlan}
        renderItem={renderSettlementItem}
        keyExtractor={(_, index) => `settlement-item-${index}`}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
      />
      
      {settlementPlan.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.settleButton}
            onPress={handleSettleSelected}
            disabled={isSubmitting || !Object.values(selectedSettlements).some(val => val)}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.settleButtonText}>Record Selected Settlements</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  groupInfo: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  groupDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
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
  selectedSettlementItem: {
    backgroundColor: '#EBF4FF',
    borderColor: '#5C6BC0',
    borderWidth: 1,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#5C6BC0',
    borderColor: '#5C6BC0',
  },
  settlementContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  settlementName: {
    fontWeight: 'bold',
  },
  settlementDate: {
    fontSize: 12,
    color: '#6B7280',
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
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#5C6BC0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  settleButton: {
    backgroundColor: '#5C6BC0',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settleButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
}); 