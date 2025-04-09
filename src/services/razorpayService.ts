import { WebView } from 'react-native-webview';
import { Alert } from 'react-native';
import { getRazorpayKey } from './supabase/paymentConfigService';

interface PaymentOptions {
  amount: number;
  currency: string;
  name: string;
  description: string;
  notes?: {
    [key: string]: string;
  };
}

export async function initiateRazorpayPayment(options: PaymentOptions): Promise<{
  success: boolean;
  htmlContent?: string;
  error?: string;
}> {
  try {
    console.log('[RAZORPAY] Initiating payment with options:', {
      amount: options.amount,
      currency: options.currency,
      name: options.name,
      description: options.description,
      notes: options.notes
    });

    // Get the appropriate Razorpay key based on environment
    const razorpayKey = await getRazorpayKey();
    console.log('[RAZORPAY] Got Razorpay key (first 6 chars):', razorpayKey.substring(0, 6));
    
    // For testing in Expo, we'll use a test payment page
    const testPaymentPage = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
          <style>
            body { margin: 0; padding: 0; background: transparent; }
          </style>
        </head>
        <body>
          <script>
            function initializePayment() {
              console.log('Initializing Razorpay payment');
              var options = {
                key: '${razorpayKey}',
                amount: ${options.amount * 100},
                currency: '${options.currency}',
                name: '${options.name}',
                description: '${options.description}',
                theme: {
                  color: '#118347'
                },
                notes: ${JSON.stringify(options.notes || {})},
                prefill: {
                  contact: '9999999999',
                  email: 'dummy@razorpay.com'
                },
                readonly: {
                  contact: true,
                  email: true
                },
                hidden: {
                  contact: true,
                  email: true
                },
                config: {
                  display: {
                    blocks: {
                      banks: {
                        name: 'All payment methods',
                        instruments: [
                          { method: 'upi' },
                          { method: 'card' },
                          { method: 'wallet' },
                          { method: 'netbanking' }
                        ],
                      },
                    },
                    sequence: ['block.banks'],
                    preferences: {
                      show_default_blocks: false
                    }
                  }
                },
                handler: function(response) {
                  console.log('Payment successful:', response);
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    success: true,
                    paymentId: response.razorpay_payment_id,
                    orderId: response.razorpay_order_id,
                    signature: response.razorpay_signature
                  }));
                },
                modal: {
                  confirm_close: true,
                  escape: false,
                  handleback: true,
                  ondismiss: function() {
                    console.log('Payment modal dismissed by user');
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      success: false,
                      error: 'Payment cancelled by user'
                    }));
                  }
                }
              };

              var rzp1 = new Razorpay(options);
              rzp1.on('payment.failed', function(response) {
                console.error('Payment failed:', response.error);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  success: false,
                  error: response.error.description || 'Payment failed'
                }));
              });

              // Enable external handler for UPI Intent
              window.addEventListener('loadUPIApp', function(e) {
                console.log('Loading UPI app:', e.detail);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'upi_app_loading',
                  data: e.detail
                }));
              });

              console.log('Opening Razorpay payment modal');
              rzp1.open();
            }

            // Initialize payment when page loads
            console.log('Payment page loaded, initializing in 1 second');
            setTimeout(initializePayment, 1000);
          </script>
        </body>
      </html>
    `;

    console.log('[RAZORPAY] Payment page generated successfully');
    return {
      success: true,
      htmlContent: testPaymentPage
    };
  } catch (error: any) {
    console.error('[RAZORPAY] Payment error:', error);
    return {
      success: false,
      error: error.message || 'Payment failed'
    };
  }
}

export function validatePaymentResponse(response: any): boolean {
  console.log('[RAZORPAY] Validating payment response:', response);
  // Add your payment validation logic here
  // This is where you would verify the payment signature
  return true;
} 