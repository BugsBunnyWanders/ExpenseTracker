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
import { addUserToGroup, getGroupById } from '../services/groupService';
import { searchUsersByEmail } from '../services/userService';
import { useAuth } from '../utils/AuthContext';

export default function AddMemberScreen() {
  const { groupId } = useLocalSearchParams();
  const { currentUser } = useAuth();
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);

  // Load current group members
  React.useEffect(() => {
    if (groupId) {
      loadGroupMembers();
    }
  }, [groupId]);

  const loadGroupMembers = async () => {
    try {
      setIsLoading(true);
      const group = await getGroupById(groupId);
      if (group && group.members) {
        setGroupMembers(group.members);
      }
    } catch (error) {
      console.error('Error loading group members:', error);
      Alert.alert('Error', 'Failed to load group members.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    try {
      setIsLoading(true);
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
          onChangeText={setSearchQuery}
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
      
      <FlatList
        data={searchResults}
        renderItem={renderSearchResultItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {searchQuery.trim() ? 'No users found' : 'Search for users by email'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery.trim() 
                ? 'Try a different email address' 
                : 'Enter an email address to find users'
              }
            </Text>
          </View>
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
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    height: 46,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1F2937',
    marginRight: 10,
  },
  searchButton: {
    width: 46,
    height: 46,
    backgroundColor: '#5C6BC0',
    borderRadius: 8,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#5C6BC0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
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
  doneButton: {
    backgroundColor: '#5C6BC0',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
}); 