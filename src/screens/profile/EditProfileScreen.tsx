import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile, deleteUserAccount, getUserProfile } from '../../services/supabase/userService';
import { updateUserProfile } from '../../services/supabase/userUtils';
import { useAuth } from '../../services/authContext';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DeleteAccountOverlay from '../../components/DeleteAccountOverlay';
import AppHeader from '../../components/AppHeader';
import { supabase } from '../../config/supabaseConfig';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList>;

interface EditProfileScreenProps {
  navigation: ProfileScreenNavigationProp;
}

// Define a helper interface that supports both naming conventions
interface UserProfileWithMixedFields {
  id: string;
  displayName?: string;
  display_name?: string;
  phoneNumber?: string;
  phone_number?: string;
  whatsappEnabled?: boolean;
  whatsapp_enabled?: boolean;
  // Add other fields as needed
}

function EditProfileScreen({ navigation }: EditProfileScreenProps) {
  const { user, refreshUser, logout } = useAuth();
  
  // State for form fields
  const [displayName, setDisplayName] = useState('');
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showDeleteOverlay, setShowDeleteOverlay] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileWithMixedFields | null>(null);

  // Helper functions to get values regardless of field naming format
  const getDisplayName = (profile: UserProfileWithMixedFields | null): string => {
    if (!profile) return '';
    return profile.display_name || profile.displayName || '';
  };

  const getWhatsappEnabled = (profile: UserProfileWithMixedFields | null): boolean => {
    if (!profile) return true;
    // If either field exists and is explicitly false, return false
    if (profile.whatsapp_enabled === false) return false;
    if (profile.whatsappEnabled === false) return false;
    return true; // Default to true
  };

  useEffect(() => {
    // Load current user data
    const loadUserData = async () => {
      try {
        setLoading(true);
        console.log("[EditProfile] Loading user data...");

        if (user && user.id) {
          console.log(`[EditProfile] Fetching profile for user ID: ${user.id}`);
          
          // First try to directly fetch from Supabase
          try {
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();
              
            if (!error && data) {
              console.log('[EditProfile] Successfully fetched user profile from Supabase:', data);
              setUserProfile(data);
              setDisplayName(data.display_name || '');
              setWhatsappEnabled(data.whatsapp_enabled !== false);
              return;
            } else {
              console.log('[EditProfile] Supabase query error or no data:', error);
            }
          } catch (supabaseError) {
            console.error('[EditProfile] Error fetching from Supabase:', supabaseError);
          }
          
          // Fallback to getUserProfile service
          const profile = await getUserProfile(user.id);
          console.log('[EditProfile] Profile from getUserProfile:', profile);
          
          if (profile) {
            setUserProfile(profile);
            setDisplayName(getDisplayName(profile));
            setWhatsappEnabled(getWhatsappEnabled(profile));
            console.log(`[EditProfile] Loaded profile data with name: ${getDisplayName(profile)}`);
          } else {
            // Use data from auth context as last resort
            console.log('[EditProfile] No profile found, using auth context user data');
            setUserProfile(user);
            setDisplayName(getDisplayName(user));
            setWhatsappEnabled(getWhatsappEnabled(user));
          }
        } else {
          console.log('[EditProfile] No user ID available, checking auth context');
          // Last resort - use the data from auth context
          if (user) {
            setUserProfile(user);
            setDisplayName(getDisplayName(user));
            setWhatsappEnabled(getWhatsappEnabled(user));
          }
        }
      } catch (error) {
        console.error('[EditProfile] Error loading user data:', error);
        Alert.alert('Error', 'Failed to load user data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  // Function to save profile changes
  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter your username');
      return;
    }

    setIsSubmitting(true);
    setAuthError(null);
    console.log('[EditProfile] Starting profile update process...');

    try {
      // Get user ID from multiple sources to ensure we have a valid ID
      const userId = user?.id;
      console.log('[EditProfile] Using user ID for update:', userId);
      
      if (!userId) {
        console.error('[EditProfile] No user ID available for profile update');
        Alert.alert('Error', 'User ID not found. Please try logging in again.');
        setIsSubmitting(false);
        return;
      }

      // Create update data with both naming conventions to handle both systems
      const updateData = {
        // Supabase format (snake_case)
        display_name: displayName.trim(),
        whatsapp_enabled: whatsappEnabled,
        last_updated: new Date().toISOString(),
      };
      
      console.log('[EditProfile] Update data:', updateData);
      
      // Try to update directly with Supabase
      try {
        const { data, error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', userId)
          .select()
          .single();
        
        if (error) {
          console.error('[EditProfile] Supabase update error:', error);
          throw new Error(`Supabase error: ${error.message}`);
        }
        
        console.log('[EditProfile] Profile updated successfully via Supabase');
        
        // After successful update, refresh the user in auth context
        if (refreshUser) {
          console.log('[EditProfile] Refreshing user in auth context...');
          await refreshUser();
          console.log('[EditProfile] User context refreshed successfully');
        }
        
        Alert.alert('Success', 'Your profile has been updated successfully!');
        navigation.goBack();
        return;
      } catch (supabaseError) {
        console.error('[EditProfile] Direct Supabase update failed:', supabaseError);
        // Continue to try other methods
      }
      
      // Fallback to userService update function
      try {
        const serviceUpdateData = {
          display_name: displayName.trim(),
          whatsapp_enabled: whatsappEnabled
        };
        
        await updateUserProfile(userId, serviceUpdateData);
        console.log('[EditProfile] Profile updated successfully via userService');
        
        // Refresh user context
        if (refreshUser) await refreshUser();
        
        Alert.alert('Success', 'Your profile has been updated successfully!');
        navigation.goBack();
      } catch (serviceError) {
        console.error('[EditProfile] userService update failed:', serviceError);
        throw serviceError;
      }
    } catch (error: any) {
      console.error('[EditProfile] Error updating profile:', error);
      setAuthError(error?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setShowDeleteOverlay(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      
      // Use the user data from context
      if (user && user.id) {
        const phone = userProfile?.phone_number || userProfile?.phoneNumber;
        
        if (phone) {
          // Navigate to OTP verification screen instead of deleting directly
          console.log('[DeleteAccount] Navigating to OTP verification for deletion');
          navigation.navigate('AccountDeletionOTP', {
            phoneNumber: phone,
            userId: user.id
          });
        } else {
          Alert.alert('Error', 'Unable to retrieve your phone number for verification. Please try again later.');
        }
      } else {
        Alert.alert('Error', 'Unable to retrieve your account information. Please try again later.');
      }
    } catch (error) {
      console.error('Error in delete account process:', error);
      Alert.alert('Error', 'Failed to process account deletion. Please try again later.');
    } finally {
      setShowDeleteOverlay(false);
      setIsDeleting(false);
    }
  };

  // Create the save button component to use in the header
  const SaveButton = () => (
    <TouchableOpacity 
      style={[
        styles.saveButton, 
        isSubmitting && styles.saveButtonDisabled
      ]}
      onPress={handleSaveProfile}
      disabled={isSubmitting}
    >
      <Text style={styles.saveButtonText}>Save</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Use the new AppHeader component */}
      <AppHeader 
        title="Edit Profile"
        showBackButton={true}
        rightComponent={<SaveButton />}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        {loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#118347" />
            <Text style={styles.loadingText}>Loading profile data...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Display auth error if present */}
            {authError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}
            
            {/* Form Fields */}
            <View style={styles.formSection}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  style={styles.textInput}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Enter your username"
                  placeholderTextColor="#999"
                  autoCorrect={false}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.disabledInput}>
                  <Text style={styles.disabledInputText}>
                    {userProfile?.phone_number || 'Not provided'}
                  </Text>
                  <Text style={styles.disabledInputHint}>Cannot be changed</Text>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.whatsappHeader}>
                  <View style={styles.whatsappTitleContainer}>
                    <Text style={styles.inputLabel}>WhatsApp Notifications</Text>
                    <Text style={styles.whatsappSubtitle}>Stay updated with your bookings</Text>
                  </View>
                  <Switch
                    value={whatsappEnabled}
                    onValueChange={setWhatsappEnabled}
                    trackColor={{ false: '#E5E5E5', true: '#118347' }}
                    thumbColor={whatsappEnabled ? '#FFFFFF' : '#FFFFFF'}
                  />
                </View>
                <View style={styles.whatsappContent}>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#118347" />
                    <Text style={styles.benefitText}>Instant booking confirmations and reminders</Text>
                  </View>
                  <View style={styles.funMessageContainer}>
                    <Ionicons name="happy-outline" size={16} color="#666666" />
                    <Text style={styles.funMessageText}>Don't worry, we won't send "sona babu" messages at midnight 😉</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Delete Account Button */}
            <View style={styles.deleteAccountContainer}>
              <TouchableOpacity 
                style={styles.deleteAccountButton}
                onPress={handleDeleteAccount}
              >
                <Ionicons name="trash-outline" size={20} color="#cc3300" />
                <Text style={styles.deleteAccountText}>Delete Account</Text>
              </TouchableOpacity>
              <Text style={styles.deleteAccountDescription}>
                Permanently delete your account and all associated data
              </Text>
            </View>
          </ScrollView>
        )}
        
        {/* Loading overlay */}
        {isSubmitting && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#118347" />
            <Text style={styles.loadingText}>Updating profile...</Text>
          </View>
        )}

        {/* Delete Account Overlay */}
        <DeleteAccountOverlay
          isVisible={showDeleteOverlay}
          onClose={() => setShowDeleteOverlay(false)}
          onConfirm={handleConfirmDelete}
          isDeleting={isDeleting}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#118347',
  },
  saveButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  formSection: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EEEEEE',
    paddingHorizontal: 16,
  },
  inputContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  inputLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  textInput: {
    fontSize: 16,
    color: '#333333',
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  disabledInput: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  disabledInputText: {
    fontSize: 16,
    color: '#666666',
  },
  disabledInputHint: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333333',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  deleteAccountContainer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginHorizontal: 20,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: 'rgba(204, 51, 0, 0.1)',
    borderRadius: 12,
  },
  deleteAccountText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#cc3300',
  },
  deleteAccountDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  whatsappHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  whatsappTitleContainer: {
    flex: 1,
  },
  whatsappSubtitle: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  whatsappContent: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  funMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  funMessageText: {
    fontSize: 13,
    color: '#666666',
    marginLeft: 8,
    flex: 1,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});

export default EditProfileScreen; 