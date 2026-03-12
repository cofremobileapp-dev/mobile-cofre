import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@app_theme';

const ThemeContext = createContext({});

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto',
};

// Light Theme Colors
export const LIGHT_COLORS = {
  // Background
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  backgroundTertiary: '#F3F4F6',

  // Text
  textPrimary: '#000000',
  textSecondary: '#4B5563',
  textTertiary: '#6B7280',
  textInverse: '#FFFFFF',

  // Primary Brand
  primary: '#06402B',
  primaryLight: '#E8F5E9',
  primaryDark: '#043020',

  // Borders
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Status
  success: '#10B981',
  successLight: '#D1FAE5',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // UI Elements
  card: '#FFFFFF',
  tabBar: '#FFFFFF',
  header: '#06402B',
  headerText: '#FFFFFF',

  // Shadows
  shadow: '#000000',

  // Icon Colors
  iconPrimary: '#06402B',
  iconSecondary: '#6B7280',
  iconInactive: '#9CA3AF',
};

// Dark Theme Colors
export const DARK_COLORS = {
  // Background
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  backgroundTertiary: '#334155',

  // Text
  textPrimary: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',
  textInverse: '#0F172A',

  // Primary Brand
  primary: '#10B981',
  primaryLight: '#064E3B',
  primaryDark: '#059669',

  // Borders
  border: '#334155',
  borderLight: '#475569',

  // Status
  success: '#10B981',
  successLight: '#064E3B',
  error: '#EF4444',
  errorLight: '#7F1D1D',
  warning: '#F59E0B',
  warningLight: '#78350F',
  info: '#3B82F6',
  infoLight: '#1E3A8A',

  // UI Elements
  card: '#1E293B',
  tabBar: '#1E293B',
  header: '#10B981',
  headerText: '#FFFFFF',

  // Shadows
  shadow: '#000000',

  // Icon Colors
  iconPrimary: '#10B981',
  iconSecondary: '#94A3B8',
  iconInactive: '#64748B',
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState(THEMES.AUTO); // 'light', 'dark', 'auto'
  const [isDark, setIsDark] = useState(false);

  // Load saved theme preference
  useEffect(() => {
    loadThemePreference();
  }, []);

  // Update theme when mode or system preference changes
  useEffect(() => {
    if (themeMode === THEMES.AUTO) {
      setIsDark(systemColorScheme === 'dark');
    } else {
      setIsDark(themeMode === THEMES.DARK);
    }
  }, [themeMode, systemColorScheme]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && Object.values(THEMES).includes(savedTheme)) {
        setThemeMode(savedTheme);
      }
    } catch (error) {
      // Silently handle error
    }
  };

  const saveThemePreference = async (mode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      // Silently handle error
    }
  };

  const setTheme = (mode) => {
    setThemeMode(mode);
    saveThemePreference(mode);
  };

  const toggleTheme = () => {
    const newMode = isDark ? THEMES.LIGHT : THEMES.DARK;
    setTheme(newMode);
  };

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider
      value={{
        theme: themeMode,
        setTheme,
        toggleTheme,
        isDark,
        colors,
        THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
