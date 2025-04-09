import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppHeader from '../../components/AppHeader';

// Services
import { useWallet } from '../../services/walletContext';
import { useAuth } from '../../services/authContext';
import { UserProfile } from '../../services/supabase/userService';
import { deleteUserAccount, getUserProfile } from '../../services/supabase/userService';
import { forceRepairSpecificWallet } from '../../services/walletService';
import LogoutConfirmationOverlay from '../../components/LogoutConfirmationOverlay';
import LoginOverlay from '../../components/LoginOverlay';
import { ADMIN_PHONE_NUMBER } from '../../services/twilioService';

// Components
import AdminNotificationOverlay from '../../components/AdminNotificationOverlay';

// Import navigation types
import { RootStackParamList } from '../../navigation/AppNavigator';

// Add the import for supabase
import { supabase } from '../../config/supabaseConfig';

// Define a streamlined UserProfile type for Supabase fields
interface UserProfileMixed {
  id: string;
  phone_number?: string;
  display_name?: string;
  email?: string;
  photo_url?: string;
  whatsapp_enabled?: boolean;
  profile_complete?: boolean;
  email_verified?: boolean;
  created_at?: string; // Supabase timestamp
  last_login?: string; // Supabase timestamp
  last_updated?: string; // Supabase timestamp
  device_info?: string;
  notifications_enabled?: boolean;
  is_first_time_user?: boolean;
  login_count?: number;
  username?: string;
  wallet_balance?: number;
  wallet_created_at?: string;
}

// Define menu items by section
interface MenuItem {
  id: string;
  title: string;
  icon: string;
  description?: string;
  screen?: string;
  action?: Function | string;
  iconColor?: string;
  showDivider?: boolean;
}

interface MenuSections {
  account: MenuItem[];
  settings: MenuItem[];
  information: MenuItem[];
}

// Add helper function for generating random avatars based on user ID
const getAvatarColor = (userId: string | undefined): string => {
  if (!userId) return '#118347'; // Default green color
  
  // Generate a consistent color based on the userId
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFBE0B', 
    '#FF9F1C', '#E71D36', '#662E9B', '#43BCCD'
  ];
  
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
};

