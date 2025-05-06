/**
 * Network Diagnostics for ExpenseTracker
 * 
 * Run this script to test connection to Supabase and diagnose network issues:
 * node scripts/network-diagnostics.js
 */

const https = require('https');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Supabase configuration
const supabaseUrl = 'https://mlfegeoozgkapwggmuhe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sZmVnZW9vemdrYXB3Z2dtdWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTA4MTAsImV4cCI6MjA2MjAyNjgxMH0.EvwKPuGny258CMHSiSxhrwevHeOP_EwWTeQIoCcNDcc';

// Helper function to make HTTP requests
const makeRequest = (url) => {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    console.log(`Testing connection to: ${url}`);
    const req = protocol.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Response status: ${res.statusCode}`);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data.substring(0, 100) + (data.length > 100 ? '...' : '') // Truncate response
        });
      });
    });
    
    req.on('error', (error) => {
      console.error(`Error connecting to ${url}:`, error.message);
      reject(error);
    });
    
    req.end();
  });
};

// Test Supabase connection
const testSupabaseConnection = async () => {
  try {
    console.log('\n--- Testing Supabase Connection ---');
    
    // Test basic connectivity to Supabase URL
    const urlTest = await makeRequest(supabaseUrl);
    console.log('Basic connectivity test:', urlTest.status === 200 ? 'SUCCESS' : 'FAILED');
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test public schema access
    console.log('\nTesting database access...');
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    
    if (error) {
      console.error('Database access error:', error);
      console.log('Database access test: FAILED');
    } else {
      console.log('Database access test: SUCCESS');
      console.log(`Retrieved ${data.length} records`);
    }
    
    // Test auth API
    console.log('\nTesting auth API...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('Auth API error:', authError);
      console.log('Auth API test: FAILED');
    } else {
      console.log('Auth API test: SUCCESS');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return { success: false, error };
  }
};

// Test network connectivity to common services
const testNetworkConnectivity = async () => {
  try {
    console.log('\n--- Testing General Network Connectivity ---');
    
    const services = [
      'https://google.com',
      'https://cloudflare.com',
      'https://github.com',
      supabaseUrl
    ];
    
    for (const service of services) {
      try {
        await makeRequest(service);
      } catch (error) {
        console.error(`Failed to connect to ${service}:`, error.message);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Network connectivity test failed:', error);
    return { success: false, error };
  }
};

// Run diagnostics
const runDiagnostics = async () => {
  console.log('=== ExpenseTracker Network Diagnostics ===\n');
  
  try {
    await testNetworkConnectivity();
    await testSupabaseConnection();
    
    console.log('\n=== Diagnostics Complete ===');
  } catch (error) {
    console.error('\nDiagnostics failed:', error);
  }
};

// Run the diagnostics
runDiagnostics(); 