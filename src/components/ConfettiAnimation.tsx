import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Number of confetti pieces - reduced for less visual noise
const CONFETTI_COUNT = 30;

// Colors for confetti
const COLORS = ['#118347', '#FFD700', '#FF6B6B', '#4D96FF', '#FF8811'];

// Create confetti pieces with random properties
const generateConfetti = () => {
  return Array.from({ length: CONFETTI_COUNT }).map(() => ({
    x: new Animated.Value(Math.random() * SCREEN_WIDTH),
    y: new Animated.Value(-20 - Math.random() * 100),
    rotation: new Animated.Value(0),
    scale: new Animated.Value(0.5 + Math.random() * 0.5),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    width: 8 + Math.random() * 8,
    height: 8 + Math.random() * 16,
    opacity: new Animated.Value(1),
  }));
};

interface ConfettiAnimationProps {
  isVisible: boolean;
  duration?: number;
}

const ConfettiAnimation = ({ isVisible, duration = 4000 }: ConfettiAnimationProps) => {
  const confetti = useRef(generateConfetti()).current;
  const animationsStarted = useRef(false);

  useEffect(() => {
    if (isVisible && !animationsStarted.current) {
      animationsStarted.current = true;
      
      // Start confetti animations
      confetti.forEach((piece, index) => {
        // Reduced delay for quicker start
        const delay = Math.random() * 300;
        // Reduced falling height for shorter animation
        const destinationY = SCREEN_HEIGHT * 0.4 + Math.random() * (SCREEN_HEIGHT * 0.3);
        // Less horizontal sway
        const xSwayAmount = Math.random() * 150 - 75;
        
        // Create animation sequence
        Animated.sequence([
          // Delay start of animation
          Animated.delay(delay),
          // Parallel animations for movement, rotation, and fade
          Animated.parallel([
            // Fall down animation - faster fall
            Animated.timing(piece.y, {
              toValue: destinationY,
              duration: duration * 0.6, // Faster fall
              easing: Easing.bezier(0.1, 0.25, 0.1, 1),
              useNativeDriver: true,
            }),
            // Horizontal movement (swaying) - using relative movement
            Animated.sequence([
              Animated.delay(0), // Immediate start
              Animated.timing(piece.x, {
                toValue: xSwayAmount, // Relative movement
                duration: duration * 0.7, // Shorter duration
                easing: Easing.bezier(0.1, 0.25, 0.1, 1),
                useNativeDriver: true,
              })
            ]),
            // Rotation animation - less rotation
            Animated.timing(piece.rotation, {
              toValue: Math.random() * 6 - 3, // Less rotation
              duration: duration * 0.7, // Shorter duration
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            // Fade out toward the end - start fading earlier
            Animated.timing(piece.opacity, {
              toValue: 0,
              duration: duration * 0.7, // Shorter fade duration
              delay: duration * 0.3, // Start fading earlier
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ]).start();
      });
      
      // Reset for next time - shorter cleanup timeout
      const timer = setTimeout(() => {
        animationsStarted.current = false;
        confetti.forEach(piece => {
          piece.y.setValue(-20 - Math.random() * 100);
          piece.opacity.setValue(1);
        });
      }, duration + 200); // Shorter reset time
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, confetti, duration]);
  
  // Don't render if not visible
  if (!isVisible) return null;
  
  return (
    <View style={styles.container} pointerEvents="none">
      {confetti.map((piece, index) => (
        <Animated.View
          key={index}
          style={[
            {
              position: 'absolute',
              width: piece.width,
              height: piece.height,
              backgroundColor: piece.color,
              borderRadius: 2,
              transform: [
                { translateX: piece.x },
                { translateY: piece.y },
                { rotate: piece.rotation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                })},
                { scale: piece.scale }
              ],
              opacity: piece.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
});

export default ConfettiAnimation; 