import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Easing, Text, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreenExpo from 'expo-splash-screen';
import PaygoLogoText from '../../components/PaygoLogoText';
import { Ionicons } from '@expo/vector-icons';

interface SplashScreenProps {
  onComplete?: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  // Animation values
  const logoOpacity = new Animated.Value(0);
  const logoScale = new Animated.Value(0.8);
  const taglineOpacity = new Animated.Value(0);
  const spinValue = new Animated.Value(0);
  
  // Individual icon animations
  const icon1Opacity = new Animated.Value(0);
  const icon1Scale = new Animated.Value(0.5);
  const icon2Opacity = new Animated.Value(0);
  const icon2Scale = new Animated.Value(0.5);
  const icon3Opacity = new Animated.Value(0);
  const icon3Scale = new Animated.Value(0.5);

  // Create the interpolation for rotation
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  useEffect(() => {
    // Animation sequence
    Animated.sequence([
      // Fade in logo
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.ease,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.ease,
        }),
      ]),
      
      // Animate first icon
      Animated.parallel([
        Animated.timing(icon1Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.bounce,
        }),
        Animated.timing(icon1Scale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.elastic(1),
        }),
      ]),
      
      // Animate second icon
      Animated.parallel([
        Animated.timing(icon2Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.bounce,
        }),
        Animated.timing(icon2Scale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.elastic(1),
        }),
      ]),
      
      // Animate third icon
      Animated.parallel([
        Animated.timing(icon3Opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.bounce,
        }),
        Animated.timing(icon3Scale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.elastic(1),
        }),
      ]),
      
      // Fade in tagline
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.ease,
      }),
    ]).start(() => {
      // Delay for showing the entire splash
      setTimeout(() => {
        // Call onComplete if provided
        if (onComplete) {
          onComplete();
        }
      }, 1200);
    });

    // Start spinning animation
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
        isInteraction: false
      })
    ).start();

    // Hide the native splash screen
    SplashScreenExpo.hideAsync().catch(error => {
      console.error('Error hiding native splash screen:', error);
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        {/* Logo - centered vertically */}
        <Animated.View 
          style={[
            styles.logoContainer, 
            { 
              opacity: logoOpacity, 
              transform: [{ scale: logoScale }] 
            }
          ]}
        >
          <PaygoLogoText size="medium" />
        </Animated.View>
        
        {/* Fitness Icons with text labels */}
        <View style={styles.iconsContainer}>
          <Animated.View 
            style={[
              styles.iconItem,
              {
                opacity: icon1Opacity,
                transform: [{ scale: icon1Scale }]
              }
            ]}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="fitness" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.iconText}>Book</Text>
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.iconItem,
              {
                opacity: icon2Opacity,
                transform: [{ scale: icon2Scale }]
              }
            ]}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="body" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.iconText}>Play</Text>
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.iconItem,
              {
                opacity: icon3Opacity,
                transform: [{ scale: icon3Scale }]
              }
            ]}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="heart" size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.iconText}>Stay Fit</Text>
          </Animated.View>
        </View>
      </View>
      
      {/* Tagline and loading indicator at bottom */}
      <View style={styles.footerContainer}>
        <Animated.Text 
          style={[styles.taglineText, { opacity: taglineOpacity }]}
        >
          Your fitness journey starts here!
        </Animated.Text>
        
        <Animated.View 
          style={[styles.loadingContainer, { opacity: taglineOpacity }]}
        >
          <Animated.View 
            style={[
              styles.loadingIndicator, 
              { transform: [{ rotate: spin }] }
            ]} 
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#118347',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 80,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '80%',
  },
  iconItem: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  footerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  taglineText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: Platform.select({ ios: 3, android: 2.5 }),
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderTopColor: '#FFFFFF',
    alignSelf: 'center',
    transform: [{ rotate: '45deg' }]
  },
}); 