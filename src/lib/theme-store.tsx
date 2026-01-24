import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';
export type StatusBarStyle = 'light' | 'dark';

// Base theme interface
export interface Theme {
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceHover: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  primary: string;
  primaryLight: string;
  accent: string;
  success: string;
  error: string;
  warning: string;
  cardGradientStart: string;
  cardGradientEnd: string;
  headerGradientStart: string;
  headerGradientEnd: string;
  statusBarStyle: StatusBarStyle;
}

// Color tokens for the app
export const LIGHT_THEME: Theme = {
  background: '#F8F9FA',
  backgroundSecondary: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceHover: '#F1F3F5',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  primary: '#6366F1',
  primaryLight: '#818CF8',
  accent: '#F59E0B',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  cardGradientStart: 'rgba(255,255,255,0.9)',
  cardGradientEnd: 'rgba(255,255,255,0.7)',
  headerGradientStart: '#F8F9FA',
  headerGradientEnd: '#F1F3F5',
  statusBarStyle: 'dark',
};

export const DARK_THEME: Theme = {
  background: '#0A0A0F',
  backgroundSecondary: '#111118',
  surface: 'rgba(255,255,255,0.05)',
  surfaceHover: 'rgba(255,255,255,0.08)',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  border: 'rgba(255,255,255,0.1)',
  borderLight: 'rgba(255,255,255,0.05)',
  primary: '#6366F1',
  primaryLight: '#818CF8',
  accent: '#F59E0B',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  cardGradientStart: 'rgba(255,255,255,0.1)',
  cardGradientEnd: 'rgba(255,255,255,0.05)',
  headerGradientStart: '#1a1a2e',
  headerGradientEnd: '#0A0A0F',
  statusBarStyle: 'light',
};

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  theme: Theme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'app_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved);
        }
      } catch (e) {
        console.warn('Failed to load theme:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // Save theme when changed
  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (e) {
      console.warn('Failed to save theme:', e);
    }
  };

  // For now, system defaults to dark. In a real app, you'd check the device preference
  const isDark = mode === 'dark' || mode === 'system';
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  // Don't render until theme is loaded to prevent flash
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode, theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Helper hook for getting colors directly
export function useColors() {
  const { theme } = useTheme();
  return theme;
}

// Helper to get theme-aware Tailwind classes
export function useThemeClasses() {
  const { isDark } = useTheme();

  return {
    bg: isDark ? 'bg-[#0A0A0F]' : 'bg-[#F8F9FA]',
    bgSecondary: isDark ? 'bg-[#111118]' : 'bg-white',
    surface: isDark ? 'bg-white/5' : 'bg-white',
    text: isDark ? 'text-white' : 'text-gray-900',
    textSecondary: isDark ? 'text-gray-400' : 'text-gray-600',
    textTertiary: isDark ? 'text-gray-500' : 'text-gray-400',
    border: isDark ? 'border-white/10' : 'border-gray-200',
  };
}
