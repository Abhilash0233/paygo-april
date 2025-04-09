import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isAfter, differenceInMinutes } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { getUserBookings } from '../services/supabase/bookingService';
import { useAuth } from '../services/authContext';
import { BookingsStackParamList } from '../navigation/BookingsStack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { CommonActions } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface Booking {
  id: string;
  centerId: string;
  centerName: string;
  centerImage?: string;
  date: string;
  timeSlot: string;
  sessionType: string;
  price: string;
  status: string;
  createdAt: string;
  userDisplayName?: string;
  hasBeenRescheduled?: boolean;
  originalBookingId?: string;
  centerCategory?: string;
}

type BookingsNavigationProp = StackNavigationProp<
  RootStackParamList & {
    Main: {
      screen: string;
      params: {
        screen: string;
      };
    };
  },
  'BookingsList'
>;

export default function UpcomingBookingCard() {
  const [nextBooking, setNextBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated } = useAuth();
  const navigation = useNavigation<BookingsNavigationProp>();
  const slideAnim = React.useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadNextBooking();
    }
  }, [isAuthenticated, user]);

  const loadNextBooking = async () => {
    if (!user?.id) return;
    
    try {
      const bookings = await getUserBookings(user.id);
      const now = new Date();
      
      // Filter and sort upcoming bookings
      const upcomingBookings = bookings
        .filter(booking => {
          const bookingDate = parseISO(booking.date);
          const timeHour = parseInt(booking.timeSlot.split(':')[0]);
          bookingDate.setHours(timeHour);
          return booking.status === 'confirmed' && isAfter(bookingDate, now);
        })
        .sort((a, b) => {
          const dateA = parseISO(a.date);
          const dateB = parseISO(b.date);
          return dateA.getTime() - dateB.getTime();
        });

      if (upcomingBookings.length > 0) {
        setNextBooking(upcomingBookings[0]);
        // Animate the card in
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }).start();
      }
    } catch (error) {
      console.error('Error loading next booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    if (nextBooking) {
      navigation.navigate('BookingDetails', { 
        bookingId: nextBooking.id,
        bookingData: nextBooking
      });
    }
  };

  const handleScanQR = () => {
    if (!nextBooking?.id) return;
    
    // Navigate to QR scanner screen
    navigation.navigate('QRScanner', { 
      bookingId: nextBooking.id,
      centerName: nextBooking.centerName || ''
    });
  };

  const canScanQR = (bookingDate: Date, timeSlot: string): boolean => {
    const now = new Date();
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const sessionTime = new Date(bookingDate);
    sessionTime.setHours(hours, minutes, 0, 0);
    
    // Calculate minutes until session
    const minutesUntilSession = differenceInMinutes(sessionTime, now);
    
    // Return true if within 60 minutes before session
    return minutesUntilSession <= 60 && minutesUntilSession > -30; // Allow scanning up to 30 mins after start time
  };

  const handleViewPress = () => {
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

  if (!nextBooking || loading) return null;

  const bookingDate = parseISO(nextBooking.date);
  const formattedDate = format(bookingDate, 'EEE, MMM d');
  const formattedTime = nextBooking.timeSlot;

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.95}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="calendar-outline" size={20} color="#118347" />
          </View>
          <Text style={styles.headerText}>UPCOMING SESSION</Text>
          <TouchableOpacity style={styles.viewButton} onPress={handleViewPress}>
            <Text style={styles.viewText}>View</Text>
            <Ionicons name="chevron-forward-outline" size={16} color="#118347" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{nextBooking.centerName}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{nextBooking.sessionType}</Text>
          </View>
          
          <View style={styles.timeContainer}>
            <View style={styles.timeItem}>
              <Ionicons name="calendar-outline" size={16} color="#666666" style={styles.timeIcon} />
              <Text style={styles.timeText}>{formattedDate}</Text>
            </View>
            <View style={styles.timeItem}>
              <Ionicons name="time-outline" size={16} color="#666666" style={styles.timeIcon} />
              <Text style={styles.timeText}>{formattedTime}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[
              styles.qrButton,
              !canScanQR(bookingDate, formattedTime) && styles.qrButtonDisabled
            ]}
            onPress={handleScanQR}
            disabled={!canScanQR(bookingDate, formattedTime)}
          >
            <Ionicons name="qr-code-outline" size={20} color="#FFFFFF" style={styles.qrIcon} />
            <Text style={styles.qrButtonText}>Scan QR Code</Text>
          </TouchableOpacity>

          {!canScanQR(bookingDate, formattedTime) && (
            <Text style={styles.qrNote}>
              QR scanning will be available 1 hour before your session
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#118347',
    flex: 1,
    letterSpacing: 0.5,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9F4',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  viewText: {
    color: '#118347',
    fontSize: 13,
    fontWeight: '500',
    marginRight: 4,
  },
  content: {
    padding: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#E8F5EE',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  badgeText: {
    color: '#118347',
    fontSize: 13,
    fontWeight: '500',
  },
  timeContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeIcon: {
    marginRight: 6,
  },
  timeText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#118347',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
  },
  qrButtonDisabled: {
    backgroundColor: '#A8A8A8',
    opacity: 0.8,
  },
  qrIcon: {
    marginRight: 8,
  },
  qrButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  qrNote: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
  },
}); 