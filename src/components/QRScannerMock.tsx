import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView,
  Dimensions,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { extractCenterIdFromQRPayload } from '../utils/qrCodeUtils';
import { supabase } from '../config/supabaseConfig';

interface QRScannerMockProps {
  onScan: (data: string) => void;
  onClose: () => void;
  bookingId: string;
}

const QRScannerMock: React.FC<QRScannerMockProps> = ({ onScan, onClose, bookingId }) => {
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [centerData, setCenterData] = useState<{id: string, name: string} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate permission request and fetch center data
    const init = async () => {
      setLoading(true);
      try {
        // Fetch booking data to get center ID
        if (bookingId) {
          const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();
          
          if (bookingError) throw bookingError;
          
          if (booking) {
            const centerId = booking.center_id;
            
            if (centerId) {
              // Fetch center name for display
              const { data: center, error: centerError } = await supabase
                .from('centers')
                .select('name')
                .eq('id', centerId)
                .single();
                
              if (centerError) throw centerError;
              
              if (center) {
                setCenterData({
                  id: centerId,
                  name: center.name || 'Unknown Center'
                });
              } else {
                setCenterData({
                  id: centerId,
                  name: 'Unknown Center'
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching booking or center data:', error);
      } finally {
        setHasPermission(true);
        setLoading(false);
      }
    };
    
    init();
  }, [bookingId]);

  const simulateScan = () => {
    if (!centerData?.id) {
      Alert.alert('Error', 'Could not retrieve center information for this booking.');
      return;
    }
    
    setScanning(true);

    // Simulate the scanning process with actual center ID
    setTimeout(() => {
      // Create a QR code with the payload format: paygo-center:{centerId}
      const mockQRData = `paygo-center:${centerData.id}`;
      console.log(`Simulating QR scan with center ID: ${centerData.id}`);
      
      setScanning(false);
      onScan(mockQRData);
    }, 2000);
  };

  if (loading || hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#118347" />
          <Text style={styles.loadingText}>
            {loading ? 'Loading booking information...' : 'Requesting camera permission...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onClose}
        >
          <Ionicons name="arrow-back" size={24} color="#118347" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Center QR Code</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.mockContainer}>
        <Ionicons name="qr-code" size={80} color="#118347" />
        <Text style={styles.mockTitle}>Mock QR Scanner</Text>
        
        {centerData ? (
          <Text style={styles.centerName}>
            Center: {centerData.name}
          </Text>
        ) : null}
        
        <Text style={styles.mockDescription}>
          This is a simulated QR scanner for testing purposes. In the real app, this would use your camera to scan a QR code at the fitness center.
        </Text>
        
        {scanning ? (
          <View style={styles.scanningContainer}>
            <ActivityIndicator size="large" color="#118347" />
            <Text style={styles.scanningText}>Scanning QR code...</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.scanButton}
            onPress={simulateScan}
            disabled={!centerData}
          >
            <Ionicons name="scan-outline" size={24} color="#fff" />
            <Text style={styles.scanButtonText}>Simulate QR Scan</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoHeader}>How it works:</Text>
          <Text style={styles.infoText}>
            1. Go to the fitness center
          </Text>
          <Text style={styles.infoText}>
            2. Scan the center's QR code
          </Text>
          <Text style={styles.infoText}>
            3. Your attendance will be marked after validation
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  mockContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    paddingTop: 40,
  },
  mockTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  centerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#118347',
    marginBottom: 16,
    textAlign: 'center',
  },
  mockDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#118347',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginBottom: 40,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  scanningContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  scanningText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  infoContainer: {
    width: '100%',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  infoHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    paddingLeft: 10,
  },
});

export default QRScannerMock; 