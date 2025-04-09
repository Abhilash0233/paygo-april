import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabaseConfig';
import { updateCenterImageUrls } from '../../services/supabase/centerService';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

interface Center {
  id: string;
  name: string;
  image?: string;
  thumbnail_image?: string;
  images?: string[];
}

const ManageCenterImagesScreen = ({ navigation }: any) => {
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<Center | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [mainImageUrl, setMainImageUrl] = useState('');
  const [thumbnailImageUrl, setThumbnailImageUrl] = useState('');
  const [galleryImageUrls, setGalleryImageUrls] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCenters();
  }, []);

  const loadCenters = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('centers')
        .select('id, name, image, thumbnail_image, images')
        .order('name');

      if (error) {
        console.error('Error loading centers:', error);
        Alert.alert('Error', 'Failed to load centers');
      } else if (data) {
        setCenters(data);
      }
    } catch (error) {
      console.error('Exception loading centers:', error);
      Alert.alert('Error', 'Failed to load centers');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCenter = (center: Center) => {
    setSelectedCenter(center);
    setMainImageUrl(center.image || '');
    setThumbnailImageUrl(center.thumbnail_image || '');
    setGalleryImageUrls((center.images || []).join('\n'));
  };

  const handleUpdateImages = async () => {
    if (!selectedCenter) return;

    try {
      setUpdating(true);

      // Parse gallery images from text area (one URL per line)
      const galleryImages = galleryImageUrls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      const success = await updateCenterImageUrls(selectedCenter.id, {
        mainImage: mainImageUrl.trim(),
        thumbnailImage: thumbnailImageUrl.trim(),
        galleryImages: galleryImages
      });

      if (success) {
        Alert.alert('Success', 'Center images updated successfully');
        // Refresh the centers list
        await loadCenters();
        // Update the selected center with new values
        const updatedCenter = {
          ...selectedCenter,
          image: mainImageUrl.trim(),
          thumbnail_image: thumbnailImageUrl.trim(),
          images: galleryImages
        };
        setSelectedCenter(updatedCenter);
      } else {
        Alert.alert('Error', 'Failed to update center images');
      }
    } catch (error) {
      console.error('Error updating center images:', error);
      Alert.alert('Error', 'Failed to update center images');
    } finally {
      setUpdating(false);
    }
  };

  const filteredCenters = centers.filter(center => 
    center.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    center.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#118347" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Center Images</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAwareScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search centers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#118347" />
            <Text style={styles.loadingText}>Loading centers...</Text>
          </View>
        ) : (
          <View style={styles.splitContainer}>
            <View style={styles.centersListContainer}>
              <Text style={styles.sectionTitle}>Centers ({filteredCenters.length})</Text>
              <ScrollView style={styles.centersList}>
                {filteredCenters.map(center => (
                  <TouchableOpacity
                    key={center.id}
                    style={[
                      styles.centerItem,
                      selectedCenter?.id === center.id && styles.selectedCenterItem
                    ]}
                    onPress={() => handleSelectCenter(center)}
                  >
                    <Text style={styles.centerName} numberOfLines={1}>{center.name}</Text>
                    <Text style={styles.centerId} numberOfLines={1}>{center.id}</Text>
                    <View style={styles.imageStatusContainer}>
                      <View 
                        style={[
                          styles.imageStatusDot, 
                          center.image ? styles.imageStatusDotPresent : styles.imageStatusDotMissing
                        ]} 
                      />
                      <Text style={styles.imageStatusText}>
                        {center.image ? 'Main Image' : 'No Main Image'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.editorContainer}>
              {selectedCenter ? (
                <>
                  <Text style={styles.sectionTitle}>Update Images for {selectedCenter.name}</Text>
                  
                  <Text style={styles.label}>Main Image URL</Text>
                  <TextInput
                    style={styles.input}
                    value={mainImageUrl}
                    onChangeText={setMainImageUrl}
                    placeholder="Enter main image URL..."
                    multiline
                  />
                  
                  <Text style={styles.label}>Thumbnail Image URL</Text>
                  <TextInput
                    style={styles.input}
                    value={thumbnailImageUrl}
                    onChangeText={setThumbnailImageUrl}
                    placeholder="Enter thumbnail image URL..."
                    multiline
                  />
                  
                  <Text style={styles.label}>Gallery Image URLs (one per line)</Text>
                  <TextInput
                    style={styles.textArea}
                    value={galleryImageUrls}
                    onChangeText={setGalleryImageUrls}
                    placeholder="Enter gallery image URLs (one per line)..."
                    multiline
                    numberOfLines={6}
                  />
                  
                  <TouchableOpacity
                    style={styles.updateButton}
                    onPress={handleUpdateImages}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.updateButtonText}>Update Images</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.noSelectionContainer}>
                  <Ionicons name="images-outline" size={60} color="#ccc" />
                  <Text style={styles.noSelectionText}>
                    Select a center from the list to manage its images
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#118347',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  splitContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  centersListContainer: {
    flex: 1,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  centersList: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingVertical: 8,
    maxHeight: 400,
  },
  centerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedCenterItem: {
    backgroundColor: '#e6f7ef',
  },
  centerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  centerId: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  imageStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  imageStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  imageStatusDotPresent: {
    backgroundColor: '#4CAF50',
  },
  imageStatusDotMissing: {
    backgroundColor: '#F44336',
  },
  imageStatusText: {
    fontSize: 12,
    color: '#666',
  },
  editorContainer: {
    flex: 2,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  updateButton: {
    backgroundColor: '#118347',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noSelectionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noSelectionText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default ManageCenterImagesScreen; 