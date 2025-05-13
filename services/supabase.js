import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://mlfegeoozgkapwggmuhe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZmVnZW9vemdrYXB3Z2dtdWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTA4MTAsImV4cCI6MjA2MjAyNjgxMH0.EvwKPuGny258CMHSiSxhrwevHeOP_EwWTeQIoCcNDcc';

// Create a custom fetch implementation that doesn't use WebSockets
const fetchWithoutWebsocket = (...args) => {
  // Check if the URL includes 'realtime' which would indicate a WebSocket connection
  const url = args[0].url || args[0];
  if (typeof url === 'string' && url.includes('realtime')) {
    console.warn('WebSocket connection attempt blocked: ', url);
    return Promise.reject(new Error('WebSocket connections are disabled'));
  }
  
  // Block any ws:// or wss:// URLs
  if (typeof url === 'string' && (url.startsWith('ws:') || url.startsWith('wss:'))) {
    console.warn('WebSocket URL blocked: ', url);
    return Promise.reject(new Error('WebSocket URLs are disabled'));
  }
  
  return fetch(...args);
};

// Enhanced logging function for debugging
const logSupabaseOperation = (operation, data, error) => {
  if (error) {
    console.error(`Supabase ${operation} error:`, error);
    
    if (Object.keys(error).length === 0) {
      console.error(`Empty error object received. This might be due to missing tables or incorrect permissions.`);
    } else {
      console.error(`Error details:`, JSON.stringify(error, null, 2));
    }
  } else {
    console.log(`Supabase ${operation} successful:`, data ? 'data received' : 'no data');
  }
};

// Ensure WebSocket constructor is mocked if it exists
if (typeof WebSocket !== 'undefined') {
  const originalWebSocket = WebSocket;
  global.WebSocket = function MockWebSocket(url) {
    console.warn('WebSocket constructor intercepted and blocked', url);
    return {
      addEventListener: () => {},
      removeEventListener: () => {},
      send: () => {},
      close: () => {}
    };
  };
  // Preserve any properties from the original WebSocket
  if (originalWebSocket) {
    Object.keys(originalWebSocket).forEach(key => {
      global.WebSocket[key] = originalWebSocket[key];
    });
  }
}

// Create Supabase client with custom fetch implementation to avoid WebSocket connections
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: fetchWithoutWebsocket,
  },
  // Explicitly disable realtime subscriptions
  realtime: {
    enabled: false,
    autoConnect: false,
    forceWebsocketsOnlyAddressScheme: false,
  },
  // Add Node.js compatibility mode for React Native
  db: {
    schema: 'public',
  },
});

// Monkey patch the Supabase client to block any attempt to use WebSockets
if (supabase && supabase.realtime) {
  // Override connect method to do nothing
  supabase.realtime.connect = () => {
    console.warn('Realtime connect attempt blocked');
    return Promise.resolve();
  };
  
  // Override subscribe method to return a dummy subscription
  const originalSubscribe = supabase.realtime.channel;
  supabase.realtime.channel = (topic, opts = {}) => {
    console.warn('Realtime subscription attempt blocked for topic:', topic);
    return {
      on: () => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) }),
      subscribe: () => ({ unsubscribe: () => {} })
    };
  };
}

// Helper functions for authentication
export const signUp = async (email, password, options = {}) => {
  const signUpOptions = { 
    email, 
    password,
    options: {
      // Set data from options
      data: options.data || {},
      // Set email redirect to the app URL
      emailRedirectTo: 'exp://192.168.29.156:8081',
      // This is the most important part - disable email confirmation
      emailConfirmationRequired: false
    }
  };
  
  const { data, error } = await supabase.auth.signUp(signUpOptions);
  logSupabaseOperation('signUp', data, error);
  if (error) throw error;
  return data;
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  logSupabaseOperation('signIn', data, error);
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  logSupabaseOperation('signOut', null, error);
  if (error) throw error;
};

export const resetPassword = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  logSupabaseOperation('resetPassword', null, error);
  if (error) throw error;
};

// Check database service availability
export const checkDatabaseAvailability = async () => {
  try {
    // Try to list all table names in the public schema
    const { data, error } = await supabase.rpc('get_table_names');
    
    if (error) {
      console.error('Database availability check failed:', error);
      return { available: false, error };
    }
    
    return { available: true, tables: data };
  } catch (err) {
    console.error('Database availability check exception:', err);
    return { available: false, error: err };
  }
};

// User profile functions
export const updateUserProfile = async (userId, userData) => {
  console.log(`Updating user profile for ${userId}:`, userData);
  
  try {
    // Check if userId is valid
    if (!userId || userId === 'undefined' || userId === 'null') {
      console.error('Invalid or undefined user ID provided for profile update');
      throw new Error('Invalid user ID');
    }
    
    // Check if profile exists first
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (checkError) {
      // If no profile exists, try to create one
      if (checkError.code === 'PGRST116') { // Not found
        console.log(`No profile found for user ${userId}, creating one`);
        return await createProfile(userId, userData);
      } else {
        throw checkError;
      }
    }
    
    // Profile exists, update it
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...userData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('*');
    
    logSupabaseOperation('updateUserProfile', data, error);
    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`Error updating profile for user ${userId}:`, err);
    throw err;
  }
};

// Create a user profile
export const createProfile = async (userId, userData) => {
  console.log(`Creating user profile for ${userId}:`, userData);
  
  try {
    // Check if userId is valid
    if (!userId || userId === 'undefined' || userId === 'null') {
      console.error('Invalid or undefined user ID provided for profile creation');
      throw new Error('Invalid user ID');
    }
    
    const profileData = {
      id: userId,
      name: userData.name || '',
      email: userData.email || '',
      profile_picture: userData.profile_picture || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('profiles')
      .insert(profileData)
      .select('*');
    
    logSupabaseOperation('createProfile', data, error);
    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`Error creating profile for user ${userId}:`, err);
    throw err;
  }
};

