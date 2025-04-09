import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type TimeTab = 'morning' | 'afternoon' | 'evening';

export interface BookingTimeTabsProps {
  activeTab: TimeTab;
  onTabChange: (tab: TimeTab) => void;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export function filterTimeSlotsByTab(
  slots: TimeSlot[], 
  activeTab: TimeTab
): TimeSlot[] {
  return slots.filter(slot => {
    const hour = parseInt(slot.time.split(':')[0]);
    const isPM = slot.time.includes('PM');
    const time24h = isPM && hour !== 12 
      ? hour + 12 
      : (!isPM && hour === 12 ? 0 : hour);
    
    // Morning includes both early morning (0-6) and regular morning (6-12)
    if (activeTab === 'morning') return (time24h >= 0 && time24h < 6) || (time24h >= 6 && time24h < 12);
    if (activeTab === 'afternoon') return time24h >= 12 && time24h < 17;
    return time24h >= 17 && time24h < 24; // evening includes everything from 17-24
  });
}

export default function BookingTimeTabs({ activeTab, onTabChange }: BookingTimeTabsProps) {
  return (
    <View style={styles.timeTabsContainer}>
      <TouchableOpacity 
        style={[
          styles.timeTab,
          activeTab === 'morning' && styles.timeTabActive
        ]}
        onPress={() => onTabChange('morning')}
      >
        <Ionicons 
          name="sunny-outline" 
          size={18} 
          color={activeTab === 'morning' ? '#118347' : '#666'} 
          style={styles.timeTabIcon}
        />
        <Text 
          style={[
            styles.timeTabText, 
            activeTab === 'morning' && styles.timeTabTextActive
          ]}
        >
          Morning
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.timeTab,
          activeTab === 'afternoon' && styles.timeTabActive
        ]}
        onPress={() => onTabChange('afternoon')}
      >
        <Ionicons 
          name="partly-sunny-outline" 
          size={18} 
          color={activeTab === 'afternoon' ? '#118347' : '#666'} 
          style={styles.timeTabIcon}
        />
        <Text 
          style={[
            styles.timeTabText, 
            activeTab === 'afternoon' && styles.timeTabTextActive
          ]}
        >
          Afternoon
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.timeTab,
          activeTab === 'evening' && styles.timeTabActive
        ]}
        onPress={() => onTabChange('evening')}
      >
        <Ionicons 
          name="moon-outline" 
          size={18} 
          color={activeTab === 'evening' ? '#118347' : '#666'} 
          style={styles.timeTabIcon}
        />
        <Text 
          style={[
            styles.timeTabText, 
            activeTab === 'evening' && styles.timeTabTextActive
          ]}
        >
          Evening
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  timeTabsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 4,
  },
  timeTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  timeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeTabIcon: {
    marginRight: 5,
  },
  timeTabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  timeTabTextActive: {
    color: '#118347',
    fontWeight: '600',
  },
}); 