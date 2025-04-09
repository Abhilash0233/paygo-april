import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BookingsStackParamList } from '../../navigation/BookingsStack';
import * as Haptics from 'expo-haptics';
import { markAttendance } from '../../services/supabase/bookingService';
import { useAuth } from '../../services/authContext';
import Constants from 'expo-constants';

// Conditionally import barcode scanner to handle missing native module gracefully
let BarCodeScanner: any = null;
try {
  BarCodeScanner = require('expo-barcode-scanner').BarCodeScanner;
} catch (error) {
  console.log('Barcode scanner module not available:', error);
}

const { width } = Dimensions.get('window');
const qrSize = width * 0.7;

type QRScannerNavigationProp = StackNavigationProp<BookingsStackParamList, 'QRScanner'>;
type QRScannerRouteProp = RouteProp<BookingsStackParamList, 'QRScanner'>;

interface QRScannerFrameProps {
  width: number;
  height: number;
  borderColor?: string;
  borderWidth?: number;
}

// QR Scanner Frame Component
const QRScannerFrame: React.FC<QRScannerFrameProps> = ({
  width,
  height,
  borderColor = '#118347',
  borderWidth = 2,
}) => {
  return (
    <View style={{ width, height }}>
      {/* Top Left */}
      <View style={[styles.corner, { 
        top: 0, 
        left: 0, 
        borderTopWidth: borderWidth, 
        borderLeftWidth: borderWidth,
        borderColor 
      }]} />
      
      {/* Top Right */}
      <View style={[styles.corner, { 
        top: 0, 
        right: 0, 
        borderTopWidth: borderWidth, 
        borderRightWidth: borderWidth,
        borderColor 
      }]} />
      
      {/* Bottom Left */}
      <View style={[styles.corner, { 
        bottom: 0, 
        left: 0, 
        borderBottomWidth: borderWidth, 
        borderLeftWidth: borderWidth,
        borderColor 
      }]} />
      
      {/* Bottom Right */}
      <View style={[styles.corner, { 
        bottom: 0, 
        right: 0, 
        borderBottomWidth: borderWidth, 
        borderRightWidth: borderWidth,
        borderColor 
      }]} />
    </View>
  );
};

