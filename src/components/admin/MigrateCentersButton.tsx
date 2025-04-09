import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { migrateCentersToSupabase } from '../../services/supabase/centerService';
import { supabase } from '../../config/supabaseConfig';

interface MigrateCentersButtonProps {
  onComplete?: (success: boolean) => void;
}

export const MigrateCentersButton: React.FC<MigrateCentersButtonProps> = ({ onComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    success: number;
    errors: number;
    imagesMigrated: number;
  } | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const handleMigrate = async () => {
    try {
      setIsLoading(true);
      setResult(null);
      setError(null);
      setStats(null);
      setDebugInfo(null);

      console.log('Starting centers migration...');
      const migrationResult = await migrateCentersToSupabase();
      
      const successMessage = 'Migration completed successfully!';
      setResult(successMessage);
      setStats(migrationResult);
      
      // Fetch debug info
      try {
        const { data: tableInfo, error: tableError } = await supabase
          .from('centers')
          .select('id')
          .limit(5);
        
        if (tableError) {
          setDebugInfo(`Error checking table: ${tableError.message}`);
        } else {
          const { count, error: countError } = await supabase
            .from('centers')
            .select('*', { count: 'exact', head: true });
          
          setDebugInfo(`Table status: ${count || 0} total rows. ${
            tableInfo?.length || 0} sample rows available. ${
            countError ? `Error counting: ${countError.message}` : ''
          }`);
        }
      } catch (debugError) {
        setDebugInfo(`Error getting debug info: ${debugError}`);
      }
      
      onComplete?.(true);
    } catch (err) {
      console.error('Migration failed:', err);
      const errorMessage = `Migration failed: ${err instanceof Error ? err.message : String(err)}`;
      setError(errorMessage);
      onComplete?.(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Centers Migration</Text>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#118347" />
          <Text style={styles.loadingText}>Migrating centers data...</Text>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleMigrate}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Migrate Centers to Supabase</Text>
        </TouchableOpacity>
      )}
      
      {result && (
        <ScrollView style={styles.resultScrollView}>
          <View style={styles.resultContainer}>
            <Text style={styles.successText}>{result}</Text>
            {stats && (
              <View style={styles.statsContainer}>
                <Text style={styles.statsText}>Centers migrated: {stats.success}</Text>
                <Text style={styles.statsText}>Images migrated: {stats.imagesMigrated}</Text>
                {stats.errors > 0 && (
                  <Text style={styles.statsErrorText}>Errors: {stats.errors}</Text>
                )}
              </View>
            )}
            
            {debugInfo && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Debug Information:</Text>
                <Text style={styles.debugText}>{debugInfo}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#118347',
  },
  button: {
    backgroundColor: '#118347',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#118347',
  },
  resultScrollView: {
    maxHeight: 300,
  },
  resultContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#e6f7ef',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#118347',
  },
  successText: {
    color: '#118347',
    fontSize: 14,
    marginBottom: 5,
  },
  statsContainer: {
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#cce8db',
  },
  statsText: {
    color: '#118347',
    fontSize: 12,
    marginVertical: 2,
  },
  statsErrorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginVertical: 2,
  },
  debugContainer: {
    marginTop: 10,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#cce8db',
  },
  debugTitle: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 3,
  },
  debugText: {
    color: '#424242',
    fontSize: 11,
    marginVertical: 2,
  },
  errorContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#ffeded',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d32f2f',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  }
}); 