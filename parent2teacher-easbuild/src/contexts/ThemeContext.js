import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const lightTheme = {
  mode: 'light',
  colors: {
    primary: '#2196F3',
    secondary: '#FF9800',
    error: '#f44336',
    success: '#4CAF50',
    warning: '#FFC107',
    
    background: '#F5F5F5',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    
    text: '#333333',
    textSecondary: '#666666',
    textLight: '#999999',
    
    border: '#E0E0E0',
    divider: '#E0E0E0',
    
    white: '#FFFFFF',
    black: '#000000',
    
    // Specific component colors
    headerBackground: '#FF9800',
    headerText: '#FFFFFF',
    
    // Status colors
    online: '#4CAF50',
    offline: '#9E9E9E',
    away: '#FFC107',
  }
};

export const darkTheme = {
  mode: 'dark',
  colors: {
    primary: '#64B5F6',
    secondary: '#FFB74D',
    error: '#EF5350',
    success: '#66BB6A',
    warning: '#FFCA28',
    
    background: '#121212',
    surface: '#1E1E1E',
    card: '#2C2C2C',
    
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    textLight: '#808080',
    
    border: '#3A3A3A',
    divider: '#3A3A3A',
    
    white: '#FFFFFF',
    black: '#000000',
    
    // Specific component colors
    headerBackground: '#FFB74D',
    headerText: '#000000',
    
    // Status colors
    online: '#66BB6A',
    offline: '#757575',
    away: '#FFCA28',
  }
};

const THEME_STORAGE_KEY = '@app_theme_mode';

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference from storage
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch (error) {
      // Failed to load theme preference
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode ? 'dark' : 'light');
    } catch (error) {
      // Failed to save theme preference
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
