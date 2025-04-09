import React, { useEffect, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  ViewStyle,
  TextStyle
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

interface BaseOverlayProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: {
    name: keyof typeof Ionicons.glyphMap;
    color?: string;
    size?: number;
  };
  children?: ReactNode;
  primaryButton?: {
    label: string;
    onPress: () => void;
    loading?: boolean;
    loadingText?: string;
    color?: string;
    disabled?: boolean;
  };
  secondaryButton?: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
  };
  contentStyle?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
}

const { height } = Dimensions.get('window');

export default function BaseOverlay({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  children,
  primaryButton,
  secondaryButton,
  contentStyle,
  titleStyle,
  subtitleStyle
}: BaseOverlayProps) {
  // Debug logging is commented for production
  // console.log(`[BaseOverlay] Rendering with visible=${visible}`);
  
  const slideAnim = React.useRef(new Animated.Value(height)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const backdropFadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // First fade in the backdrop
      Animated.timing(backdropFadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      // Then animate the content with a slight delay
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 100);
    } else {
      // First animate out the content
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Then fade out the backdrop
      setTimeout(() => {
        Animated.timing(backdropFadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }, 150);
    }
  }, [visible, slideAnim, fadeAnim, backdropFadeAnim]);

  if (!visible) {
    // console.log('[BaseOverlay] Not showing because visible=false');
    return null;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          StyleSheet.absoluteFill,
          styles.modalContainer,
          { opacity: backdropFadeAnim }
        ]}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalContainer}>
            <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
            <Animated.View 
              style={[
                styles.contentContainer,
                {
                  transform: [{ translateY: slideAnim }],
                  opacity: fadeAnim
                }
              ]}
            >
              <View style={[styles.content, contentStyle]}>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
                
                <Text style={[styles.title, titleStyle]}>{title}</Text>
                {subtitle && <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>}

                {icon && (
                  <View style={styles.iconContainer}>
                    <Ionicons 
                      name={icon.name} 
                      size={icon.size || 40} 
                      color={icon.color || "#666"} 
                    />
                  </View>
                )}

                {children && (
                  <View style={styles.childrenContainer}>
                    {children}
                  </View>
                )}

                {(primaryButton || secondaryButton) && (
                  <View style={styles.buttonContainer}>
                    {primaryButton && (
                      <TouchableOpacity
                        style={[
                          styles.primaryButton,
                          primaryButton.color ? { backgroundColor: primaryButton.color } : null,
                          primaryButton.disabled && styles.disabledButton
                        ]}
                        onPress={primaryButton.onPress}
                        disabled={primaryButton.disabled || primaryButton.loading}
                      >
                        {primaryButton.loading ? (
                          <Text style={styles.primaryButtonText}>
                            {primaryButton.loadingText || 'Loading...'}
                          </Text>
                        ) : (
                          <Text style={styles.primaryButtonText}>{primaryButton.label}</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingTop: 32,
    paddingBottom: Platform.OS === 'ios' ? 34 : 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 36,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  childrenContainer: {
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 0,
  },
  primaryButton: {
    backgroundColor: '#118347',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 24,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#118347',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    marginHorizontal: 0,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
}); 