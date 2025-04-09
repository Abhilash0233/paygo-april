export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    border: string;
    error: string;
    success: string;
    white: string;
    black: string;
    gray: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
  };
}

export const theme: Theme = {
  colors: {
    primary: '#118347',
    secondary: '#E8F5ED',
    background: '#FFFFFF',
    text: '#1A1A1A',
    border: '#E0E0E0',
    error: '#E74C3C',
    success: '#118347',
    white: '#FFFFFF',
    black: '#000000',
    gray: {
      50: '#F8F8F8',
      100: '#F0F0F0',
      200: '#E8E8E8',
      300: '#E0E0E0',
      400: '#CCCCCC',
      500: '#999999',
      600: '#666666',
      700: '#4D4D4D',
      800: '#333333',
      900: '#1A1A1A',
    },
  },
};

export function useTheme(): Theme {
  return theme;
} 