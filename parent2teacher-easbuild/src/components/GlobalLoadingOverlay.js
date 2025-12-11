import React, { createContext, useContext, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { Text } from 'react-native';
import AppLogo from './AppLogo';
import { colors } from '../styles/commonStyles';

const LoadingContext = createContext();

export const useGlobalLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within LoadingProvider');
  }
  return context;
};

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Loading...');

  const showLoading = (text = 'Loading...') => {
    setLoadingText(text);
    setIsLoading(true);
  };

  const hideLoading = () => {
    setIsLoading(false);
  };

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading }}>
      {children}
      {isLoading && (
        <Modal
          visible={isLoading}
          transparent={false}
          animationType="none"
          statusBarTranslucent
        >
          <View style={styles.overlay}>
            <View style={styles.contentContainer}>
              <AppLogo size={140} />
              <ActivityIndicator 
                size="large" 
                color={colors.primary} 
                style={styles.spinner} 
              />
              <Text style={styles.loadingText}>{loadingText}</Text>
            </View>
          </View>
        </Modal>
      )}
    </LoadingContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginTop: 30,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
});