// Current user session
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getSession();
  logSupabaseOperation('getCurrentUser', data, error);
  if (error) throw error;
  return data?.session?.user || null;
};

// Database helper functions with improved error handling
export const getDataFromTable = async (table, query = {}) => {
  console.log(`Getting data from ${table} with query:`, query);
  
  try {
    // First check if the table exists
    const { available, tables } = await checkDatabaseAvailability();
    if (!available || !tableExists(tables, table)) {
      console.error(`Table "${table}" does not exist or is not accessible`);
      throw new Error(`Table "${table}" does not exist or is not accessible`);
    }
    
    let supabaseQuery = supabase.from(table).select('*');
    
    if (query.filter) {
      const { column, operator, value } = query.filter;
      supabaseQuery = supabaseQuery.filter(column, operator, value);
    }
    
    if (query.equals) {
      Object.entries(query.equals).forEach(([column, value]) => {
        supabaseQuery = supabaseQuery.eq(column, value);
      });
    }
    
    if (query.order) {
      supabaseQuery = supabaseQuery.order(query.order.column, { ascending: query.order.ascending });
    }
    
    if (query.limit) {
      supabaseQuery = supabaseQuery.limit(query.limit);
    }
    
    const { data, error } = await supabaseQuery;
    logSupabaseOperation(`getDataFromTable:${table}`, data, error);
    
    if (error) {
      if (error.code === '42P01') { // Table doesn't exist
        console.error(`Table "${table}" does not exist. Please run the setup script`);
        throw new Error(`Table "${table}" does not exist. Please run the setup script`);
      }
      throw error;
    }
    
    return data || [];
  } catch (err) {
    console.error(`Error fetching data from ${table}:`, err);
    throw err;
  }
};

export const insertData = async (table, data) => {
  console.log(`Inserting data into ${table}:`, data);
  
  try {
    // First check if the table exists
    const { available, tables } = await checkDatabaseAvailability();
    if (!available || !tableExists(tables, table)) {
      console.error(`Table "${table}" does not exist or is not accessible`);
      throw new Error(`Table "${table}" does not exist or is not accessible`);
    }
    
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select('*');
    
    logSupabaseOperation(`insertData:${table}`, result, error);
    
    if (error) {
      if (error.code === '42P01') { // Table doesn't exist
        throw new Error(`Table "${table}" does not exist. Please run the setup script`);
      }
      throw error;
    }
    
    return result || [];
  } catch (err) {
    console.error(`Error in insertData for ${table}:`, err);
    throw err;
  }
};

export const updateData = async (table, id, data) => {
  console.log(`Updating ${table} with id ${id}:`, data);
  
  try {
    // First check if the table exists
    const { available, tables } = await checkDatabaseAvailability();
    if (!available || !tableExists(tables, table)) {
      console.error(`Table "${table}" does not exist or is not accessible`);
      throw new Error(`Table "${table}" does not exist or is not accessible`);
    }
    
    const { data: result, error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select('*');
    
    logSupabaseOperation(`updateData:${table}`, result, error);
    
    if (error) {
      if (error.code === '42P01') { // Table doesn't exist
        throw new Error(`Table "${table}" does not exist. Please run the setup script`);
      }
      throw error;
    }
    
    return result || [];
  } catch (err) {
    console.error(`Error in updateData for ${table}:`, err);
    throw err;
  }
};

export const deleteData = async (table, id) => {
  console.log(`Deleting from ${table} with id ${id}`);
  
  try {
    // First check if the table exists
    const { available, tables } = await checkDatabaseAvailability();
    if (!available || !tableExists(tables, table)) {
      console.error(`Table "${table}" does not exist or is not accessible`);
      throw new Error(`Table "${table}" does not exist or is not accessible`);
    }
    
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    logSupabaseOperation(`deleteData:${table}`, null, error);
    
    if (error) {
      if (error.code === '42P01') { // Table doesn't exist
        throw new Error(`Table "${table}" does not exist. Please run the setup script`);
      }
      throw error;
    }
  } catch (err) {
    console.error(`Error in deleteData for ${table}:`, err);
    throw err;
  }
};

// Helper function to check if a table exists in the tables list
const tableExists = (tables, tableName) => {
  // Case 1: tables is an array of objects with table_name property
  if (tables && tables.length > 0 && tables[0] && 'table_name' in tables[0]) {
    return tables.some(t => t.table_name === tableName);
  }
  
  // Case 2: tables is an array of strings
  if (tables && Array.isArray(tables)) {
    return tables.includes(tableName);
  }
  
  return false;
};

/**
 * Invoke a Supabase Edge Function with proper error handling
 * @param {string} functionName - Name of the Edge Function to invoke
 * @param {Object} payload - Body payload to send to the function
 * @param {Object} options - Additional options for the function call
 * @returns {Promise<Object>} - Response from the Edge Function
 */
export const invokeSafeFunction = async (functionName, payload, options = {}) => {
  try {
    console.log(`Invoking Edge Function: ${functionName}`, payload);
    
    if (!functionName) {
      throw new Error('Function name is required');
    }
    
    // Ensure supabase is initialized
    if (!supabase || !supabase.functions) {
      console.error('Supabase client not initialized properly');
      throw new Error('Supabase client not initialized');
    }
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
      ...options
    });
    
    if (error) {
      console.error(`Error invoking ${functionName}:`, error);
      throw error;
    }
    
    console.log(`Successfully invoked ${functionName}`);
    return { data, error: null };
  } catch (error) {
    console.error(`Failed to invoke ${functionName}:`, error);
    return { data: null, error };
  }
};