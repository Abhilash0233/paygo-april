import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  StatusBar, 
  SafeAreaView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { LinearGradient } from 'expo-linear-gradient';

// Define category data interface
export interface FitnessCategory {
  id: string;
  name: string;
  description: string;
  image: string;
  features: string[];
  healthBenefits: string[];
  facts: string[];
  color: string; // Primary color for the category
}

type FitnessCategoryDetailRouteProp = RouteProp<RootStackParamList, 'FitnessCategoryDetail'>;
type FitnessCategoryDetailNavigationProp = StackNavigationProp<RootStackParamList>;

export default function FitnessCategoryDetailScreen() {
  const navigation = useNavigation<FitnessCategoryDetailNavigationProp>();
  const route = useRoute<FitnessCategoryDetailRouteProp>();
  const { category } = route.params;
  
  console.log('FitnessCategoryDetailScreen rendered with category:', category?.name);
  
  const { width } = Dimensions.get('window');
  
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Hero Image with Gradient Overlay */}
      <View style={styles.heroContainer}>
        <Image 
          source={{ uri: category.image }} 
          style={styles.heroImage} 
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.heroGradient}
        />
        
        {/* Back Button */}
        <SafeAreaView style={styles.topBar}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
        </SafeAreaView>
        
        {/* Category Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.categoryTitle}>{category.name}</Text>
        </View>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About {category.name}</Text>
          <Text style={styles.descriptionText}>{category.description}</Text>
        </View>
        
        {/* Features Section */}
        <View style={[styles.section, { backgroundColor: `${category.color}10` }]}>
          <Text style={styles.sectionTitle}>Key Features</Text>
          <View style={styles.featuresList}>
            {category.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={[styles.featureIconContainer, { backgroundColor: category.color }]}>
                  <Ionicons name="checkmark" size={16} color="#FFF" />
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* Health Benefits Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Benefits</Text>
          <View style={styles.benefitsList}>
            {category.healthBenefits.map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <View style={[styles.benefitIconContainer, { backgroundColor: category.color }]}>
                  <Ionicons name="heart" size={16} color="#FFF" />
                </View>
                <Text style={styles.benefitText}>{benefit}</Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* Interesting Facts Section */}
        <View style={[styles.section, { backgroundColor: `${category.color}10` }]}>
          <Text style={styles.sectionTitle}>Did You Know?</Text>
          <View style={styles.factsList}>
            {category.facts.map((fact, index) => (
              <View key={index} style={styles.factItem}>
                <View style={[styles.factIconContainer, { borderColor: category.color }]}>
                  <Text style={[styles.factNumber, { color: category.color }]}>{index + 1}</Text>
                </View>
                <Text style={styles.factText}>{fact}</Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: category.color }]}
            onPress={() => navigation.navigate('HomeScreen')}
          >
            <Text style={styles.actionButtonText}>Find {category.name} Centers Near You</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  heroContainer: {
    height: 300,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    height: '100%',
    width: '100%',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    margin: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  categoryTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555555',
  },
  featuresList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#444444',
    flex: 1,
  },
  benefitsList: {
    marginTop: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  benefitText: {
    fontSize: 16,
    color: '#444444',
    flex: 1,
  },
  factsList: {
    marginTop: 8,
  },
  factItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  factIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  factNumber: {
    fontSize: 14,
    fontWeight: '700',
  },
  factText: {
    fontSize: 16,
    color: '#444444',
    flex: 1,
  },
  actionContainer: {
    padding: 20,
    marginBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#118347',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
}); 