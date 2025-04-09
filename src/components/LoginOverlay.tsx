import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { CommonActions } from '@react-navigation/native';
import BaseOverlay from './BaseOverlay';

interface LoginOverlayProps {
  visible: boolean;
  onClose: () => void;
  returnScreen?: keyof RootStackParamList;
  returnParams?: any;
}

export default function LoginOverlay({
  visible,
  onClose,
  returnScreen,
  returnParams
}: LoginOverlayProps) {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const handleSignIn = () => {
    onClose();
    // Reset navigation to root with PhoneAuth screen
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'PhoneAuth',
            params: {
              returnScreen,
              returnParams
            }
          }
        ]
      })
    );
  };

  return (
    <BaseOverlay
      visible={visible}
      onClose={onClose}
      title="Welcome to PayGo"
      subtitle="Sign in to access all features"
      icon={{
        name: "log-in",
        color: "#666",
        size: 40
      }}
      primaryButton={{
        label: "Let's Get Started",
        onPress: handleSignIn
      }}
    />
  );
} 