import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { logFirebaseInit } from '../utils/firebase-debug';

// Log initialization
console.log('Starting Firebase initialization');
logFirebaseInit('config');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCOyWozED5ag5mXwbr5n0pDmkRIpJ3w2Lw",
  authDomain: "splitwise-e6f11.firebaseapp.com",
  projectId: "splitwise-e6f11",
  storageBucket: "splitwise-e6f11.firebasestorage.app",
  messagingSenderId: "280323461991",
  appId: "1:280323461991:web:d0c7c86f33ee950ffb15c2",
  measurementId: "G-2MYQ6C9QVG"
};

// Initialize Firebase
logFirebaseInit('app');
const app = initializeApp(firebaseConfig);

// Initialize Firebase auth with AsyncStorage persistence
logFirebaseInit('auth');
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize other Firebase services
logFirebaseInit('services');
export const db = getFirestore(app);
export const storage = getStorage(app);

console.log('Firebase initialization complete');
logFirebaseInit('complete');

