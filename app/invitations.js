import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { declineInvitation } from '../services/emailService';
import { useAuth } from '../utils/AuthContext';
import { useInvitation } from '../utils/InvitationContext';

export default function InvitationsScreen() {
  const { pendingInvitations, loading, checkForInvitations, acceptInvitation } = useInvitation();
  const { currentUser } = useAuth();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (currentUser) {
      checkForInvitations();
    }
  }, [currentUser]);

  const handleAcceptInvitation = async (invitation) => {
    try {
      setIsProcessing(true);
      const success = await acceptInvitation(invitation.id);
      
      if (success) {
        Alert.alert(
          'Invitation Accepted',
          `You have successfully joined "${invitation.group.name}".`,
          [
            {
              text: 'View Group',
              onPress: () => router.push({
                pathname: `/group/${invitation.group_id}`,
              })
            }
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to accept invitation. Please try again.');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'An error occurred while accepting the invitation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineInvitation = async (invitation) => {
    try {
      setIsProcessing(true);
      
      // Confirm before declining
      Alert.alert(
        'Decline Invitation',
        `Are you sure you want to decline the invitation to "${invitation.group.name}"?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setIsProcessing(false)
          },
          {
            text: 'Decline',
            style: 'destructive',
            onPress: async () => {
              const success = await declineInvitation(invitation.id);
              
              if (success) {
                // Refresh invitations
                checkForInvitations();
                Alert.alert('Invitation Declined', 'The invitation has been declined.');
              } else {
                Alert.alert('Error', 'Failed to decline invitation. Please try again.');
              }
              setIsProcessing(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error declining invitation:', error);
      Alert.alert('Error', 'An error occurred while declining the invitation.');
      setIsProcessing(false);
    }
  };

  const renderInvitationItem = ({ item }) => (
    <View style={styles.invitationItem}>
      <View style={styles.invitationIconContainer}>
        <Ionicons name="people" size={20} color="#fff" />
      </View>
      
      <View style={styles.invitationDetails}>
        <Text style={styles.groupName}>{item.group.name}</Text>
        <Text style={styles.invitedBy}>Invited by {item.invited_by}</Text>
        <Text style={styles.invitationDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        
        <View style={styles.invitationActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAcceptInvitation(item)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>Accept</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={() => handleDeclineInvitation(item)}
            disabled={isProcessing}
          >
            <Text style={styles.actionButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading && !pendingInvitations.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5C6BC0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={pendingInvitations}
        renderItem={renderInvitationItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="mail-open-outline" size={60} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>No Pending Invitations</Text>
            <Text style={styles.emptyStateSubtext}>
              You don't have any pending group invitations at the moment.
            </Text>
          </View>
        }
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
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  invitationItem: {
    flexDirection: 'row',
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
  invitationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5C6BC0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  invitationDetails: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  invitedBy: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 2,
  },
  invitationDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  invitationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginRight: 8,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
}); 