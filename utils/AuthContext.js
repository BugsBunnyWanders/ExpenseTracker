import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { checkDatabaseAvailability, createProfile, getCurrentUser, signIn, signUp, supabase, resetPassword as supabaseResetPassword, signOut as supabaseSignOut, updateUserProfile as updateSupabaseProfile } from '../services/supabase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dbAvailable, setDbAvailable] = useState(true);

  // Check database availability on mount
  useEffect(() => {
    const checkDb = async () => {
      try {
        console.log('Checking database availability...');
        const { available, tables } = await checkDatabaseAvailability();
        
        // Log the full tables array for debugging
        console.log('Tables returned:', tables);
        
        if (!available) {
          console.error('Database not available');
          setDbAvailable(false);
          return;
        }
        
        // Check if tables is an array and has at least one item
        if (!Array.isArray(tables) || tables.length === 0) {
          console.error('No tables returned from database');
          setDbAvailable(false);
          return;
        }
        
        // Check if profiles table exists
        // First check if the array items have table_name property
        const hasTableNameProperty = tables[0] && 'table_name' in tables[0];
        
        if (hasTableNameProperty) {
          // Standard format where each item has a table_name property
          const profilesExists = tables.some(t => t.table_name === 'profiles');
          console.log(`Profiles table exists: ${profilesExists ? 'Yes' : 'No'}`);
          
          if (!profilesExists) {
            console.error('Profiles table not found in database');
            setDbAvailable(false);
            return;
          }
        } else {
          // Alternative: tables might be returned as an array of strings
          const profilesExists = tables.includes('profiles');
          console.log(`Profiles table exists (string format): ${profilesExists ? 'Yes' : 'No'}`);
          
          if (!profilesExists) {
            console.error('Profiles table not found in database');
            setDbAvailable(false);
            return;
          }
        }
        
        // Direct check to verify profiles table access
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);
            
          if (profileError) {
            console.error('Cannot access profiles table directly:', profileError);
            setDbAvailable(false);
            return;
          }
          
          // If we get here, the database and profiles table are available
          console.log('Database and profiles table confirmed available');
          setDbAvailable(true);
        } catch (err) {
          console.error('Error checking profiles table access:', err);
          setDbAvailable(false);
        }
      } catch (err) {
        console.error('Error in database check:', err);
        setDbAvailable(false);
      }
    };
    
    checkDb();
  }, []);

  // Centralized error handler
  const handleError = (operation, err) => {
    console.error(`Error in ${operation}:`, err);
    
    // Handle empty error objects - likely means missing tables
    if (err && Object.keys(err).length === 0) {
      const errorMsg = `Operation failed. Database tables may not be set up correctly. Please check setup instructions and run the setup SQL script in Supabase.`;
      console.error(errorMsg);
      setError(errorMsg);
      setDbAvailable(false);
      return errorMsg;
    }
    
    // Extract meaningful message
    const errorMsg = err.message || err.error_description || `${operation} failed`;
    setError(errorMsg);
    return errorMsg;
  };

  // Sign up function
  const signup = async (email, password, name) => {
    try {
      setError('');
      console.log('Starting signup process', { email, name });
      
      // Check if database is available first
      if (!dbAvailable) {
        const errorMsg = "Database tables are not properly set up. Please check setup instructions.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Create user in Supabase Auth with emailConfirmationRequired set to false
      const { user, session } = await signUp(email, password, {
        data: { name }
      });
      
      if (!user) {
        console.error('No user returned from signup');
        setError('Registration failed. No user data returned.');
        throw new Error('Registration failed');
      }

      console.log('Auth signup response:', { user, session });
      
      // Session should be available immediately if email confirmation is disabled
      // If we have a session, user is already confirmed and we can proceed
      if (session) {
        console.log('User session available immediately - email confirmation bypassed');
        
        try {
          // Create user profile in the profiles table
          await createProfile(user.id, {
            name,
            email,
            profile_picture: '',
          });
          console.log('Profile created successfully');
          
          // Set current user
          setCurrentUser(user);
          return user;
        } catch (profileErr) {
          // Don't fail the signup process if profile creation fails
          console.error('Exception in profile creation:', profileErr);
          const errorMsg = handleError('Profile creation', profileErr);
          // Continue anyway since auth user was created
          setCurrentUser(user);
          return user;
        }
      }
      
      // Fallback for cases where session isn't immediately available
      // Try to log in automatically to bypass email confirmation
      try {
        console.log('No session available, attempting direct login');
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (loginError) {
          console.error('Auto-login failed:', loginError);
          setError('Registration successful but could not log in automatically. Please try logging in manually.');
          return user;
        }
        
        if (loginData && loginData.user) {
          console.log('Auto-login successful');
          
          try {
            // Create user profile in the profiles table
            await createProfile(loginData.user.id, {
              name,
              email,
              profile_picture: '',
            });
            console.log('Profile created successfully after auto-login');
          } catch (profileErr) {
            console.error('Exception in profile creation after auto-login:', profileErr);
          }
          
          setCurrentUser(loginData.user);
          return loginData.user;
        }
      } catch (autoLoginErr) {
        console.error('Auto-login exception:', autoLoginErr);
        // Return the original user anyway
      }
      
      return user;
    } catch (err) {
      const errorMsg = handleError('Signup process', err);
      throw new Error(errorMsg);
    }
  };

  // Sign in function
  const login = async (email, password) => {
    try {
      setError('');
      const data = await signIn(email, password);
      setCurrentUser(data.user);
      return data.user;
    } catch (err) {
      const errorMsg = handleError('Login', err);
      throw new Error(errorMsg);
    }
  };

  // Sign out function
  const logout = async () => {
    try {
      setError('');
      await supabaseSignOut();
      setCurrentUser(null);
      await AsyncStorage.removeItem('user');
    } catch (err) {
      const errorMsg = handleError('Logout', err);
      throw new Error(errorMsg);
    }
  };

  // Reset password function
  const resetPassword = async (email) => {
    try {
      setError('');
      await supabaseResetPassword(email);
    } catch (err) {
      const errorMsg = handleError('Reset password', err);
      throw new Error(errorMsg);
    }
  };

  // Get user profile data with retry mechanism
  const getUserProfile = async (userId) => {
    try {
      console.log('Getting user profile for:', userId);
      
      // First check if the profiles table exists
      if (!dbAvailable) {
        const errorMsg = "Cannot get user profile - database tables are not properly set up";
        console.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        // If not found, try to create a profile
        if (error.code === 'PGRST116') { // Not found
          console.log('Profile not found, trying to create');
          
          // Get user details from auth to create profile
          const authUser = await getCurrentUser();
          if (authUser && authUser.id === userId) {
            return await createProfile(userId, {
              name: authUser.user_metadata?.name || '',
              email: authUser.email || '',
              profile_picture: ''
            });
          }
        } else if (Object.keys(error).length === 0) {
          // Empty error object suggests table doesn't exist
          setDbAvailable(false);
          throw new Error("Database tables aren't set up correctly. Please run the setup script.");
        }
        
        const errorMsg = handleError('Get user profile', error);
        throw new Error(errorMsg);
      }
      
      console.log('Retrieved user profile:', data);
      return data;
    } catch (err) {
      const errorMsg = handleError('Get user profile', err);
      throw new Error(errorMsg);
    }
  };

  // Update user profile
  const updateUserProfile = async (userId, data) => {
    try {
      setError('');
      console.log('Updating user profile:', userId, data);
      
      // Check if database is available first
      if (!dbAvailable) {
        const errorMsg = "Database tables are not properly set up. Please check setup instructions.";
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Validate userId is provided
      if (!userId) {
        const errorMsg = "User ID is undefined or invalid";
        console.error(errorMsg);
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      
      const result = await updateSupabaseProfile(userId, {
        ...data,
        updated_at: new Date().toISOString()
      });
      console.log('Profile update result:', result);
      return result;
    } catch (err) {
      const errorMsg = handleError('Update profile', err);
      throw new Error(errorMsg);
    }
  };

  // Check for auth state changes
  useEffect(() => {
    // Check for the current user session on component mount
    const checkUser = async () => {
      try {
        console.log('Checking current user session...');
        const user = await getCurrentUser();
        
        if (user) {
          console.log('User session found:', user.id);
          try {
            const userProfile = await getUserProfile(user.id);
            setCurrentUser({ ...user, ...userProfile });
            await AsyncStorage.setItem('user', JSON.stringify({ ...user, ...userProfile }));
          } catch (error) {
            console.error('Error getting user profile:', error);
            setCurrentUser(user);
            await AsyncStorage.setItem('user', JSON.stringify(user));
          }
        } else {
          console.log('No user session found');
          setCurrentUser(null);
          await AsyncStorage.removeItem('user');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error checking auth:', error);
        handleError('Check user session', error);
        setLoading(false);
      }
    };
    
    checkUser();
    
    // Set up listener for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session ? 'session exists' : 'no session');
      
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const userProfile = await getUserProfile(session.user.id);
          setCurrentUser({ ...session.user, ...userProfile });
          await AsyncStorage.setItem('user', JSON.stringify({ ...session.user, ...userProfile }));
        } catch (error) {
          console.error('Error getting user profile after sign in:', error);
          setCurrentUser(session.user);
          await AsyncStorage.setItem('user', JSON.stringify(session.user));
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        await AsyncStorage.removeItem('user');
      }
    });
    
    // Clean up listener
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [dbAvailable]);

  const value = {
    currentUser,
    login,
    signup,
    logout,
    resetPassword,
    updateUserProfile,
    getUserProfile,
    loading,
    error,
    dbAvailable
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 