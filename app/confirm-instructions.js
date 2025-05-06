import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ConfirmInstructions() {
  const router = useRouter();

  const handleEmailConfirmed = () => {
    router.push('/confirm-success');
  };

  const handleBackToLogin = () => {
    router.replace('/login');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail" size={70} color="#5C6BC0" />
        </View>
        
        <Text style={styles.title}>Check Your Email</Text>
        
        <Text style={styles.message}>
          We've sent a confirmation link to your email address. Please check your inbox and follow these steps:
        </Text>
        
        <View style={styles.stepsContainer}>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>Open the email from ExpenseTracker</Text>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>Click the confirmation link in the email</Text>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>You'll be redirected to a webpage (this is normal)</Text>
          </View>
          
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.stepText}>Return to this app and click the button below</Text>
          </View>
        </View>

        <View style={styles.noteContainer}>
          <Text style={styles.noteTitle}>Note:</Text>
          <Text style={styles.noteText}>
            The confirmation email might take a few minutes to arrive. If you don't see it, check your spam folder.
          </Text>
        </View>
        
        <TouchableOpacity style={styles.primaryButton} onPress={handleEmailConfirmed}>
          <Text style={styles.primaryButtonText}>I've Confirmed My Email</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton} onPress={handleBackToLogin}>
          <Text style={styles.secondaryButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  iconContainer: {
    marginBottom: 25,
    backgroundColor: '#E8EAF6',
    padding: 20,
    borderRadius: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 24,
  },
  stepsContainer: {
    width: '100%',
    marginBottom: 25,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#5C6BC0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  noteContainer: {
    backgroundColor: '#FFF9C4',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    marginBottom: 25,
  },
  noteTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    fontSize: 16,
  },
  noteText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#5C6BC0',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#5C6BC0',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#5C6BC0',
    fontSize: 16,
    fontWeight: '600',
  },
}); 