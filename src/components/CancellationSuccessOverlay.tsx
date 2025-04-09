import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';

interface CancellationSuccessOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  refundAmount: number;
}

export default function CancellationSuccessOverlay({
  isVisible,
  onClose,
  refundAmount
}: CancellationSuccessOverlayProps) {
  const navigation = useNavigation();

  const handleViewBookings = () => {
    // Navigate to the Bookings tab
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

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>

          <Text style={styles.title}>Booking Cancelled</Text>

          <View style={styles.iconContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#118347" />
          </View>

          <Text style={styles.heading}>Booking Cancelled!</Text>
          
          <Text style={styles.message}>
            Your booking has been successfully cancelled.{'\n'}
            A refund of ₹{refundAmount} has been processed to your wallet.
          </Text>

          <TouchableOpacity
            style={styles.viewBookingsButton}
            onPress={handleViewBookings}
          >
            <Text style={styles.viewBookingsText}>View My Bookings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: Dimensions.get('window').width - 48,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 24,
  },
  iconContainer: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#E6F0EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  viewBookingsButton: {
    backgroundColor: '#118347',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  viewBookingsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 