import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PolicyPageContent from '../../components/PolicyPageContent';
import { PolicyPageType } from '../../services/supabase/policyPagesService';

export default function CancellationPolicyScreen() {
  // Define fallback content that will be shown if the Supabase content isn't available
  const renderFallbackContent = () => (
    <>
      {/* Introduction */}
      <View style={styles.section}>
        <Text style={styles.sectionText}>
          We understand that plans can change. Our cancellation policy is designed to be fair to both our users and fitness centers while maintaining the quality of service.
        </Text>
      </View>

      {/* Free Cancellation */}
      <View style={styles.section}>
        <View style={styles.policyHeader}>
          <Ionicons name="time-outline" size={24} color="#118347" />
          <Text style={styles.sectionTitle}>Free Cancellation</Text>
        </View>
        <Text style={styles.sectionText}>
          Cancel up to 3 hours before your scheduled session for a full refund to your wallet.
        </Text>
        <View style={styles.bulletPoints}>
          <Text style={styles.bulletPoint}>• 100% refund to wallet</Text>
          <Text style={styles.bulletPoint}>• No questions asked</Text>
          <Text style={styles.bulletPoint}>• Instant processing</Text>
        </View>
      </View>

      {/* Late Cancellation */}
      <View style={styles.section}>
        <View style={styles.policyHeader}>
          <Ionicons name="alert-circle-outline" size={24} color="#FF6B6B" />
          <Text style={styles.sectionTitle}>Late Cancellation</Text>
        </View>
        <Text style={styles.sectionText}>
          Cancellations made less than 3 hours before the session:
        </Text>
        <View style={styles.bulletPoints}>
          <Text style={styles.bulletPoint}>• 50% refund to wallet</Text>
          <Text style={styles.bulletPoint}>• Processing time: 24-48 hours</Text>
        </View>
      </View>

      {/* Additional sections would be included here, but truncated for this example */}
      <View style={styles.section}>
        <View style={styles.policyHeader}>
          <Ionicons name="help-circle-outline" size={24} color="#118347" />
          <Text style={styles.sectionTitle}>How to Cancel</Text>
        </View>
        <Text style={styles.sectionText}>
          For detailed information on how to cancel your booking, please view the full Cancellation Policy on our website.
        </Text>
      </View>
    </>
  );

  return (
    <PolicyPageContent
      pageType={PolicyPageType.CANCELLATION_POLICY}
      fallbackTitle="Cancellation Policy"
      fallbackContent={renderFallbackContent()}
    />
  );
}

const styles = StyleSheet.create({
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  sectionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  bulletPoints: {
    marginTop: 12,
  },
  bulletPoint: {
    fontSize: 16,
    color: '#666',
    lineHeight: 28,
    paddingLeft: 8,
  },
}); 