export default function QRScannerScreen() {
  const navigation = useNavigation<QRScannerNavigationProp>();
  const route = useRoute<QRScannerRouteProp>();
  const { bookingId } = route.params;
  const { user } = useAuth();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [showMockScanner, setShowMockScanner] = useState(!BarCodeScanner);

  // Request camera permissions on component mount
  useEffect(() => {
    if (!BarCodeScanner) {
      // If barcode scanner is not available, always use mock scanner
      setShowMockScanner(true);
      return;
    }

    const getBarCodeScannerPermissions = async () => {
      try {
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        setHasPermission(status === 'granted');
        
        // For development purpose, if we can't access camera, show mock scanner
        if (status !== 'granted') {
          setShowMockScanner(true);
        }
      } catch (error) {
        console.error('Error requesting camera permissions:', error);
        // Fall back to mock scanner
        setShowMockScanner(true);
      }
    };

    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    try {
      setScanned(true);
      
      // Trigger haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Parse the QR code data to extract centerId
      // Assuming format is "paygo:center:CENTER_ID" or similar
      let centerId = data;
      
      if (data.includes(':')) {
        const parts = data.split(':');
        centerId = parts[parts.length - 1];
      }
      
      setScannedData(centerId);
      setShowConfirmation(true);
      
      console.log(`Scanned QR code with data: ${data}, extracted centerId: ${centerId}`);
      
    } catch (error) {
      console.error('Error handling barcode scan:', error);
      Alert.alert(
        'Error',
        'Could not process the QR code. Please try again.'
      );
      setScanned(false);
    }
  };

  const handleMockScan = async () => {
    try {
      // Simulate a scan with a mock center ID
      const mockCenterId = 'TEST_CENTER_001';
      setScannedData(mockCenterId);
      setShowConfirmation(true);
      
      // Trigger haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error in mock scan:', error);
      Alert.alert(
        'Error',
        'Failed to process the mock scan. Please try again.'
      );
    }
  };

  const handleConfirmAttendance = async () => {
    if (!user?.id || !scannedData) {
      Alert.alert('Error', 'User authentication or center data is missing.');
      return;
    }

    setLoading(true);
    
    try {
      // Mark attendance
      const result = await markAttendance(bookingId, scannedData, user.id);
      
      if (result.success) {
        Alert.alert(
          'Attendance Marked',
          'Your attendance has been successfully recorded. Your session has started.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert(
          'Error',
          result.message || 'Failed to mark attendance. Please try again.'
        );
        
        // Allow rescanning if there was an error
        setScanned(false);
        setShowConfirmation(false);
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      Alert.alert(
        'Error',
        'Failed to mark attendance. Please try again.',
      );
      setScanned(false);
      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Center QR Code</Text>
        <View style={{ width: 40 }} />
      </View>

      {BarCodeScanner && hasPermission && !showMockScanner ? (
        <View style={styles.cameraContainer}>
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={styles.camera}
          />
          <View style={styles.overlay}>
            <QRScannerFrame 
              width={qrSize} 
              height={qrSize}
            />
            <Text style={styles.scannerText}>
              Align the QR code within the frame
            </Text>
          </View>
          
          {scanned && !showConfirmation && (
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.rescanButtonText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        // Mock Scanner View (for development or when camera is not available)
        <View style={styles.mockContainer}>
          <View style={styles.qrPreview}>
            <Ionicons name="qr-code" size={120} color="#118347" />
          </View>
          
          <Text style={styles.mockTitle}>Mock QR Scanner</Text>
          <Text style={styles.mockSubtitle}>
            This is a simulated QR scanner for testing purposes.
            {!BarCodeScanner ? 
              " The camera scanner is not available on this device." : 
              " In the production app, this would use your camera to scan a QR code."}
          </Text>

          <TouchableOpacity 
            style={styles.simulateButton}
            onPress={handleMockScan}
            disabled={loading}
          >
            <Ionicons name="scan" size={24} color="#fff" />
            <Text style={styles.simulateButtonText}>
              {loading ? 'Processing...' : 'Simulate QR Scan'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmation}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmationContainer}>
            <View style={styles.confirmationHeader}>
              <Text style={styles.confirmationTitle}>Start Your Session?</Text>
            </View>
            
            <View style={styles.confirmationContent}>
              <Ionicons name="checkmark-circle" size={64} color="#118347" />
              <Text style={styles.confirmationText}>
                Center QR code scanned successfully. Do you want to start your session now?
              </Text>
            </View>
            
            <View style={styles.confirmationButtons}>
              <TouchableOpacity 
                style={[styles.confirmationButton, styles.cancelButton]}
                onPress={() => {
                  setShowConfirmation(false);
                  setScanned(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmationButton, styles.confirmButton]}
                onPress={handleConfirmAttendance}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Start Session</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading && !showConfirmation && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#118347" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
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
    zIndex: 10,
  },
  backButton: {
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
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
  },
  scannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 24,
    textAlign: 'center',
    fontWeight: '500',
  },
  rescanButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#118347',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  rescanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  mockContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  qrPreview: {
    width: qrSize,
    height: qrSize,
    backgroundColor: '#F7F9F8',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  mockTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  mockSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  simulateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#118347',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    width: '80%',
  },
  simulateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmationContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  confirmationHeader: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  confirmationContent: {
    padding: 24,
    alignItems: 'center',
  },
  confirmationText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  confirmationButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  confirmationButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderRightWidth: 1,
    borderRightColor: '#EEEEEE',
  },
  confirmButton: {
    backgroundColor: '#118347',
  },
  cancelButtonText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
    marginTop: 12,
    fontWeight: '500',
  },
  // Permission screen styles
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: '#118347',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsContainer: {
    padding: 24,
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 12,
    flex: 1,
  },
}); 