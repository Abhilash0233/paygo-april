import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PolicyPageContent from '../../components/PolicyPageContent';
import { PolicyPageType } from '../../services/supabase/policyPagesService';

export default function AboutUsScreen() {
  // Define fallback content that will be shown if the Supabase content isn't available
  const renderFallbackContent = () => (
    <>
      <View style={styles.heroSection}>
        <Text style={styles.appName}>PayGo Fitness</Text>
        <Text style={styles.tagline}>Your Fitness Journey, Your Way</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Mission</Text>
        <Text style={styles.sectionText}>
          At PayGo Fitness, we're revolutionizing the way people access fitness facilities. Our mission is to make fitness accessible, flexible, and affordable for everyone. We believe that everyone deserves the opportunity to maintain a healthy lifestyle without the constraints of traditional gym memberships.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Vision</Text>
        <Text style={styles.sectionText}>
          We envision a future where fitness is seamlessly integrated into daily life. Through our innovative pay-per-use model, we're creating a network of premium fitness centers that are accessible to everyone, empowering individuals to take control of their fitness journey.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What We Offer</Text>
        <Text style={styles.sectionText}>
          • Pay-per-use access to premium fitness centers{'\n'}
          • No long-term commitments or memberships{'\n'}
          • Flexible booking options{'\n'}
          • Digital wallet for seamless payments{'\n'}
          • Wide network of partner facilities{'\n'}
          • Professional fitness environment
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Our Values</Text>
        <Text style={styles.sectionText}>
          • Accessibility - Making fitness available to everyone{'\n'}
          • Flexibility - Adapting to your schedule and needs{'\n'}
          • Quality - Partnering with premium fitness facilities{'\n'}
          • Innovation - Leveraging technology for better fitness access{'\n'}
          • Community - Building a supportive fitness community
        </Text>
      </View>
    </>
  );

  return (
    <PolicyPageContent
      pageType={PolicyPageType.ABOUT_US}
      fallbackTitle="About Us"
      fallbackContent={renderFallbackContent()}
    />
  );
}

const styles = StyleSheet.create({
  heroSection: {
    backgroundColor: '#118347',
    padding: 40,
    alignItems: 'center',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
  },
}); 