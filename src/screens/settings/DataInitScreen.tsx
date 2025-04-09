import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase, getServiceRoleClient } from '../../config/supabaseConfig';

interface StatusMessage {
  text: string;
  type: 'info' | 'success' | 'error';
  timestamp: Date;
}

// Sample data for initializing centers in Supabase
const sampleCenters = [
  {
    id: 'CTR-2023-0001',
    name: 'Fitness Fusion',
    location: '123 Main St, Hyderabad, Telangana',
    city: 'Hyderabad',
    state: 'Telangana',
    category_id: 'cat-gym',
    price_per_session: 299,
    rating: 4.8,
    latitude: 17.4474,
    longitude: 78.4487,
    activities: ['Cardio', 'Weight Training', 'HIIT'],
    description: 'A premium fitness center with state-of-the-art equipment.',
    image_url: '/storage/v1/object/public/center-images/CTR-2023-0001/main/main.png'
  },
  {
    id: 'CTR-2023-0002',
    name: 'Yoga Haven',
    location: '456 Peace Blvd, Hyderabad, Telangana',
    city: 'Hyderabad',
    state: 'Telangana',
    category_id: 'cat-yoga',
    price_per_session: 249,
    rating: 4.9,
    latitude: 17.4420,
    longitude: 78.4430,
    activities: ['Hatha Yoga', 'Meditation', 'Breathing Exercises'],
    description: 'Find your inner peace in our serene yoga sanctuary.',
    image_url: '/storage/v1/object/public/center-images/CTR-2023-0002/main/main.png'
  },
  {
    id: 'CTR-2023-0003',
    name: 'Aqua Fitness',
    location: '789 Water Lane, Hyderabad, Telangana',
    city: 'Hyderabad',
    state: 'Telangana',
    category_id: 'cat-swimming',
    price_per_session: 349,
    rating: 4.7,
    latitude: 17.4520,
    longitude: 78.4350,
    activities: ['Swimming Lessons', 'Aqua Aerobics', 'Pool Fitness'],
    description: 'Olympic-sized pool with expert instructors for all ages.',
    image_url: '/storage/v1/object/public/center-images/CTR-2023-0003/main/main.png'
  }
];

// Sample categories for Supabase
const sampleCategories = [
  { 
    id: 'cat-gym', 
    name: 'Gym', 
    color: '#118347',
    image: '/storage/v1/object/public/categories/gym.png'
  },
  { 
    id: 'cat-yoga', 
    name: 'Yoga', 
    color: '#FF9500',
    image: '/storage/v1/object/public/categories/yoga.png'
  },
  { 
    id: 'cat-swimming', 
    name: 'Swimming', 
    color: '#0066CC',
    image: '/storage/v1/object/public/categories/swimming.png'
  },
  { 
    id: 'cat-sports', 
    name: 'Sports', 
    color: '#FF3B30',
    image: '/storage/v1/object/public/categories/sports.png'
  }
];

function DataInitScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<StatusMessage[]>([
    { text: 'Ready to initialize data.', type: 'info', timestamp: new Date() }
  ]);

  const addMessage = (text: string, type: 'info' | 'success' | 'error') => {
    setMessages(prev => [...prev, { text, type, timestamp: new Date() }]);
  };

  const handlePopulateSupabase = async () => {
    setLoading(true);
    addMessage('Starting to populate Supabase...', 'info');
    
    try {
      // Get service role client with admin privileges
      const serviceClient = getServiceRoleClient();
      
      // Add categories first
      addMessage('Adding categories...', 'info');
      for (const category of sampleCategories) {
        const { error } = await serviceClient
          .from('categories')
          .upsert(category, { onConflict: 'id' });
          
        if (error) {
          addMessage(`Error adding category ${category.name}: ${error.message}`, 'error');
        } else {
          addMessage(`Added category: ${category.name}`, 'success');
        }
      }
      
      // Add centers
      addMessage('Adding sample centers...', 'info');
      for (const center of sampleCenters) {
        const { error } = await serviceClient
          .from('centers')
          .upsert(center, { onConflict: 'id' });
          
        if (error) {
          addMessage(`Error adding center ${center.name}: ${error.message}`, 'error');
        } else {
          addMessage(`Added center: ${center.name}`, 'success');
        }
      }
      
      addMessage('Successfully added sample data to Supabase!', 'success');
    } catch (error) {
      console.error('Error in data initialization:', error);
      addMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testSupabaseConnection = async () => {
    setLoading(true);
    addMessage('Testing Supabase connection...', 'info');
    
    try {
      // Test basic connection
      addMessage('Attempting to connect to Supabase...', 'info');
      
      // Try to access the centers table
      const { data: centers, error } = await supabase
        .from('centers')
        .select('*')
        .limit(5);
      
      if (error) {
        throw error;
      }
      
      addMessage('Successfully connected to Supabase', 'success');
      addMessage(`Successfully queried Supabase. Found ${centers?.length || 0} centers.`, 'success');
      
      if (!centers || centers.length === 0) {
        addMessage('Centers table is empty. You may need to initialize sample data.', 'info');
      } else {
        // Log first document details
        const firstCenter = centers[0];
        addMessage(`Sample center ID: ${firstCenter.id}`, 'info');
        addMessage(`Sample data: ${JSON.stringify(firstCenter, null, 2)}`, 'info');
      }
      
    } catch (error) {
      console.error('Error testing Supabase connection:', error);
      if (error instanceof Error) {
        addMessage(`Connection error: ${error.message}`, 'error');
      } else {
        addMessage('An unknown error occurred while testing connection', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Data Initialization</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.description}>
          This screen allows you to populate your Supabase database with sample fitness center data.
          Use this only for development and testing purposes.
        </Text>
        
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handlePopulateSupabase}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Initialize Sample Data</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.testButton, loading && styles.buttonDisabled]} 
          onPress={testSupabaseConnection}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Test Supabase Connection</Text>
        </TouchableOpacity>
        
        <View style={styles.logContainer}>
          <Text style={styles.logTitle}>Activity Log:</Text>
          <ScrollView style={styles.logScrollView}>
            {messages.map((msg, index) => {
              // Safely determine the log style based on message type
              let logTypeStyle = styles.logInfo;
              if (msg.type === 'success') logTypeStyle = styles.logSuccess;
              if (msg.type === 'error') logTypeStyle = styles.logError;
              
              return (
                <View key={index} style={styles.logEntry}>
                  <Text style={[styles.logText, logTypeStyle]}>
                    {msg.text}
                  </Text>
                  <Text style={styles.timestamp}>
                    {msg.timestamp.toLocaleTimeString()}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  description: {
    fontSize: 16,
    color: '#555',
    marginBottom: 24,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#118347',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  testButton: {
    backgroundColor: '#0066CC',
  },
  buttonDisabled: {
    backgroundColor: '#86c3a5',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  logTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  logScrollView: {
    flex: 1,
  },
  logEntry: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logText: {
    fontSize: 14,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  logInfo: {
    color: '#0066cc',
  },
  logSuccess: {
    color: '#118347',
  },
  logError: {
    color: '#cc3300',
  },
});

export default DataInitScreen; 