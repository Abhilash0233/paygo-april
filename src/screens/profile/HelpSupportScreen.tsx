import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/AppHeader';

export default function HelpSupportScreen() {
  const navigation = useNavigation();

  const handleWhatsApp = async () => {
    const phoneNumber = '916301998133';
    const whatsappUrl = Platform.select({
      ios: `whatsapp://send?phone=${phoneNumber}`,
      android: `whatsapp://send?phone=${phoneNumber}`,
      default: `whatsapp://send?phone=${phoneNumber}`
    });

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert(
          'WhatsApp Not Installed',
          'Please install WhatsApp to contact us through this method.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      Alert.alert('Error', 'Could not open WhatsApp. Please try another contact method.');
    }
  };

  const handleInstagram = async () => {
    const instagramUrl = 'https://www.instagram.com/paygo.fit';
    try {
      const canOpen = await Linking.canOpenURL(instagramUrl);
      if (canOpen) {
        await Linking.openURL(instagramUrl);
      } else {
        Alert.alert('Error', 'Could not open Instagram. Please check if you have Instagram installed.');
      }
    } catch (error) {
      console.error('Error opening Instagram:', error);
      Alert.alert('Error', 'Could not open Instagram. Please try another contact method.');
    }
  };

  const handleEmail = async () => {
    const emailUrl = 'mailto:hello@paygo.fit';
    try {
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
      } else {
        Alert.alert('Error', 'Could not open email client. Please try another contact method.');
      }
    } catch (error) {
      console.error('Error opening email:', error);
      Alert.alert('Error', 'Could not open email client. Please try another contact method.');
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader 
        title="Help & Support"
        showBackButton={true}
      />
      
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.description}>
          Get in touch with us through any of these channels. We're here to help!
        </Text>

        {/* WhatsApp Option */}
        <TouchableOpacity 
          style={styles.contactOption}
          onPress={handleWhatsApp}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#25D366' }]}>
            <Ionicons name="logo-whatsapp" size={24} color="#FFF" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>WhatsApp</Text>
            <Text style={styles.optionDescription}>Chat with us on WhatsApp</Text>
            <Text style={styles.contactDetail}>+91 6301998133</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* Instagram Option */}
        <TouchableOpacity 
          style={styles.contactOption}
          onPress={handleInstagram}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#E4405F' }]}>
            <Ionicons name="logo-instagram" size={24} color="#FFF" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Instagram</Text>
            <Text style={styles.optionDescription}>Follow us on Instagram</Text>
            <Text style={styles.contactDetail}>@paygo.fit</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* Email Option */}
        <TouchableOpacity 
          style={styles.contactOption}
          onPress={handleEmail}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#118347' }]}>
            <Ionicons name="mail" size={24} color="#FFF" />
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Email</Text>
            <Text style={styles.optionDescription}>Send us an email</Text>
            <Text style={styles.contactDetail}>hello@paygo.fit</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  description: {
    fontSize: 15,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  contactDetail: {
    fontSize: 14,
    color: '#118347',
    fontWeight: '500',
  },
}); 