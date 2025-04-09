import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SectionList,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { format, isSameDay, parseISO } from 'date-fns';

// Wallet service and context
import { useWallet } from '../../services/walletContext';
import { useAuth } from '../../services/authContext';
import { TransactionType, WalletTransaction } from '../../services/supabase/userService';
import { getWalletTransactions } from '../../services/walletService';

const TRANSACTIONS_PER_PAGE = 20;

// Filters for transaction types
type FilterType = 'all' | TransactionType;

// Define the section type for the SectionList
interface TransactionSection {
  title: string;
  data: WalletTransaction[];
}

export default function WalletTransactionsScreen() {
  const navigation = useNavigation();
  const { walletBalance } = useWallet();
  const { user: contextUser } = useAuth();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [error, setError] = useState<string | null>(null);

  // Load transactions
  const loadTransactions = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsLoading(true);
      setPage(1);
      setError(null);
    } else if (loadingMore) {
      return; // Prevent multiple simultaneous loadMore calls
    } else if (!hasMoreTransactions && !refresh) {
      return; // Don't load more if we know there are no more transactions
    }

    if (loadingMore && !refresh) {
      setLoadingMore(true);
    }

    try {
      // Get user ID from context as the primary source
      const userId = contextUser?.id;
      
      if (!userId) {
        console.log('[TRANSACTIONS] No user ID available, cannot fetch transactions');
        setError('Please log in again to view your transactions.');
        setIsLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        return;
      }
      
      console.log(`[TRANSACTIONS] Fetching transactions for user: ${userId}, page: ${page}`);
      
      const limit = TRANSACTIONS_PER_PAGE * (refresh ? 1 : page);
      const transactionList = await getWalletTransactions(userId, limit);
      
      if (!transactionList || !Array.isArray(transactionList)) {
        throw new Error('Invalid transaction data received');
      }
      
      console.log(`[TRANSACTIONS] Received ${transactionList.length} transactions`);
      
      // If we received fewer transactions than requested, there are no more
      if (transactionList.length < limit) {
        setHasMoreTransactions(false);
      }
      
      // Sort transactions by created_at in descending order
      const sortedTransactions = transactionList.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date();
        const dateB = b.created_at ? new Date(b.created_at) : new Date();
        return dateB.getTime() - dateA.getTime();
      });
      
      setTransactions(sortedTransactions);
      
      if (!refresh && !isLoading) {
        setPage(prevPage => prevPage + 1);
      }
    } catch (error) {
      console.error('[TRANSACTIONS] Error loading transactions:', error);
      setError('Unable to load transactions. Please try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [contextUser, page, loadingMore, hasMoreTransactions]);

  // Initial load
  useEffect(() => {
    loadTransactions(true);
  }, [loadTransactions]);

  // Handle pull to refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadTransactions(true);
  };

  // Handle load more
  const handleLoadMore = () => {
    if (!isLoading && !loadingMore && hasMoreTransactions) {
      loadTransactions();
    }
  };

  // Filter transactions
  const getFilteredTransactions = () => {
    if (activeFilter === 'all') {
      return transactions;
    }
    return transactions.filter(transaction => transaction.type === activeFilter);
  };

  // Group transactions by date
  const groupTransactionsByDate = () => {
    const filteredTransactions = getFilteredTransactions();
    const groups: Record<string, TransactionSection> = {};
    
    filteredTransactions.forEach(transaction => {
      if (!transaction.created_at) return;
      
      let date;
      try {
        date = new Date(transaction.created_at);
      } catch (e) {
        console.error('Error parsing date:', e);
        return;
      }
      
      const dateStr = format(date, 'yyyy-MM-dd');
      if (!groups[dateStr]) {
        groups[dateStr] = {
          title: formatDate(date, true),
          data: []
        };
      }
      
      groups[dateStr].data.push(transaction);
    });
    
    return Object.values(groups) as TransactionSection[];
  };

  // Get transaction icon
  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case TransactionType.DEPOSIT:
        return <Ionicons name="add-circle" size={24} color="#118347" />;
      case TransactionType.BOOKING:
        return <Ionicons name="calendar" size={24} color="#CC3300" />;
      case TransactionType.REFUND:
        return <Ionicons name="refresh-circle" size={24} color="#0066CC" />;
      default:
        return <Ionicons name="ellipsis-horizontal-circle" size={24} color="#666" />;
    }
  };

  // Format transaction date
  const formatDate = (date: Date, headerFormat = false) => {
    if (!date) return 'N/A';
    
    try {
      const now = new Date();
      
      if (headerFormat) {
        if (isSameDay(date, now)) {
          return 'Today';
        } else if (isSameDay(date, new Date(now.setDate(now.getDate() - 1)))) {
          return 'Yesterday';
        } else {
          return format(date, 'EEEE, MMMM d, yyyy');
        }
      }
      
      return format(date, 'h:mm a');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Get transaction amount display properties
  const getAmountDetails = (transaction: WalletTransaction) => {
    const isPositive = transaction.type === TransactionType.DEPOSIT || 
                        transaction.type === TransactionType.REFUND;
    
    return {
      prefix: isPositive ? '+ ' : '- ',
      color: isPositive ? '#118347' : '#CC3300',
      amount: Math.abs(transaction.amount).toLocaleString()
    };
  };

  // Get user-friendly label for transaction type
  const getTypeLabel = (type: FilterType): string => {
    switch(type) {
      case TransactionType.DEPOSIT:
        return 'Added';
      case TransactionType.BOOKING:
        return 'Booking';
      case TransactionType.REFUND:
        return 'Refund';
      default:
        return 'All';
    }
  };

  // Render filter buttons
  const renderFilterButtons = () => {
    const filters: { id: FilterType; label: string }[] = [
      { id: 'all', label: 'All' },
      { id: TransactionType.DEPOSIT, label: 'Added' },
      { id: TransactionType.BOOKING, label: 'Booking' },
      { id: TransactionType.REFUND, label: 'Refund' }
    ];
    
    return (
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScrollContent}
        >
          {filters.map(filter => (
            <TouchableOpacity
              key={filter.id}
              style={[
                styles.filterButton,
                activeFilter === filter.id && styles.activeFilterButton
              ]}
              onPress={() => setActiveFilter(filter.id)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter.id && styles.activeFilterText
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render a transaction item
  const renderTransaction = ({ item }: { item: WalletTransaction }) => {
    // Format the timestamp
    let formattedTime = 'Time unavailable';
    try {
      const date = item.created_at ? new Date(item.created_at) : new Date();
      formattedTime = format(date, 'h:mm a');
    } catch (e) {
      console.error('Error formatting time:', e);
    }

    return (
      <View style={styles.transactionItem}>
        <View style={styles.iconContainer}>
          {getTransactionIcon(item.type)}
        </View>
        
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionDescription}>{item.description}</Text>
          <Text style={styles.transactionTime}>{formattedTime}</Text>
        </View>
        
        <View>
          <Text style={[
            styles.transactionAmount,
            item.type === TransactionType.DEPOSIT || item.type === TransactionType.REFUND ? 
              styles.creditAmount : 
              styles.debitAmount
          ]}>
            {item.type === TransactionType.DEPOSIT || item.type === TransactionType.REFUND ? 
              `+₹${item.amount}` : 
              `-₹${item.amount}`}
          </Text>
        </View>
      </View>
    );
  };

  // Render section header
  const renderSectionHeader = ({ section }: { section: TransactionSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  // Render error state
  const renderError = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="alert-circle-outline" size={64} color="#FF5757" />
      <Text style={styles.emptyTitle}>Unable to Load Transactions</Text>
      <Text style={styles.emptyMessage}>
        {error || "We couldn't load your transaction history at this moment. This could be due to a temporary server issue."}
      </Text>
      <View style={styles.errorActionContainer}>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => loadTransactions(true)}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.contactSupportButton}
          onPress={() => {
            Alert.alert(
              'Contact Support',
              'If this problem persists, please contact our support team for assistance.',
              [{ text: 'OK' }]
            );
          }}
        >
          <Text style={styles.contactSupportText}>Contact Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render content based on loading state
  const renderContent = () => {
    if (isLoading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#118347" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      );
    }
    
    if (error) {
      return renderError();
    }
    
    const sections = groupTransactionsByDate();
    
    if (sections.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="wallet-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Transactions</Text>
          <Text style={styles.emptyMessage}>
            {activeFilter === 'all' 
              ? "Your transaction history will appear here once you've made wallet transactions."
              : `You don't have any ${getTypeLabel(activeFilter).toLowerCase()} transactions yet.`
            }
          </Text>
        </View>
      );
    }
    
    return (
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item.id || index.toString()}
        renderItem={renderTransaction}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#118347']}
            tintColor="#118347"
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color="#118347" />
              <Text style={styles.footerLoadingText}>Loading more...</Text>
            </View>
          ) : null
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Transaction History</Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </View>
      
      <View style={styles.balanceCard}>
        <View style={styles.balanceContent}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>₹{walletBalance}</Text>
        </View>
      </View>
      
      {renderFilterButtons()}
      
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerSafeArea: {
    backgroundColor: '#fff',
  },
  headerContent: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  balanceCard: {
    margin: 16,
    backgroundColor: '#118347',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceContent: {
    padding: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filtersScrollContent: {
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  activeFilterButton: {
    backgroundColor: '#118347',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    backgroundColor: '#f8f8f8',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  transactionItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  transactionTime: {
    fontSize: 12,
    color: '#999',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  creditAmount: {
    color: '#118347',
  },
  debitAmount: {
    color: '#CC3300',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  footerLoading: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  footerLoadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  errorActionContainer: {
    flexDirection: 'row',
    marginTop: 24,
    justifyContent: 'center',
  },
  retryButton: {
    marginHorizontal: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#118347',
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  contactSupportButton: {
    marginHorizontal: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
  },
  contactSupportText: {
    color: '#666',
    fontWeight: '500',
  },
}); 