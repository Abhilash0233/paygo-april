import React, { useRef, useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { 
  Modal, 
  ActivityIndicator, 
  View, 
  StyleSheet, 
  Text, 
  Platform,
  StatusBar
} from 'react-native';
import AppHeader from './AppHeader';

interface RazorpayWebViewProps {
  visible: boolean;
  htmlContent: string;
  onPaymentSuccess: (paymentId: string) => void;
  onPaymentError: (error: string) => void;
  onClose: () => void;
}

export default function RazorpayWebView({
  visible,
  htmlContent,
  onPaymentSuccess,
  onPaymentError,
  onClose,
}: RazorpayWebViewProps) {
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    if (visible) {
      console.log('RazorpayWebView mounted with content length:', htmlContent.length);
    }
  }, [visible]);

  const handleMessage = (event: any) => {
    try {
      console.log('Received message from WebView:', event.nativeEvent.data);
      const data = JSON.parse(event.nativeEvent.data);
      if (data.success) {
        console.log('Payment successful:', data.paymentId);
        onPaymentSuccess(data.paymentId);
      } else {
        console.log('Payment failed:', data.error);
        onPaymentError(data.error);
      }
      onClose();
    } catch (error) {
      console.error('Error parsing message:', error);
      onPaymentError('Invalid payment response');
      onClose();
    }
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.warn('WebView error: ', nativeEvent);
    onPaymentError('Failed to load payment page');
    onClose();
  };

  const handleLoadEnd = () => {
    console.log('WebView loaded successfully');
  };

  const handleLoadProgress = ({ nativeEvent }: any) => {
    console.log('Loading progress:', nativeEvent.progress);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <AppHeader
          title="Payment"
          showBackButton={true}
          onBackPress={onClose}
        />

        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          onMessage={handleMessage}
          onError={handleError}
          onLoadEnd={handleLoadEnd}
          onLoadProgress={handleLoadProgress}
          style={styles.webview}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#118347" />
              <Text style={styles.loadingText}>Loading payment page...</Text>
            </View>
          )}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scalesPageToFit={true}
          onNavigationStateChange={(navState) => {
            console.log('Navigation state changed:', navState);
          }}
          originWhitelist={['*']}
          mixedContentMode="always"
          cacheEnabled={false}
          incognito={true}
          userAgent={Platform.select({
            ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
            android: 'Mozilla/5.0 (Linux; Android 10; SM-A505FN) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
          })}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
}); 