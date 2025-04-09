import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  TouchableOpacity,
  FlatList,
  Animated,
  useWindowDimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getOnboardingSlides, OnboardingItem as SupabaseOnboardingItem } from '../../services/supabase/onboardingService';

const { width } = Dimensions.get('window');

type OnboardingScreenNavigationProp = StackNavigationProp<RootStackParamList>;

// Fallback data in case Supabase fetch fails
const fallbackOnboardingData = [
  {
    id: '1',
    image: require('../../assets/onboarding/onboarding1.png'),
    title: 'Find Fitness Centers',
    description: 'Discover the best fitness centers near you with real-time availability.',
  },
  {
    id: '2',
    image: require('../../assets/onboarding/onboarding2.png'),
    title: 'Pay-as-you-go',
    description: 'No monthly commitments. Pay only for the sessions you attend.',
  },
  {
    id: '3',
    image: require('../../assets/onboarding/onboarding3.png'),
    title: 'Start your journey',
    description: 'Book your first session and start your fitness journey today!',
  },
];

type OnboardingItemType = {
  id: string;
  image: any;
  imageUrl?: string;
  title: string;
  description: string;
};

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState<OnboardingItemType[]>(fallbackOnboardingData);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation<OnboardingScreenNavigationProp>();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchOnboardingData();
  }, []);

  const fetchOnboardingData = async () => {
    try {
      setIsLoading(true);
      // Fetch onboarding slides from Supabase
      const slides = await getOnboardingSlides();
      
      if (slides && slides.length > 0) {
        const formattedSlides = slides.map((slide) => ({
          id: slide.id || String(slide.order_number),
          imageUrl: slide.image_url,
          title: slide.title,
          description: slide.description,
          image: null, // Will use imageUrl instead
        }));
        
        setOnboardingData(formattedSlides);
      }
    } catch (error) {
      console.error('Error fetching onboarding data from Supabase:', error);
      // Fallback to local images if Supabase fetch fails
      setOnboardingData(fallbackOnboardingData);
    } finally {
      setIsLoading(false);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {onboardingData.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 16, 8],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={`dot-${index}`}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity,
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    try {
      // Navigate to Auth screen which will show PhoneAuth
      navigation.navigate('PhoneAuth');
    } catch (error) {
      console.error('Error during onboarding completion:', error);
      // Continue to Auth even if there's an error
      navigation.navigate('PhoneAuth');
    }
  };

  const renderOnboardingItem = ({ item }: { item: OnboardingItemType }) => {
    // Add console logs to debug image loading
    console.log(`[Onboarding] Rendering item with id: ${item.id}`);
    
    let imageSource = item.image;
    
    // If imageUrl exists but image loading fails, use fallback
    if (item.imageUrl && item.imageUrl.length > 0) {
      console.log(`[Onboarding] Using remote image URL: ${item.imageUrl}`);
      
      // Default to local images if anything goes wrong
      if (!imageSource) {
        if (item.id === '1' || item.id.includes('fc1b9b92')) {
          imageSource = require('../../assets/onboarding/onboarding1.png');
        } else if (item.id === '2' || item.id.includes('5a4e5163')) {
          imageSource = require('../../assets/onboarding/onboarding2.png');
        } else {
          imageSource = require('../../assets/onboarding/onboarding3.png');
        }
      }
    } else {
      console.log('[Onboarding] Using local image');
      // For local images, always set a fallback in case image is null
      if (!imageSource) {
        if (item.id === '1') {
          imageSource = require('../../assets/onboarding/onboarding1.png');
        } else if (item.id === '2') {
          imageSource = require('../../assets/onboarding/onboarding2.png');
        } else {
          imageSource = require('../../assets/onboarding/onboarding3.png');
        }
      }
    }
    
    return (
      <View style={[styles.slide, { height, width }]}>
        {item.imageUrl && item.imageUrl.length > 0 ? (
          <>
            <Image 
              source={{ uri: item.imageUrl }} 
              style={styles.image}
              onError={(e) => {
                console.error(`[Onboarding] Remote image failed to load: ${item.imageUrl}`, e.nativeEvent.error);
                // Switch to local image on failure
                console.log('[Onboarding] Falling back to local image');
                // This will force a re-render with the local image
                item.imageUrl = '';
              }}
            />
            {/* Fallback image rendered below will only show if the remote image fails */}
            <Image 
              source={imageSource}
              style={[styles.image, { opacity: 0 }]}
              onLoad={() => console.log('[Onboarding] Fallback image preloaded successfully')}
            />
          </>
        ) : (
          <Image 
            source={imageSource} 
            style={styles.image}
            onError={(e) => console.error(`[Onboarding] Local image loading error:`, e.nativeEvent.error)}
            onLoad={() => console.log(`[Onboarding] Local image loaded successfully for item ${item.id}`)}
          />
        )}
        
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
          style={styles.gradient}
        >
          <View style={styles.textContainer}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        </LinearGradient>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#118347" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      
      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderOnboardingItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={32}
      />

      <SafeAreaView style={styles.safeFooter} edges={['bottom']}>
        <View style={styles.footer}>
          {renderDots()}
          
          <TouchableOpacity 
            style={styles.nextButton} 
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  slide: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    justifyContent: 'flex-end',
    paddingBottom: 120,
  },
  textContainer: {
    paddingHorizontal: 30,
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  safeFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: Platform.OS === 'ios' ? 10 : 20,
    paddingTop: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginHorizontal: 4,
  },
  nextButton: {
    backgroundColor: '#118347',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 