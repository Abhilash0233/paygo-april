import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback, Dimensions, Platform, ScrollView } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { getUserProfile } from '../services/supabase/userService';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface WelcomeOverlayProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  isFirstTimeUser: boolean;
}

export default function WelcomeOverlay({ visible, onClose, userId, isFirstTimeUser }: WelcomeOverlayProps) {
  const [username, setUsername] = useState<string>('');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (userId) {
        try {
          console.log(`[WelcomeOverlay] Fetching user profile for ID: ${userId}`);
          const userProfile = await getUserProfile(userId);
          
          if (userProfile) {
            console.log('[WelcomeOverlay] User profile found:', JSON.stringify(userProfile, null, 2));
            // Try to get the name in order of preference
            let userName = '';
            if (userProfile.display_name?.trim()) {
              userName = userProfile.display_name.trim();
            } else if (userProfile.phone_number) {
              // Use last 4 digits of phone as fallback
              userName = `User ${userProfile.phone_number.slice(-4)}`;
            }
            setUsername(userName);
            console.log(`[WelcomeOverlay] Set username to: ${userName}`);
          } else {
            console.log('[WelcomeOverlay] No user profile found');
            setUsername('there');
          }
        } catch (error) {
          console.error('[WelcomeOverlay] Error fetching user profile:', error);
          // Fallback to generic greeting on error
          setUsername('there');
        }
      } else {
        console.log('[WelcomeOverlay] No userId provided');
        setUsername('there');
      }
    };

    if (visible) {
      console.log(`[WelcomeOverlay] Overlay is visible. userId: ${userId}, isFirstTimeUser: ${isFirstTimeUser}`);
      fetchUserProfile();
    }
  }, [visible, userId, isFirstTimeUser]);

  // Log when overlay becomes visible or hidden
  useEffect(() => {
    console.log(`[WelcomeOverlay] Visibility changed to: ${visible}`);
  }, [visible]);

  // Log directly when the component is rendered
  console.log(`[WelcomeOverlay] Component rendered: visible=${visible}, userId=${userId}, isFirstTimeUser=${isFirstTimeUser}`);

  // Add extra empty render check
  if (!visible) {
    console.log('[WelcomeOverlay] Not rendering because visible=false');
    return null;
  }

  console.log('[WelcomeOverlay] Rendering overlay content');
  
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <BlurView intensity={Platform.OS === 'ios' ? 25 : 15} tint="dark" style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        
        <View style={styles.bottomSheetContainer}>
          <View style={styles.contentContainer}>
            {/* Indicator Bar - Top of modal for drag affordance */}
            <View style={styles.indicatorBarTop} />

            {/* Green Header */}
            <LinearGradient
              colors={['#118347', '#0c6535']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.header}
            >
              <Text style={styles.title}>Welcome to Paygo!</Text>
              <Text style={styles.subtitle}>Hello {username || 'there'}!</Text>
            </LinearGradient>
            
            {/* Content with ScrollView to ensure content is scrollable */}
            <ScrollView 
              style={styles.bodyContainer}
              contentContainerStyle={styles.bodyContentContainer}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.description}>
                We're excited to have you join our fitness community. Here's how Paygo Fitness works:
              </Text>
              
              {/* Feature: Pay-Per-Use Model */}
              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <MaterialIcons name="account-balance-wallet" size={24} color="#118347" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Pay-Per-Use Model</Text>
                  <Text style={styles.featureDescription}>
                    Add money to your wallet and pay only for the sessions you attend. No monthly commitments.
                  </Text>
                </View>
              </View>
              
              {/* Feature: Multiple Locations */}
              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <MaterialCommunityIcons name="map-marker" size={24} color="#118347" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Multiple Locations</Text>
                  <Text style={styles.featureDescription}>
                    Access fitness centers across the city. Work out wherever is most convenient for you.
                  </Text>
                </View>
              </View>
              
              {/* Feature: Flexible Scheduling */}
              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <MaterialIcons name="access-time" size={24} color="#118347" />
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Flexible Scheduling</Text>
                  <Text style={styles.featureDescription}>
                    Book sessions at your convenience. Cancel up to 1 hour before with no penalties.
                  </Text>
                </View>
              </View>
              
              {/* Get Started Button */}
              <TouchableOpacity 
                style={styles.getStartedButton}
                activeOpacity={0.8}
                onPress={() => {
                  console.log('[WelcomeOverlay] Get Started button pressed');
                  onClose();
                }}
              >
                <Text style={styles.getStartedButtonText}>Get Started</Text>
              </TouchableOpacity>

              {/* Bottom indicator bar for iOS */}
              {Platform.OS === 'ios' && (
                <View style={styles.indicatorBar} />
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    margin: 0,
  },
  bottomSheetContainer: {
    width: '100%',
    height: Platform.OS === 'ios' ? height * 0.7 : height * 0.65, // Reduced height for Android
    justifyContent: 'flex-end',
  },
  contentContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  indicatorBarTop: {
    width: 36,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    padding: 16,
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
    ...Platform.select({
      ios: {
        height: 92,
      },
      android: {
        height: 90, // Reduced height for Android
      },
    }),
    justifyContent: 'center',
  },
  title: {
    fontSize: Platform.OS === 'ios' ? 22 : 21,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    lineHeight: Platform.OS === 'ios' ? 28 : 26,
  },
  subtitle: {
    fontSize: Platform.OS === 'ios' ? 16 : 15,
    color: 'white',
    opacity: 0.95,
    marginTop: 4,
    fontWeight: '500',
  },
  bodyContainer: {
    flex: 1,
  },
  bodyContentContainer: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
  },
  description: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: Platform.OS === 'ios' ? 20 : 16, // Reduced spacing for Android
    alignItems: 'flex-start',
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#edf7f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#118347',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  featureTextContainer: {
    flex: 1,
    paddingTop: 2,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  featureDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    fontWeight: '400',
  },
  getStartedButton: {
    backgroundColor: '#118347',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#118347',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  getStartedButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  indicatorBar: {
    width: 40,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 24,
  }
}); 