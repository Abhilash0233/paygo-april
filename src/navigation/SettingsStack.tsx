import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/profile/ProfileScreen';
import DataInitScreen from '../screens/settings/DataInitScreen';
import SavedCentersScreen from '../screens/profile/SavedCentersScreen';

// Define the type for our settings stack navigator
export type SettingsStackParamList = {
  ProfileMain: undefined;
  DataInit: undefined;
  SavedCenters: undefined;
  // Add other settings screens as needed
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="DataInit" component={DataInitScreen} />
      <Stack.Screen name="SavedCenters" component={SavedCentersScreen} />
    </Stack.Navigator>
  );
}

export default SettingsStack; 