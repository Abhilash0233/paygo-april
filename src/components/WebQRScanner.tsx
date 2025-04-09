import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, ActivityIndicator, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isValidCenterQRPayload } from '../utils/qrCodeUtils';

// Import barcode scanner conditionally
let BarCodeScanner: any;
try {
  const BarcodeScannerModule = require('expo-barcode-scanner');
  BarCodeScanner = BarcodeScannerModule.BarCodeScanner;
} catch (error) {
  console.log('Barcode scanner module not available:', error);
  // BarCodeScanner will remain undefined
}

interface WebQRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  bookingId: string;
}

const WebQRScanner: React.FC<WebQRScannerProps> = ({ onScan, onClose, bookingId }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isModuleAvailable, setIsModuleAvailable] = useState(!!BarCodeScanner);

  useEffect(() => {
    // Check if module is available before requesting permissions
    if (!isModuleAvailable) {
      console.log('Barcode scanner module not available');
      return;
    }

    (async () => {
      try {
        const { status } = await BarCodeScanner.requestPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (error) {
        console.error('Error requesting camera permissions:', error);
        Alert.alert(
          'Error',
          'Failed to request camera permissions. The scanner may not work properly.',
          [{ text: 'OK', onPress: onClose }]
        );
      }
    })();
  }, [isModuleAvailable]);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    console.log(`Barcode with type ${type} and data ${data} has been scanned!`);
    
    // Check if it's a valid center QR code
    if (isValidCenterQRPayload(data)) {
      setScanned(true);
      
      // Pass the QR data to the handler
      onScan(data);
    } else {
      Alert.alert(
        'Invalid QR Code',
        'This does not appear to be a valid PayGo center QR code. Please try scanning again.',
        [{ text: 'OK', onPress: () => {} }]
      );
    }
  };

  // Show module unavailable message if barcode scanner is not available
  if (!isModuleAvailable) {
    return (
      <View style={[styles.container, { backgroundColor: '#fff' }]}>
        <Ionicons name="camera-outline" size={64} color="#ef4444" />
        <Text style={styles.title}>QR Scanner Unavailable</Text>
        <Text style={styles.text}>
          The camera scanner module is not available on this device or platform.
          Please try using the app on a physical device.
        </Text>
        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#118347" />
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { backgroundColor: '#fff' }]}>
        <Ionicons name="camera-outline" size={64} color="#ef4444" />
        <Text style={styles.title}>Camera Access Denied</Text>
        <Text style={styles.text}>
          We need camera access to scan QR codes. Please enable camera access in your device settings.
        </Text>
        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {BarCodeScanner ? (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        >
          <View style={styles.overlay}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerText}>Scan Center QR Code</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.scannerContainer}>
              <View style={styles.scanner}>
                {scanned && (
                  <ActivityIndicator size="large" color="#118347" style={styles.processingIndicator} />
                )}
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>

            <View style={styles.footer}>
              <Text style={styles.instructions}>
                Point your camera at the QR code displayed at the center
              </Text>
              
              {scanned && (
                <TouchableOpacity 
                  style={styles.scanAgainButton}
                  onPress={() => setScanned(false)}
                >
                  <Text style={styles.scanAgainButtonText}>Scan Again</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </BarCodeScanner>
      ) : (
        <View style={[styles.container, { backgroundColor: '#000' }]}>
          <Text style={styles.text}>QR Scanner failed to load</Text>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const { width } = Dimensions.get('window');
const scannerSize = width * 0.7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  closeButton: {
    padding: 8,
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  scannerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanner: {
    width: scannerSize,
    height: scannerSize,
    borderRadius: 16,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingIndicator: {
    position: 'absolute',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#118347',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 12,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 50 : 20,
  },
  instructions: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#118347',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scanAgainButton: {
    backgroundColor: '#118347',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  scanAgainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WebQRScanner; 