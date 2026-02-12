import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Animated, Easing, FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import { useHamburgerMenu } from '../components/HamburgerMenuContext';
import i18n from '../locales/i18n';

// Mock bookings data (UI only - replace with actual data from Firestore)
const mockBookings = [
  {
    id: '1',
    playerName: 'Ahmed Hassan',
    playerAge: 15,
    program: 'Football Training',
    date: '2024-01-15',
    time: '4:00 PM',
    status: 'confirmed',
    price: 500,
  },
  {
    id: '2',
    playerName: 'Mohamed Ali',
    playerAge: 12,
    program: 'Basketball Training',
    date: '2024-01-20',
    time: '5:00 PM',
    status: 'pending',
    price: 400,
  },
  {
    id: '3',
    playerName: 'Omar Ibrahim',
    playerAge: 14,
    program: 'Football Training',
    date: '2024-01-18',
    time: '3:00 PM',
    status: 'confirmed',
    price: 500,
  },
  {
    id: '4',
    playerName: 'Youssef Mahmoud',
    playerAge: 13,
    program: 'Football Training',
    date: '2024-01-22',
    time: '4:30 PM',
    status: 'cancelled',
    price: 500,
  },
];

export default function AcademyBookingsScreen() {
  const { openMenu } = useHamburgerMenu();
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, []);

  const filteredBookings = filter === 'all' 
    ? mockBookings 
    : mockBookings.filter(b => b.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return i18n.t('confirmed') || 'Confirmed';
      case 'pending':
        return i18n.t('pending') || 'Pending';
      case 'cancelled':
        return i18n.t('cancelled') || 'Cancelled';
      default:
        return status;
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient
        colors={['#000000', '#1a1a1a', '#2d2d2d']}
        style={styles.gradient}
      >
        <HamburgerMenu />
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.menuButton} onPress={openMenu}>
              <Ionicons name="menu" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>{i18n.t('myBookings') || 'My Bookings'}</Text>
              <Text style={styles.headerSubtitle}>{i18n.t('manageReservations') || 'Manage player reservations'}</Text>
            </View>
          </View>

          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
                {i18n.t('all') || 'All'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'confirmed' && styles.filterButtonActive]}
              onPress={() => setFilter('confirmed')}
            >
              <Ionicons name="checkmark-circle" size={18} color={filter === 'confirmed' ? '#fff' : '#666'} />
              <Text style={[styles.filterButtonText, filter === 'confirmed' && styles.filterButtonTextActive]}>
                {i18n.t('confirmed') || 'Confirmed'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
              onPress={() => setFilter('pending')}
            >
              <Ionicons name="time" size={18} color={filter === 'pending' ? '#fff' : '#666'} />
              <Text style={[styles.filterButtonText, filter === 'pending' && styles.filterButtonTextActive]}>
                {i18n.t('pending') || 'Pending'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'cancelled' && styles.filterButtonActive]}
              onPress={() => setFilter('cancelled')}
            >
              <Ionicons name="close-circle" size={18} color={filter === 'cancelled' ? '#fff' : '#666'} />
              <Text style={[styles.filterButtonText, filter === 'cancelled' && styles.filterButtonTextActive]}>
                {i18n.t('cancelled') || 'Cancelled'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bookings List */}
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredBookings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
                <Text style={styles.emptyText}>{i18n.t('noBookings') || 'No bookings found'}</Text>
                <Text style={styles.emptySubtext}>{i18n.t('bookingsWillAppear') || 'Player bookings will appear here'}</Text>
              </View>
            ) : (
              filteredBookings.map((booking) => (
                <View key={booking.id} style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <View style={styles.playerInfoContainer}>
                      <Ionicons name="person-circle" size={32} color="#fff" />
                      <View style={styles.playerDetails}>
                        <Text style={styles.playerName}>{booking.playerName}</Text>
                        <Text style={styles.playerAge}>{i18n.t('age') || 'Age'}: {booking.playerAge}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(booking.status)}</Text>
                    </View>
                  </View>

                  <View style={styles.bookingDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="football" size={18} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.detailText}>{booking.program}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={18} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.detailText}>{booking.date}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="time" size={18} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.detailText}>{booking.time}</Text>
                    </View>
                  </View>

                  <View style={styles.bookingFooter}>
                    <Text style={styles.priceLabel}>{i18n.t('total') || 'Total'}</Text>
                    <Text style={styles.priceValue}>{booking.price} EGP</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </Animated.View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginLeft: -44,
    paddingHorizontal: 44,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    flex: 1,
    minWidth: '22%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#fff',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#000',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingBottom: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  bookingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  playerInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  playerAge: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  bookingDetails: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  priceLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
});