// Generate initials for avatar from name
const getInitials = (name: string | undefined): string => {
  if (!name) return 'U';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// Updated menu items organized by sections
const getMenuSections = (walletBalance: number, isAdminUser: boolean = false): MenuSections => {
  const baseMenus = {
    account: [
      { 
        id: 'transactions', 
        title: 'Transaction History', 
        icon: 'list-outline', 
        description: 'View your wallet activity and payment history',
        screen: 'WalletTransactions'
      },
      { 
        id: 'favorites', 
        title: 'Favorite Centers', 
        icon: 'heart-outline', 
        description: 'View your favorite fitness centers',
        screen: 'SavedCenters'
      },
    ],
    settings: [
      { 
        id: 'help', 
        title: 'Help & Support', 
        icon: 'help-circle-outline', 
        description: 'Get help with our app',
        screen: 'HelpSupport'
      },
    ],
    information: [
      { 
        id: 'about', 
        title: 'About Us', 
        icon: 'information-circle-outline', 
        description: 'Learn more about PayGo Fitness',
        screen: 'AboutUs'
      },
      { 
        id: 'terms', 
        title: 'Terms & Conditions', 
        icon: 'document-text-outline', 
        description: 'Read our terms and conditions',
        screen: 'TermsAndServices'
      },
      { 
        id: 'privacy', 
        title: 'Privacy Policy', 
        icon: 'lock-closed-outline', 
        description: 'Read our privacy policy',
        screen: 'PrivacyPolicy'
      },
      { 
        id: 'cancellation', 
        title: 'Cancellation Policy', 
        icon: 'close-circle-outline', 
        description: 'Read our cancellation policy',
        screen: 'CancellationPolicy'
      },
    ]
  };
  
  // Add payment gateway settings only for admin users
  if (isAdminUser) {
    baseMenus.settings.push({ 
      id: 'payment-settings',
      title: 'Payment Gateway Settings',
      icon: 'card-outline',
      description: 'Configure payment gateway settings',
      screen: 'PaymentSettings',
    });
  }
  
  return baseMenus;
};

function ProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { walletBalance, isLoading: isWalletLoading, refreshWalletBalance, forceRefreshWithId } = useWallet();
  const { user, isAuthenticated, logout, isGuestMode } = useAuth();
  const [menuSections, setMenuSections] = useState<MenuSections>(getMenuSections(0));
  const [refreshing, setRefreshing] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [profileData, setProfileData] = useState<UserProfileMixed | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [hasRefreshedWallet, setHasRefreshedWallet] = useState(false);
  
  // Add state for admin notification overlay visibility
  const [showAdminNotifications, setShowAdminNotifications] = useState(false);
  
  // Add state to track if current user is admin
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Check if the current user is an admin based on ADMIN_PHONE_NUMBER constant
  useEffect(() => {
    const checkIfAdmin = async () => {
      if (user && user.phone_number === ADMIN_PHONE_NUMBER) {
        setIsAdmin(true);
        console.log('[ProfileScreen] Admin user detected');
        // Update menu sections with admin options
        setMenuSections(getMenuSections(walletBalance, true));
      } else {
        setIsAdmin(false);
        setMenuSections(getMenuSections(walletBalance, false));
      }
    };
    
    checkIfAdmin();
  }, [user, walletBalance]);
  
  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        if (!isAuthenticated && !isGuestMode) return;
        
        setIsProfileLoading(true);
        setHasRefreshedWallet(true); // Mark as refreshed early to prevent additional refreshes
        
        // Just use user.id from auth context
        const userId = user?.id;
        
        if (userId) {
          console.log('[ProfileScreen] Loading user profile for ID:', userId);
          
          // First, make sure wallet data is refreshed - but only once
          try {
            if (!hasRefreshedWallet) {
              console.log('[ProfileScreen] Refreshing wallet balance for user:', userId);
              await forceRefreshWithId(userId);
              console.log('[ProfileScreen] Current wallet balance:', walletBalance);
            }
          } catch (walletError) {
            console.error('[ProfileScreen] Error refreshing wallet:', walletError);
          }
          
          // Get user profile directly from Supabase
          try {
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            
            if (error) {
              console.error('[ProfileScreen] Supabase error fetching user profile:', error);
            } else if (data) {
              console.log('[ProfileScreen] Successfully retrieved profile from Supabase');
              setProfileData(data);
              return;
            }
          } catch (supabaseError) {
            console.error('[ProfileScreen] Exception querying Supabase:', supabaseError);
          }
          
          // If direct Supabase query fails, try getUserProfile as fallback
          const profile = await getUserProfile(userId);
          console.log('[ProfileScreen] Retrieved profile via service:', profile ? 'YES' : 'NO');
          
          if (profile) {
            console.log('[ProfileScreen] Profile data:', JSON.stringify(profile, null, 2));
            setProfileData(profile);
          } else {
            console.log('[ProfileScreen] No profile found, using auth context user');
            // If profile not found, use data from auth context as fallback
            setProfileData(user);
          }
        }
      } catch (error) {
        console.error('[ProfileScreen] Error loading profile data:', error);
      } finally {
        setIsProfileLoading(false);
      }
    };
    
    loadUserProfile();
  }, [isAuthenticated, isGuestMode, user]);
  
  // Get formatted date for "Member since" text
  const getMemberSinceText = (userProfile?: UserProfileMixed | null) => {
    if (!userProfile) return 'New Member';
    
    try {
      // Get the creation date from Supabase format
      const creationTimestamp = userProfile.created_at;
      
      if (!creationTimestamp) return 'New Member';
      
      // Convert timestamp to Date
      const createdDate = new Date(creationTimestamp);
      
      // Format the date as "Month Year" (e.g., "January 2023")
      return `Member since ${format(createdDate, 'MMMM yyyy')}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Member';
    }
  };
  
  // Refresh user data
  const refreshUserData = async () => {
    try {
      setRefreshing(true);
      
      if (!isAuthenticated && !isGuestMode) {
        setRefreshing(false);
        return;
      }
      
      // Use user.id from auth context
      const userId = user?.id;
      
      if (userId) {
        try {
          console.log('[ProfileScreen] Manual refresh requested');
          
          // First refresh wallet - only once per refresh request
          await forceRefreshWithId(userId);
          
          // Get user profile directly from Supabase
          try {
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .maybeSingle();
            
            if (error) {
              console.error('[ProfileScreen] Supabase error refreshing user profile:', error);
            } else if (data) {
              console.log('[ProfileScreen] Successfully refreshed profile from Supabase');
              setProfileData(data);
              setMenuSections(getMenuSections(walletBalance, isAdmin));
              return;
            }
          } catch (supabaseError) {
            console.error('[ProfileScreen] Exception querying Supabase:', supabaseError);
          }
          
          // Fallback to getUserProfile service if direct query fails
          const profile = await getUserProfile(userId);
          if (profile) {
            setProfileData(profile);
            setMenuSections(getMenuSections(walletBalance, isAdmin));
          }
        } catch (error) {
          console.error('[ProfileScreen] Error refreshing data:', error);
          setWalletError('Error refreshing data. Please try again.');
        }
      }
    } catch (error) {
      console.error('[ProfileScreen] Error refreshing profile data:', error);
      logWalletRefreshError(error, {
        action: 'refreshUserData',
        userId: user?.id
      });
    } finally {
      setRefreshing(false);
    }
  };
  
  // log wallet refresh errors to console
  const logWalletRefreshError = (error: any, metadata: any) => {
    console.error('Wallet refresh error:', error, JSON.stringify(metadata));
  };
  
  // Update menu sections when wallet balance changes
  useEffect(() => {
    setMenuSections(getMenuSections(walletBalance, isAdmin));
  }, [walletBalance, isAdmin]);
  
  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    await refreshUserData();
  }, [user, forceRefreshWithId, refreshWalletBalance]);

  const handleWalletRepair = async () => {
    if (!user || !user.id) {
      Alert.alert('Error', 'Unable to repair wallet: User not found');
      return;
    }
    
    Alert.alert(
      'Repair Wallet',
      'Would you like to attempt repairing your wallet? This may fix balance discrepancies.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Repair', 
          onPress: async () => {
            try {
              const result = await forceRepairSpecificWallet(user.id);
              if (result) {
                Alert.alert('Success', 'Wallet repair completed. Your balance has been refreshed.');
                refreshUserData();
              } else {
                Alert.alert('Error', 'Wallet repair was not successful. Please contact support.');
              }
            } catch (error) {
              console.error('Error repairing wallet:', error);
              Alert.alert('Error', 'Failed to repair wallet. Please try again later.');
            }
          }
        }
      ]
    );
  };
  
  const handleEditProfile = () => {
    // Navigate to edit profile screen
    navigation.navigate('EditProfile');
  };

  const handleMenuPress = (item: MenuItem) => {
    if (item.screen) {
      if (item.id === 'favorites') {
        // Navigate directly to SavedCenters within the ProfileStack
        navigation.navigate('SavedCenters');
      } else {
        navigation.navigate(item.screen);
      }
    } else if (item.action === 'deleteAccount') {
      handleDeleteAccount();
    } else if (typeof item.action === 'function') {
      // Execute function actions directly
      item.action();
    } else {
      // Handle other menu items
      console.log(`Pressed ${item.id}`);
      Alert.alert('Coming Soon', 'This feature is coming soon!');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This will permanently delete all your data including bookings, wallet, and profile information. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete My Account',
          style: 'destructive',
          onPress: async () => {
            if (!user || !user.id) {
              Alert.alert('Error', 'User information not found. Please log in again.');
              return;
            }

            try {
              setDeletingAccount(true);
              
              console.log('[ProfileScreen] Initiating account deletion via Supabase...');
              // Delete user account and all associated data using Supabase service
              await deleteUserAccount(user.id);
              
              setDeletingAccount(false);
              
              // Show success message
              Alert.alert(
                'Account Deleted',
                'Your account has been successfully deleted. Thank you for using our service.',
                [{ 
                  text: 'OK', 
                  onPress: () => {
                    // Use the logout function from AuthContext
                    logout();
                    // Navigate to onboarding screen to maintain consistent flow
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Onboarding' }],
                    });
                  }
                }]
              );
            } catch (error) {
              setDeletingAccount(false);
              console.error('[ProfileScreen] Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete your account. Please try again later.');
            }
          }
        }
      ]
    );
  };

  const [showLogoutOverlay, setShowLogoutOverlay] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Update handleLogout to show overlay
  const handleLogout = () => {
    setShowLogoutOverlay(true);
  };

  // Update handleConfirmLogout
  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      // Use the logout function from AuthContext
      await logout();
      
      // First close the overlay
      setShowLogoutOverlay(false);
      
      // Show success message before navigation
      Alert.alert(
        'Signed Out',
        'You have been successfully signed out.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Use reset instead of navigate to clear the navigation stack
              navigation.reset({
                index: 0,
                routes: [{ name: 'Onboarding' }]
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  // Handle menu press for transaction history with additional details
  const renderMenuItem = (item: MenuItem) => {
    const isDeleteAccount = item.id === 'deleteAccount';
    
    // For guest users, handle auth-required menu items differently
    const handleMenuItemPress = () => {
      if (isGuestMode && !['about', 'privacy', 'terms', 'cancellation'].includes(item.id)) {
        // If this is an auth-required item and user is in guest mode
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'PhoneAuth' }],
          })
        );
      } else {
        handleMenuPress(item);
      }
    };
    
    return (
      <TouchableOpacity 
        key={item.id} 
        style={[styles.menuItem, isDeleteAccount && styles.deleteAccountMenuItem]}
        onPress={handleMenuItemPress}
      >
        <View style={[styles.menuItemIcon, isDeleteAccount && styles.deleteAccountIcon]}>
          <Ionicons 
            name={item.icon as any} 
            size={22} 
            color={item.iconColor || (isDeleteAccount ? '#cc3300' : '#118347')} 
          />
        </View>
        <View style={styles.menuItemContent}>
          <Text style={[
            styles.menuItemTitle,
            isDeleteAccount && styles.deleteAccountText
          ]}>
            {item.title}
          </Text>
          <Text style={[
            styles.menuItemDescription,
            isDeleteAccount && styles.deleteAccountDescription
          ]}>
            {item.description}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#999" />
      </TouchableOpacity>
    );
  };

  // Use an effect to check user status when component mounts
  useEffect(() => {
    if (isGuestMode) {
      // No longer need to show auth sheet here since it's handled at the tab navigation level
    }
  }, [isGuestMode]);

  const [showLoginOverlay, setShowLoginOverlay] = useState(false);
  const [loginOverlayConfig, setLoginOverlayConfig] = useState<{
    returnScreen?: keyof RootStackParamList;
    returnParams?: any;
  }>({});

  // Create guest profile view with business info and limited options
  const renderGuestProfile = () => {
    // Filter menu sections to only show public information
    const publicMenuSections = {
      ...menuSections,
      // Remove account section for guests
      account: [],
      // Filter settings to remove auth-required options
      settings: menuSections.settings.filter(item => 
        item.id === 'about' || item.id === 'privacy'
      ),
      // Keep information section as is
      information: menuSections.information
    };
    
    return (
      <>
        {/* Business Information */}
        <View style={styles.businessInfoCard}>
          <View style={styles.businessInfoHeader}>
            <Ionicons name="fitness" size={28} color="#118347" />
            <Text style={styles.businessInfoTitle}>About PayGo Fitness</Text>
          </View>
          <Text style={styles.businessInfoText}>
            PayGo Fitness offers convenient pay-per-use access to fitness centers across the city. Book sessions at your convenience without long-term commitments.
          </Text>
          
          <View style={styles.businessFeatureRow}>
            <View style={styles.businessFeature}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="fitness" size={24} color="#118347" />
              </View>
              <Text style={styles.businessFeatureText}>Pay-per-use</Text>
            </View>
            <View style={styles.businessFeature}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="location" size={24} color="#118347" />
              </View>
              <Text style={styles.businessFeatureText}>Multiple locations</Text>
            </View>
          </View>
          
          <View style={styles.businessFeatureRow}>
            <View style={styles.businessFeature}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="calendar" size={24} color="#118347" />
              </View>
              <Text style={styles.businessFeatureText}>Flexible timing</Text>
            </View>
            <View style={styles.businessFeature}>
              <View style={styles.featureIconContainer}>
                <Ionicons name="wallet" size={24} color="#118347" />
              </View>
              <Text style={styles.businessFeatureText}>Digital wallet</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.getStartedButton}
            onPress={() => {
              setLoginOverlayConfig({
                returnScreen: 'Main',
                returnParams: {
                  screen: 'HomeStack'
                }
              });
              setShowLoginOverlay(true);
            }}
          >
            <Text style={styles.getStartedButtonText}>Sign In to Get Started</Text>
          </TouchableOpacity>
        </View>
        
        {/* Support and Information */}
        <View style={styles.sectionContainer}>
          {publicMenuSections.information.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Information</Text>
              {publicMenuSections.information.map(renderMenuItem)}
            </>
          )}
        </View>
        
        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>Version 1.1.9</Text>
        </View>

        {/* Add LoginOverlay */}
        <LoginOverlay
          visible={showLoginOverlay}
          onClose={() => setShowLoginOverlay(false)}
          returnScreen={loginOverlayConfig.returnScreen}
          returnParams={loginOverlayConfig.returnParams}
        />
      </>
    );
  };

  // Add a function to open the admin notification overlay
  const handleOpenAdminNotifications = () => {
    setShowAdminNotifications(true);
  };
  
  // Add a function to close the admin notification overlay
  const handleCloseAdminNotifications = () => {
    setShowAdminNotifications(false);
  };

  // Update the wallet balance section to navigate to WalletScreen
  const handleAddMoney = () => {
    // Navigate directly to the Wallet screen
    navigation.navigate('Wallet');
  };

  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Fade in animation when component mounts
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Add a helper function to get user display name
  const getUserDisplayName = (): string => {
    if (!user && !profileData) return 'User';
    
    // Only use Supabase field format (display_name)
    // First check profile data
    if (profileData && (profileData as UserProfileMixed).display_name) {
      return (profileData as UserProfileMixed).display_name!;
    }
    
    // Then check user from auth context as fallback
    if (user && (user as UserProfileMixed).display_name) {
      return (user as UserProfileMixed).display_name!;
    }
    
    return 'User';
  };

  // Add a helper function to get user phone number
  const getUserPhoneNumber = (): string => {
    if (!user && !profileData) return 'No phone number';
    
    // Only use Supabase field format (phone_number)
    // First check profile data
    if (profileData && (profileData as UserProfileMixed).phone_number) {
      return (profileData as UserProfileMixed).phone_number!;
    }
    
    // Then check user from auth context as fallback
    if (user && (user as UserProfileMixed).phone_number) {
      return (user as UserProfileMixed).phone_number!;
    }
    
    return 'No phone number';
  };

  return (
    <View style={styles.container}>
      <AppHeader 
        title="Profile"
        showBackButton={false}
      />

      {deletingAccount && (
        <View style={styles.deletionOverlay}>
          <View style={styles.deletionModal}>
            <ActivityIndicator size="large" color="#cc3300" />
            <Text style={styles.deletionText}>Deleting Account</Text>
            <Text style={styles.deletionSubtext}>Please wait while we process your request...</Text>
          </View>
        </View>
      )}
      
      <Animated.View style={[styles.scrollContent, { opacity: fadeAnim }]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#118347']}
              tintColor="#118347"
            />
          }
        >
          {isGuestMode ? renderGuestProfile() : (
            <>
              {/* Enhanced Profile Header */}
              <View style={styles.profileSection}>
                <View style={styles.profileContent}>
                  <View style={styles.userInfoContainer}>
                    {isProfileLoading ? (
                      <ActivityIndicator size="small" color="#118347" />
                    ) : (
                      <>
                        <Text style={styles.userName}>
                          {getUserDisplayName()}
                        </Text>
                        <View style={styles.phoneContainer}>
                          <Ionicons name="call-outline" size={14} color="#666" style={styles.infoIcon} />
                          <Text style={styles.userPhone}>
                            {getUserPhoneNumber()}
                          </Text>
                        </View>
                        <View style={styles.memberContainer}>
                          <Ionicons name="calendar-outline" size={14} color="#888" style={styles.infoIcon} />
                          <Text style={styles.memberSince}>
                            {getMemberSinceText(profileData)}
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={handleEditProfile}
                  >
                    <Ionicons name="pencil" size={16} color="#118347" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Enhanced Wallet Card */}
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={handleAddMoney}
              >
                <View style={styles.walletCardContainer}>
                  <LinearGradient
                    colors={['#118347', '#0A5D31']}
                    style={styles.walletGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.walletCardContent}>
                      <View style={styles.walletIconContainer}>
                        <Ionicons name="wallet-outline" size={28} color="#fff" />
                      </View>
                      <View style={styles.walletInfoContainer}>
                        <Text style={styles.walletLabel}>Wallet Balance</Text>
                        {isWalletLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.walletBalance}>
                            ₹{walletBalance}
                          </Text>
                        )}
                        {walletError && (
                          <Text style={styles.walletErrorText}>{walletError}</Text>
                        )}
                      </View>
                      <TouchableOpacity 
                        style={styles.addMoneyButton}
                        onPress={handleAddMoney}
                      >
                        <Text style={styles.addMoneyText}>Add Money</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              </TouchableOpacity>
              
              {/* Menu Sections */}
              <View style={styles.menuContainer}>
                {/* Account Section */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Account</Text>
                  {menuSections.account.map(renderMenuItem)}
                </View>

                {/* Settings Section */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Settings</Text>
                  {menuSections.settings.map(renderMenuItem)}
                </View>

                {/* Information Section */}
                <View style={styles.sectionContainer}>
                  <Text style={styles.sectionTitle}>Information</Text>
                  {menuSections.information.map(renderMenuItem)}
                </View>
              </View>

              {/* Sign Out Button */}
              <TouchableOpacity 
                style={styles.signOutButton}
                onPress={handleLogout}
              >
                <Ionicons name="log-out-outline" size={20} color="#666" />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>

              {/* Version Info */}
              <View style={styles.versionInfo}>
                <Text style={styles.versionText}>Version 1.1.9</Text>
              </View>
            </>
          )}
        </ScrollView>
      </Animated.View>
      
      {/* Show AdminNotificationOverlay if showAdminNotifications is true */}
      {showAdminNotifications && (
        <AdminNotificationOverlay isVisible={showAdminNotifications} onClose={handleCloseAdminNotifications} />
      )}

      {/* Add LogoutConfirmationOverlay */}
      <LogoutConfirmationOverlay
        isVisible={showLogoutOverlay}
        onClose={() => setShowLogoutOverlay(false)}
        onConfirm={handleConfirmLogout}
        isLoggingOut={isLoggingOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  scrollContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 30,
  },
  profileSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 16,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfoContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  memberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  infoIcon: {
    marginRight: 6,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
  },
  memberSince: {
    fontSize: 13,
    color: '#888',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(17, 131, 71, 0.1)',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#118347',
    marginLeft: 4,
  },
  walletCardContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  walletGradient: {
    borderRadius: 16,
  },
  walletCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  walletIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  walletInfoContainer: {
    flex: 1,
  },
  walletLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  walletBalance: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
  },
  addMoneyButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  addMoneyText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  menuContainer: {
    paddingHorizontal: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(17, 131, 71, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: 12,
    color: '#888',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f1f1',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginLeft: 8,
  },
  versionInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  versionText: {
    fontSize: 12,
    color: '#999',
  },
  walletErrorText: {
    fontSize: 12,
    color: '#ffcccc',
    marginTop: 4,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  loadingText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  viewTransactionsLink: {
    marginTop: 8,
  },
  viewTransactionsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 8,
  },
  menuItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  highlightedMenuItem: {
    backgroundColor: 'rgba(17, 131, 71, 0.05)',
  },
  highlightedMenuItemIcon: {
    backgroundColor: '#118347',
  },
  highlightedMenuItemTitle: {
    color: '#118347',
    fontWeight: '700',
  },
  transactionBadge: {
    backgroundColor: '#f44336',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  transactionBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  guestWalletCard: {
    margin: 15,
    padding: 20,
    backgroundColor: '#118347',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    overflow: 'hidden',
  },
  guestWalletText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },
  signInButtonSimple: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#118347',
  },
  signInButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  businessInfoCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  businessInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  businessInfoTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  businessInfoText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666',
    marginBottom: 20,
  },
  businessFeatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  businessFeature: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(17, 131, 71, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  businessFeatureText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  getStartedButton: {
    backgroundColor: '#118347',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  getStartedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deletionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  deletionModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  deletionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  deletionSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteAccountMenuItem: {
    backgroundColor: 'rgba(204, 51, 0, 0.05)',
  },
  deleteAccountIcon: {
    backgroundColor: 'rgba(204, 51, 0, 0.1)',
  },
  deleteAccountText: {
    color: '#cc3300',
    fontWeight: '700',
  },
  deleteAccountDescription: {
    color: '#cc3300',
  },
  adminNotificationBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF5757',
    position: 'absolute',
    top: 8,
    right: 8,
  },
});

export default ProfileScreen; 