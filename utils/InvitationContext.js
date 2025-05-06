import { useRouter } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { acceptInvitation, getPendingInvitations } from '../services/emailService';
import { useAuth } from './AuthContext';

// Create the context
const InvitationContext = createContext();

// Custom hook to use the invitation context
export const useInvitation = () => {
  return useContext(InvitationContext);
};

// Provider component for the invitation context
export function InvitationProvider({ children }) {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Check for pending invitations whenever the user changes
  useEffect(() => {
    if (currentUser) {
      checkForInvitations();
    } else {
      setPendingInvitations([]);
    }
  }, [currentUser]);

  // Function to check for pending invitations
  const checkForInvitations = async () => {
    if (!currentUser || !currentUser.email) return;
    
    try {
      setLoading(true);
      const invitations = await getPendingInvitations(currentUser.email);
      
      setPendingInvitations(invitations);
      
      // If there are pending invitations, prompt the user
      if (invitations.length > 0) {
        Alert.alert(
          'Group Invitations',
          `You have ${invitations.length} pending group invitation(s).`,
          [
            {
              text: 'View Later',
              style: 'cancel'
            },
            {
              text: 'View Now',
              onPress: () => router.push('/invitations')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error checking for invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to accept an invitation
  const handleAcceptInvitation = async (invitationId) => {
    if (!currentUser) return false;
    
    try {
      setLoading(true);
      const success = await acceptInvitation(invitationId, currentUser.id);
      
      if (success) {
        // Update the local state to remove the accepted invitation
        setPendingInvitations(prev => 
          prev.filter(invitation => invitation.id !== invitationId)
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Provide the context values to children
  const value = {
    pendingInvitations,
    loading,
    checkForInvitations,
    acceptInvitation: handleAcceptInvitation
  };

  return (
    <InvitationContext.Provider value={value}>
      {children}
    </InvitationContext.Provider>
  );
} 