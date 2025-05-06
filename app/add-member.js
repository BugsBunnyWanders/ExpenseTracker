import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { sendGroupInvitation } from '../services/emailService';
import { addUserToGroup, getGroupById } from '../services/groupService';
import { searchUsersByEmail } from '../services/userService';
import { useAuth } from '../utils/AuthContext';
import { getUserName } from '../utils/UserAdapter';

export default function AddMemberScreen() {
  const { groupId } = useLocalSearchParams();
  const { currentUser } = useAuth();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [group, setGroup] = useState(null);
  const [isEmailValid, setIsEmailValid] = useState(false);

  // Load current group members
  React.useEffect(() => {
    if (groupId) {
      loadGroupMembers();
    }
  }, [groupId]);

  const loadGroupMembers = async () => {
    try {
      setIsLoading(true);
      const groupData = await getGroupById(groupId);
      if (groupData && groupData.members) {
        setGroupMembers(groupData.members);
        setGroup(groupData);
      }
    } catch (error) {
      console.error('Error loading group members:', error);
      Alert.alert('Error', 'Failed to load group members.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    try {
      setIsLoading(true);

      // Check if the input is a valid email
      const isValidEmail = validateEmail(searchQuery);
      setIsEmailValid(isValidEmail);

      // Search for existing users
      const users = await searchUsersByEmail(searchQuery);
      
      // Filter out current user and already added members
      const filteredUsers = users.filter(user => 
        user.id !== currentUser.uid && 
        !groupMembers.includes(user.id)
      );
      
      setSearchResults(filteredUsers);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (userId) => {
    try {
      setIsLoading(true);
      
      // Add user to group
      await addUserToGroup(groupId, userId);
      
      // Update local state
      setGroupMembers(prevMembers => [...prevMembers, userId]);
      
      // Remove from search results
      setSearchResults(prevResults => 
        prevResults.filter(user => user.id !== userId)
      );
      
      Alert.alert('Success', 'Member added to group.');
    } catch (error) {
      console.error('Error adding member:', error);
      Alert.alert('Error', 'Failed to add member to group.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteByEmail = async () => {
    try {
      if (!validateEmail(searchQuery)) {
        Alert.alert('Invalid Email', 'Please enter a valid email address.');
        return;
      }

      if (!group) {
        Alert.alert('Error', 'Group information not available.');
        return;
      }

      setIsLoading(true);
      
      // Get current user's name for the invitation
      const inviterName = getUserName(currentUser);
      
      // Send the invitation
      const success = await sendGroupInvitation(
        searchQuery,
        groupId,
        group.name,
        inviterName
      );
      
      if (success) {
        Alert.alert(
          'Invitation Sent',
          `An invitation has been sent to ${searchQuery} to join "${group.name}".`
        );
        setSearchQuery('');
      } else {
        Alert.alert(
          'Invitation Failed',
          'Unable to send the invitation at this time. Please try again later.'
        );
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      Alert.alert('Error', 'Failed to send invitation.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSearchResultItem = ({ item }) => (
    <View style={styles.userItem}>
      <View style={styles.userIconContainer}>
        <Text style={styles.userIcon}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.userDetails}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => handleAddMember(item.id)}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="add" size={20} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Group Member</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={text => {
            setSearchQuery(text);
            setIsEmailValid(validateEmail(text));
          }}
          placeholder="Search by email..."
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="search" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
      
      {/* Show invite button when valid email is entered but no users found */}
      {isEmailValid && searchResults.length === 0 && searchQuery && !isLoading && (
        <View style={styles.inviteContainer}>
          <Text style={styles.inviteText}>
            No existing user found with this email.
          </Text>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={handleInviteByEmail}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="mail" size={18} color="#fff" style={styles.inviteIcon} />
                <Text style={styles.inviteButtonText}>
                  Invite {searchQuery} to join
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
      
      <FlatList
        data={searchResults}
        renderItem={renderSearchResultItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          !isEmailValid || isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery.trim() ? 'No users found' : 'Search for users by email'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery.trim() 
                  ? 'Try a different email address or invite a new user' 
                  : 'Enter an email address to find or invite users'
                }
              </Text>
            </View>
          ) : null
        }
      />
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.doneButton}
          onPress={() => router.back()}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: '#5C6BC0',
    borderRadius: 10,
    width: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 20,
    flexGrow: 1,
  },
  userItem: {
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
  userIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5C6BC0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  addButton: {
    backgroundColor: '#5C6BC0',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
  actionButtons: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  doneButton: {
    backgroundColor: '#5C6BC0',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  inviteContainer: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#EBF4FF',
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#4F46E5',
  },
  inviteText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
  },
  inviteButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  inviteIcon: {
    marginRight: 8,
  },
  inviteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
}); 