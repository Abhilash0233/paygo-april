import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Modal,
  Animated,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabaseConfig';
import { format } from 'date-fns';
import { useAuth } from '../services/authContext';

// Admin phone number
const ADMIN_PHONE_NUMBER = '+916301998133';

interface NotificationItem {
  id: string;
  type: 'new_user' | 'new_booking';
  created_at: Date;
  user_name?: string;
  user_phone?: string;
  booking_details?: {
    center_name: string;
    date: string;
    time_slot: string;
    session_type: string;
  };
  is_read: boolean;
}

interface AdminNotificationOverlayProps {
  isVisible: boolean;
  onClose: () => void;
}

const AdminNotificationOverlay: React.FC<AdminNotificationOverlayProps> = ({
  isVisible,
  onClose
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  // Check if current user is admin
  useEffect(() => {
    const checkIfAdmin = async () => {
      if (user && user.phone_number === ADMIN_PHONE_NUMBER) {
        setIsAdmin(true);
        fetchNotifications();
        
        // Set up real-time listener for new notifications
        setupNotificationListener();
      } else {
        setIsAdmin(false);
      }
    };

    if (isVisible) {
      checkIfAdmin();
      
      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }

    return () => {
      // Clean up listener
    };
  }, [isVisible]);

  const setupNotificationListener = () => {
    // Since Supabase doesn't have real-time listeners for queries in the same way,
    // we'll use polling for now
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000); // Poll every 10 seconds
    
    return () => clearInterval(interval);
  };

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      if (data) {
        const notificationData: NotificationItem[] = data.map(item => ({
          id: item.id,
          type: item.type,
          created_at: new Date(item.created_at),
          user_name: item.user_name,
          user_phone: item.user_phone,
          booking_details: item.booking_details,
          is_read: item.is_read || false
        }));
        
        setNotifications(notificationData);
      }
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchNotifications();
  };

  const formatDate = (date: Date) => {
    return format(date, 'MMM dd, yyyy • h:mm a');
  };

  const renderNotificationItem = ({ item }: { item: NotificationItem }) => {
    return (
      <View style={[styles.notificationItem, item.is_read ? styles.readNotification : styles.unreadNotification]}>
        <View style={styles.iconContainer}>
          {item.type === 'new_user' ? (
            <Ionicons name="person-add" size={24} color="#118347" />
          ) : (
            <Ionicons name="calendar" size={24} color="#118347" />
          )}
        </View>
        
        <View style={styles.contentContainer}>
          <Text style={styles.notificationTitle}>
            {item.type === 'new_user' 
              ? `New User Registration: ${item.user_name}` 
              : `New Booking: ${item.booking_details?.center_name}`}
          </Text>
          
          {item.type === 'new_user' ? (
            <Text style={styles.notificationDetail}>Phone: {item.user_phone}</Text>
          ) : (
            <>
              <Text style={styles.notificationDetail}>
                Date: {item.booking_details?.date} • {item.booking_details?.time_slot}
              </Text>
              <Text style={styles.notificationDetail}>
                Session: {item.booking_details?.session_type}
              </Text>
            </>
          )}
          
          <Text style={styles.notificationTime}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
    );
  };

  if (!isVisible || !isAdmin) return null;

  return (
    <Modal
      visible={isVisible && isAdmin}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <Animated.View 
          style={[
            styles.overlay,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Admin Notifications</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {isLoading && !isRefreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#118347" />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              renderItem={renderNotificationItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  colors={['#118347']}
                  tintColor="#118347"
                />
              }
            />
          )}
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlay: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: '#f0f7f3',
    borderLeftWidth: 4,
    borderLeftColor: '#118347',
  },
  readNotification: {
    backgroundColor: '#fff',
  },
  iconContainer: {
    marginRight: 16,
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: '#e6f7ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  notificationDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});

export default AdminNotificationOverlay; 