import React, { createContext, useState, useContext } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  colors: {
    background: string;
    text: string;
    primary: string;
    secondary: string;
    accent: string;
    card: string;
    border: string;
  };
}

const defaultColors = {
  light: {
    background: '#FFFFFF',
    text: '#000000',
    primary: '#118347',
    secondary: '#5D9C80',
    accent: '#F5A623',
    card: '#F9F9F9',
    border: '#EEEEEE',
  },
  dark: {
    background: '#121212',
    text: '#FFFFFF',
    primary: '#118347',
    secondary: '#5D9C80',
    accent: '#F5A623',
    card: '#1E1E1E',
    border: '#333333',
  },
};

// Create the context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Create a provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode; hasSeenOnboarding: boolean | null }> = ({ 
  children,
  hasSeenOnboarding
}) => {
  const [theme, setTheme] = useState<ThemeMode>('light');

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const colors = defaultColors[theme];

  const value = {
    theme,
    toggleTheme,
    colors,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// Create a hook to use the theme context
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 