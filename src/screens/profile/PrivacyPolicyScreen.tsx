import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PolicyPageContent from '../../components/PolicyPageContent';
import { PolicyPageType } from '../../services/supabase/policyPagesService';

export default function PrivacyPolicyScreen() {
  // Define fallback content that will be shown if the Supabase content isn't available
  const renderFallbackContent = () => (
    <>
      {/* Effective Date */}
      <View style={styles.section}>
        <Text style={styles.effectiveDate}>Effective Date: 1st Sep, 2024</Text>
        <Text style={styles.sectionText}>
          Paygo.fit is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our app, website, and any related services (collectively, the "Services"). By accessing or using the Services, you agree to the terms of this Privacy Policy.
        </Text>
      </View>

      {/* Information We Collect */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.subsectionTitle}>1.1 Personal Information</Text>
        <Text style={styles.sectionText}>When you create an account or use the Services, we may collect personal information that you voluntarily provide, including:</Text>
        <View style={styles.bulletPoints}>
          <Text style={styles.bulletPoint}>• Name</Text>
          <Text style={styles.bulletPoint}>• Phone number</Text>
          <Text style={styles.bulletPoint}>• Location data</Text>
        </View>

        <Text style={styles.subsectionTitle}>1.2 Payment Information</Text>
        <Text style={styles.sectionText}>
          We collect payment information when you make a purchase through the Services. Payment details, such as credit card numbers, are processed by a secure third-party payment processor and are not stored on our servers.
        </Text>

        <Text style={styles.subsectionTitle}>1.3 Activity Data</Text>
        <Text style={styles.sectionText}>We collect information about the fitness sessions and activities you book through the Services, including:</Text>
        <View style={styles.bulletPoints}>
          <Text style={styles.bulletPoint}>• Type of activity</Text>
          <Text style={styles.bulletPoint}>• Date and time of the session</Text>
          <Text style={styles.bulletPoint}>• Location of the activity</Text>
          <Text style={styles.bulletPoint}>• Attendance records</Text>
        </View>

        <Text style={styles.subsectionTitle}>1.4 Device and Usage Information</Text>
        <Text style={styles.sectionText}>We may collect information about the device you use to access our Services, including:</Text>
        <View style={styles.bulletPoints}>
          <Text style={styles.bulletPoint}>• IP address</Text>
          <Text style={styles.bulletPoint}>• Browser type</Text>
          <Text style={styles.bulletPoint}>• Operating system</Text>
          <Text style={styles.bulletPoint}>• Device identifier</Text>
          <Text style={styles.bulletPoint}>• App usage data</Text>
        </View>
      </View>

      {/* Additional sections would be included here, but truncated for this example */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.sectionText}>For details on how we use your information, please view the complete Privacy Policy on our website.</Text>
      </View>
    </>
  );

  return (
    <PolicyPageContent
      pageType={PolicyPageType.PRIVACY_POLICY}
      fallbackTitle="Privacy Policy"
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
  effectiveDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  bulletPoints: {
    marginTop: 8,
    marginLeft: 8,
  },
  bulletPoint: {
    fontSize: 16,
    color: '#666',
    lineHeight: 28,
  },
}); 