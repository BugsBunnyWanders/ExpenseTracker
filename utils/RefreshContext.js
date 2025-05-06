import React, { createContext, useCallback, useContext, useState } from 'react';

// Create a context for managing refresh states
const RefreshContext = createContext();

// Custom hook for using the refresh context
export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
};

// Provider component for the refresh context
export const RefreshProvider = ({ children }) => {
  // Track the last refresh timestamp for different resources
  const [refreshTimestamps, setRefreshTimestamps] = useState({
    settlements: Date.now(),
    expenses: Date.now(),
    groups: Date.now(),
    balances: Date.now(),
  });

  // Function to trigger a refresh for specific resources
  const triggerRefresh = useCallback((resources = ['settlements', 'expenses', 'groups', 'balances']) => {
    const now = Date.now();
    const updates = {};
    
    if (typeof resources === 'string') {
      resources = [resources];
    }
    
    resources.forEach(resource => {
      updates[resource] = now;
    });
    
    setRefreshTimestamps(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  // Check if a resource needs refresh since a given timestamp
  const shouldRefresh = useCallback((resource, since) => {
    return refreshTimestamps[resource] > since;
  }, [refreshTimestamps]);

  // The value to be provided by the context
  const value = {
    refreshTimestamps,
    triggerRefresh,
    shouldRefresh
  };

  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
}; 