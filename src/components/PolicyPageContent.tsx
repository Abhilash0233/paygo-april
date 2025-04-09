import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PolicyPage, PolicyPageType, getPolicyPageBySlug, subscribeToPolicyPage } from '../services/supabase/policyPagesService';
import { Dimensions } from 'react-native';
import AppHeader from './AppHeader';
import HTML, { HTMLSource } from 'react-native-render-html';

const { width } = Dimensions.get('window');

interface PolicyPageContentProps {
  pageType: PolicyPageType;
  fallbackTitle: string;
  fallbackContent: React.ReactNode;
}

export default function PolicyPageContent({ 
  pageType, 
  fallbackTitle, 
  fallbackContent 
}: PolicyPageContentProps) {
  const [page, setPage] = useState<PolicyPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    const fetchPolicyPage = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const policyPage = await getPolicyPageBySlug(pageType);
        setPage(policyPage);
        
        // Subscribe to real-time updates
        if (policyPage) {
          unsubscribe = subscribeToPolicyPage(pageType, (updatedPage) => {
            setPage(updatedPage);
          });
        }
      } catch (err) {
        console.error('Error fetching policy page:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPolicyPage();
    
    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [pageType]);

  // Render the loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#118347" />
      </View>
    );
  }

  // If there's an error or no data, show the fallback content
  if (error || !page) {
    return (
      <View style={styles.container}>
        <AppHeader 
          title={fallbackTitle}
          showBackButton={true}
        />
        <ScrollView style={styles.content}>
          {fallbackContent}
        </ScrollView>
      </View>
    );
  }

  // Render the actual content from Supabase
  return (
    <View style={styles.container}>
      <AppHeader 
        title={page.title}
        showBackButton={true}
      />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {page.last_updated && (
          <View style={styles.section}>
            <Text style={styles.effectiveDate}>Last Updated: {new Date(page.last_updated).toLocaleDateString()}</Text>
          </View>
        )}
        
        <View style={styles.htmlContainer}>
          <HTML 
            source={{ html: page.content }} 
            contentWidth={width - 32} 
            tagsStyles={{
              p: styles.paragraph,
              h1: styles.heading1,
              h2: styles.heading2,
              h3: styles.heading3,
              ul: styles.list,
              li: styles.listItem,
              a: styles.link
            }}
            renderersProps={{
              a: {
                onPress: (_: any, href: string) => {
                  Linking.openURL(href);
                }
              }
            }}
          />
        </View>
        
        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <Text style={styles.sectionText}>
            If you have any questions or concerns, please contact us at:
          </Text>
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => Linking.openURL('mailto:hello@paygo.fit')}
          >
            <Ionicons name="mail-outline" size={20} color="#118347" />
            <Text style={styles.contactText}>hello@paygo.fit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => Linking.openURL('tel:+916301998133')}
          >
            <Ionicons name="call-outline" size={20} color="#118347" />
            <Text style={styles.contactText}>+91 6301998133</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  htmlContainer: {
    padding: 16,
  },
  effectiveDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#118347',
    marginLeft: 12,
  },
  // HTML styles
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    marginBottom: 16,
  },
  heading1: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginTop: 24,
  },
  heading2: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 14,
    marginTop: 20,
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600',
    color: '#444',
    marginBottom: 12,
    marginTop: 16,
  },
  list: {
    marginBottom: 16,
  },
  listItem: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    marginBottom: 8,
  },
  link: {
    color: '#118347',
    textDecorationLine: 'underline',
  },
}); 