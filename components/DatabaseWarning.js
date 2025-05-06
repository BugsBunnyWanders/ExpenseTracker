import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../utils/AuthContext';

const DatabaseWarning = () => {
  const { dbAvailable } = useAuth();

  if (dbAvailable) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.warningBox}>
        <Text style={styles.title}>Database Setup Required</Text>
        <Text style={styles.message}>
          The app has detected that some database tables are missing. This is likely because you 
          need to run the setup script in Supabase.
        </Text>
        <Text style={styles.instructions}>
          Please follow these steps:
        </Text>
        <Text style={styles.step}>
          1. Log in to your Supabase dashboard
        </Text>
        <Text style={styles.step}>
          2. Navigate to the SQL Editor
        </Text>
        <Text style={styles.step}>
          3. Copy the SQL from scripts/setup-supabase.js
        </Text>
        <Text style={styles.step}>
          4. Paste it into the editor and click "Run"
        </Text>
        <Text style={styles.step}>
          5. After running, restart this app
        </Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => Linking.openURL('https://app.supabase.com')}
        >
          <Text style={styles.buttonText}>Open Supabase Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  warningBox: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#d9534f',
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    marginBottom: 15,
    lineHeight: 22,
    color: '#333',
  },
  instructions: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  step: {
    fontSize: 14,
    marginBottom: 5,
    paddingLeft: 10,
    color: '#333',
  },
  button: {
    backgroundColor: '#5cb85c',
    padding: 12,
    borderRadius: 5,
    marginTop: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  }
});

export default DatabaseWarning; 