import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './services/authContext';
import { WalletProvider } from './services/walletContext';
import { ThemeProvider } from './services/ThemeContext';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider hasSeenOnboarding={true}>
          <WalletProvider>
            <NavigationContainer>
              <View style={{ flex: 1 }}>
                <AppNavigator />
              </View>
            </NavigationContainer>
          </WalletProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
} 