import { Stack } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';
import AppWrapper from '../components/AppWrapper';
import { AuthProvider } from '../utils/AuthContext';
import { InvitationProvider } from '../utils/InvitationContext';
import { RefreshProvider } from '../utils/RefreshContext';

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on /modal works
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <InvitationProvider>
        <RefreshProvider>
          <AppWrapper>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="register" options={{ headerShown: false }} />
              <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
              <Stack.Screen name="invitations" options={{ title: "Group Invitations" }} />
            </Stack>
          </AppWrapper>
        </RefreshProvider>
      </InvitationProvider>
    </AuthProvider>
  );
}
