import React, { useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Linking,
  Alert,
  Platform,
  Dimensions,
  Animated,
  StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { parseISO, format } from 'date-fns';

// Type definition for route params
type BookingConfirmationParams = {
  bookingId: string;
  centerName: string;
  date: string;
  timeSlot: string;
  price: number;
  isRescheduled?: boolean;
  sessionType?: string;
  centerCategory?: string;
};

type BookingConfirmationRouteProp = RouteProp<RootStackParamList, 'BookingConfirmation'>;
type BookingConfirmationNavigationProp = StackNavigationProp<RootStackParamList>;

export default function BookingConfirmationScreen() {
  const navigation = useNavigation<BookingConfirmationNavigationProp>();
  const route = useRoute<BookingConfirmationRouteProp>();
  const insets = useSafeAreaInsets();
  const { bookingId, centerName, date, timeSlot, price, isRescheduled, sessionType, centerCategory } = route.params;
  
  // Add animation values for success animation
  const [scaleAnim] = React.useState(new Animated.Value(0));
  const [fadeAnim] = React.useState(new Animated.Value(0));
  
  useEffect(() => {
    // Set status bar to light text for better visibility
    StatusBar.setBarStyle('dark-content');
    
    // Sequence the animations for a more engaging experience
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 15,
        mass: 0.8,
        stiffness: 150,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
    
    return () => {
      // Reset status bar style when leaving screen
      StatusBar.setBarStyle('dark-content');
    };
  }, []);
  
  // Hide bottom tab bar when this screen is focused
  useLayoutEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' }
    });
    
    // Return cleanup function to restore the tab bar when leaving the screen
    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: {
          display: 'flex',
          backgroundColor: '#FFFFFF',
          height: Platform.OS === 'ios' ? 100 : 80,
          paddingTop: 6,
          paddingBottom: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 3,
          borderTopColor: '#f0f0f0',
          borderTopWidth: 1,
          paddingVertical: 0,
          marginBottom: 0
        }
      });
    };
  }, [navigation]);
  
  // Format the date nicely
  const formattedDate = format(parseISO(date), 'EEE, MMM d, yyyy');
  
  // Add the booking event to calendar
  const handleAddToCalendar = async () => {
    try {
      const eventTitle = `Fitness Session at ${centerName}`;
      const eventDetails = `Your booked session: ${sessionType || 'Regular'} at ${timeSlot}`;
      const dateObj = parseISO(date);
      
      // Format date for calendar - this uses a basic deep linking approach
      // For a production app, you'd use a proper calendar library
      const startTime = new Date(dateObj);
      const [hours, minutes] = timeSlot.split(':').map(num => parseInt(num, 10));
      startTime.setHours(hours, minutes, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1); // Assume 1 hour duration
      
      const startTimeISO = startTime.toISOString().replace(/-|:|\.\d+/g, '');
      const endTimeISO = endTime.toISOString().replace(/-|:|\.\d+/g, '');
      
      // This works on iOS but may need adjustments for Android
      const url = `calshow://${startTime.getTime()}`;
      const canOpenURL = await Linking.canOpenURL(url);
      
      if (canOpenURL) {
        Linking.openURL(url);
      } else {
        // Fallback for Android or if iOS calendar app isn't available
        Alert.alert(
          'Add to Calendar',
          'Please add this booking to your calendar manually.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error adding to calendar:', error);
      Alert.alert('Error', 'Could not add to calendar');
    }
  };
  
  const handleShareBooking = async () => {
    try {
      await Share.share({
        message: `I've booked a ${sessionType || 'fitness'} session at ${centerName} on ${formattedDate} at ${timeSlot}. Join me!`,
        title: 'My Fitness Booking'
      });
    } catch (error) {
      console.error('Error sharing booking:', error);
    }
  };
  
  const handleViewBookings = () => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Main',
        params: {
          screen: 'BookingsStack',
          params: {
            screen: 'BookingsList'
          }
        }
      })
    );
  };
  
  const handleGoHome = () => {
    // Navigate back to Main screen with tab reset to Home
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          { 
            name: 'Main',
            // Set the initial tab to Home
            state: {
              routes: [
                { name: 'HomeStack' }
              ],
              index: 0, // Index 0 corresponds to the HomeStack in the Tab.Navigator
            }
          },
        ],
      })
    );
  };
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Transparent Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleGoHome}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[
          styles.scrollViewContent, 
          { paddingTop: insets.top + 60 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Animation */}
        <Animated.View 
          style={[
            styles.successContainer,
            {
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#118347" />
          </View>
          <Text style={styles.successTitle}>
            {isRescheduled ? 'Booking Rescheduled' : 'Booking Confirmed'}
          </Text>
          <Text style={styles.successMessage}>
            {isRescheduled 
              ? 'Your session has been successfully rescheduled.'
              : 'Your session has been successfully booked.'}
          </Text>
        </Animated.View>
        
        {/* Modern Booking Card */}
        <Animated.View 
          style={[
            styles.bookingCard,
            { opacity: fadeAnim }
          ]}
        >
          {/* Center and session type */}
          <View style={styles.sessionInfoContainer}>
            <Text style={styles.centerName} numberOfLines={1}>{centerName}</Text>
            <View style={styles.sessionTypeContainer}>
              <Text style={styles.sessionType}>
                {sessionType || 'Regular Session'}
                {centerCategory ? ` • ${centerCategory}` : ''}
              </Text>
            </View>
          </View>
          
          {/* Key Details */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailColumn}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{formattedDate}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{timeSlot}</Text>
              </View>
            </View>
            
            <View style={styles.detailColumn}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Booking ID</Text>
                <Text style={styles.detailValue}>
                  {typeof bookingId === 'string' ? bookingId.substring(0, 8).toUpperCase() : bookingId}
                </Text>
              </View>
              
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Amount</Text>
                <Text style={styles.detailValue}>₹{price}</Text>
              </View>
            </View>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleAddToCalendar}
            >
              <Ionicons name="calendar-outline" size={20} color="#118347" />
              <Text style={styles.actionButtonText}>Add to Calendar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleShareBooking}
            >
              <Ionicons name="share-social-outline" size={20} color="#118347" />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }}>
        <Animated.View 
          style={[
            styles.footer,
            { opacity: fadeAnim }
          ]}
        >
          <TouchableOpacity
            style={styles.viewBookingsButton}
            onPress={handleViewBookings}
          >
            <Text style={styles.viewBookingsButtonText}>View My Bookings</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    height: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 24,
    paddingHorizontal: 24,
    paddingVertical: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sessionInfoContainer: {
    marginBottom: 24,
  },
  centerName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  sessionTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionType: {
    fontSize: 15,
    color: '#666',
  },
  detailsGrid: {
    flexDirection: 'row',
    marginBottom: 28,
  },
  detailColumn: {
    flex: 1,
  },
  detailItem: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 13,
    color: '#999',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F7F9F8',
    flex: 0.48,
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#118347',
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  viewBookingsButton: {
    backgroundColor: '#118347',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  viewBookingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 