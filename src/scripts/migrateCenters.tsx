/**
 * This is a script to migrate centers data from Firebase to Supabase.
 * 
 * To run this script:
 * 1. Add a button in the admin panel or create a temporary screen
 * 2. Call migrateCentersToSupabase() when the button is pressed
 * 3. Monitor the console for migration progress
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { migrateCentersToSupabase } from '../services/supabase/centerService';

interface MigrateCentersProps {
  navigation: any;
}

export function MigrateCenters({ navigation }: MigrateCentersProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<{
    success: number;
    errors: number;
    imagesMigrated: number;
  } | null>(null);
  
  const handleMigrate = async () => {
    try {
      setIsLoading(true);
      setResult(null);
      setError(null);
      setStats(null);
      
      console.log('Starting centers migration...');
      const migrationResult = await migrateCentersToSupabase();
      
      setResult('Migration completed successfully!');
      setStats(migrationResult);
    } catch (err) {
      console.error('Migration failed:', err);
      setError(`Migration failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Centers Migration Tool</Text>
        
        <Text style={styles.description}>
          This tool will migrate all centers data from Firebase to Supabase.
          The process may take several minutes depending on the amount of data.
        </Text>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#118347" />
            <Text style={styles.loadingText}>Migrating centers data...</Text>
            <Text style={styles.loadingSubtext}>This may take several minutes</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleMigrate}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Start Migration</Text>
          </TouchableOpacity>
        )}
        
        {result && (
          <View style={styles.resultContainer}>
            <Text style={styles.successText}>{result}</Text>
            {stats && (
              <View style={styles.statsContainer}>
                <Text style={styles.statsText}>Centers successfully migrated: {stats.success}</Text>
                <Text style={styles.statsText}>Images successfully migrated: {stats.imagesMigrated}</Text>
                {stats.errors > 0 && (
                  <Text style={styles.statsErrorText}>Centers with errors: {stats.errors}</Text>
                )}
              </View>
            )}
          </View>
        )}
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={isLoading}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#118347',
  },
  description: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  button: {
    backgroundColor: '#118347',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 30,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '600',
    color: '#118347',
  },
  loadingSubtext: {
    marginTop: 5,
    fontSize: 14,
    color: '#666',
  },
  resultContainer: {
    backgroundColor: '#e6f7ef',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#118347',
    marginBottom: 20,
    width: '100%',
  },
  successText: {
    color: '#118347',
    fontSize: 16,
    marginBottom: 10,
  },
  statsContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#cce8db',
  },
  statsText: {
    color: '#118347',
    fontSize: 14,
    marginBottom: 5,
  },
  statsErrorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 5,
  },
  errorContainer: {
    backgroundColor: '#ffeded',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d32f2f',
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
  },
  backButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 25,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  backButtonText: {
    color: '#333',
    fontSize: 16,
  }
}); 