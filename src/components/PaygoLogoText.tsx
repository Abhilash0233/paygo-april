import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PaygoLogoTextProps {
  size?: 'small' | 'medium' | 'large';
  showTagline?: boolean;
  color?: string;
  fitColor?: string;
}

export default function PaygoLogoText({ 
  size = 'medium', 
  showTagline = false,
  color = '#FFFFFF',
  fitColor = '#4CD964'
}: PaygoLogoTextProps) {
  
  // Size mappings
  const fontSize = {
    small: 24,
    medium: 36,
    large: 48
  }[size];
  
  const taglineSize = {
    small: 12,
    medium: 16,
    large: 20
  }[size];
  
  return (
    <View style={styles.container}>
      <View style={styles.logoRow}>
        <Text style={[styles.logoText, { fontSize, color }]}>
          Paygo<Text style={{ color: fitColor }}>.fit</Text>
        </Text>
      </View>
      
      {showTagline && (
        <Text style={[styles.tagline, { fontSize: taglineSize, color }]}>
          Book. Play. Stay Fit.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoText: {
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  tagline: {
    marginTop: 8,
    opacity: 0.9,
    letterSpacing: 0.5,
  }
}); 