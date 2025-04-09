import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PolicyPageContent from '../../components/PolicyPageContent';
import { PolicyPageType } from '../../services/supabase/policyPagesService';

export default function TermsAndServicesScreen() {
  // Define fallback content that will be shown if the Supabase content isn't available
  const renderFallbackContent = () => (
    <>
      {/* Introduction */}
      <View style={styles.section}>
        <Text style={styles.effectiveDate}>Effective Date: 1st Sep, 2024</Text>
        <Text style={styles.sectionText}>
          Welcome to Paygo.fit! These Terms of Service govern your use of our app, website, and any related services. By accessing or using the Services, you agree to be bound by these Terms. If you do not agree with these Terms, please do not use our Services.
        </Text>
      </View>

      {/* Acceptance of Terms */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.sectionText}>
          By accessing or using the Services, you affirm that you are at least 18 years old, or if you are under 18, that you have received parental or guardian consent to use the Services. If you are using the Services on behalf of a company or other legal entity, you represent that you have the authority to bind that entity to these Terms.
        </Text>
      </View>

      {/* Account Registration */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Account Registration</Text>
        
        <Text style={styles.subsectionTitle}>Account Creation</Text>
        <Text style={styles.sectionText}>
          To use certain features of the Services, you must create an account. You agree to provide accurate and complete information when registering and to update this information as necessary.
        </Text>

        <Text style={styles.subsectionTitle}>Account Security</Text>
        <Text style={styles.sectionText}>
          You are responsible for maintaining the confidentiality of your account login information and for all activities that occur under your account. You agree to notify us immediately of any unauthorised use of your account.
        </Text>
      </View>

      {/* Additional sections would be included here, but truncated for this example */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Use of the Services</Text>
        <Text style={styles.sectionText}>For complete details on how to use our services, please view the full Terms and Conditions on our website.</Text>
      </View>
    </>
  );

  return (
    <PolicyPageContent
      pageType={PolicyPageType.TERMS_AND_CONDITIONS}
      fallbackTitle="Terms of Service"
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
}); 