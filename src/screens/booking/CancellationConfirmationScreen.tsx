import React, { useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BookingsStackParamList } from '../../navigation/BookingsStack';
import { format, parseISO } from 'date-fns';

type CancellationConfirmationNavigationProp = StackNavigationProp<BookingsStackParamList, 'CancellationConfirmation'>;
type CancellationConfirmationRouteProp = RouteProp<BookingsStackParamList, 'CancellationConfirmation'>;

export default function CancellationConfirmationScreen() {
  const navigation = useNavigation<CancellationConfirmationNavigationProp>();
  const route = useRoute<CancellationConfirmationRouteProp>();
  const { bookingId, centerName, date, timeSlot, price, sessionType, refundAmount } = route.params;

  // Hide bottom tab bar when this screen is focused
  useLayoutEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' }
    });

    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: {
          display: 'flex',
          backgroundColor: '#FFFFFF',
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 5
        }
      });
    };
  }, [navigation]);

  // Format date for display
  const formattedDate = format(parseISO(date), 'EEEE, MMMM d, yyyy');

  // Handle navigation to bookings list
  const handleGoToBookings = () => {
    navigation.navigate('BookingsList');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={handleGoToBookings}
        >
          <Ionicons name="close" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Cancelled</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        {/* Success Animation/Icon */}
        <View style={styles.successContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#118347" />
          </View>
          <Text style={styles.successTitle}>Booking Cancelled!</Text>
          <Text style={styles.successMessage}>
            Your booking has been successfully cancelled.{'\n'}
            A refund of ₹{refundAmount} has been processed to your wallet.
          </Text>
        </View>

        {/* Booking Details Card */}
        <View style={styles.card}>
          {/* Center Info */}
          <View style={styles.centerInfoContainer}>
            <Text style={styles.centerName}>{centerName}</Text>
            {sessionType && (
              <Text style={styles.sessionType}>{sessionType}</Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Cancelled Booking Details */}
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Cancelled Booking Details</Text>

            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="document-text-outline" size={20} color="#118347" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Booking ID</Text>
                <Text style={styles.detailValue}>{bookingId.substring(0, 8)}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="calendar-outline" size={20} color="#118347" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{formattedDate}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="time-outline" size={20} color="#118347" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{timeSlot}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Ionicons name="wallet-outline" size={20} color="#118347" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Refund Amount</Text>
                <Text style={styles.detailValue}>₹{refundAmount}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleGoToBookings}
          >
            <Text style={styles.primaryButtonText}>View My Bookings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    letterSpacing: -0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#E6F0EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  successMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  centerInfoContainer: {
    marginBottom: 16,
  },
  centerName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  sessionType: {
    fontSize: 15,
    color: '#666',
    letterSpacing: -0.2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 16,
  },
  detailsContainer: {
    marginTop: 4,
  },
  detailsTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  detailValue: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  actionsContainer: {
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#118347',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  }
}); 