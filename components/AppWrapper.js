import React from 'react';
import { StyleSheet, View } from 'react-native';
import DatabaseWarning from './DatabaseWarning';

/**
 * AppWrapper component that wraps the entire application
 * and includes components like the DatabaseWarning
 */
const AppWrapper = ({ children }) => {
  return (
    <View style={styles.container}>
      {children}
      <DatabaseWarning />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default AppWrapper; 