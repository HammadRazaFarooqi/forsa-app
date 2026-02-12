import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState, useEffect } from 'react';
import { Animated, Easing, FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import { useHamburgerMenu } from '../components/HamburgerMenuContext';
import i18n from '../locales/i18n';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export default function PlayerBookingsScreen() {
  const { openMenu } = useHamburgerMenu();
  const [filter, setFilter] = useState<'all' | 'clinic' | 'academy'>('all');
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();

    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      // Try the optimized query (requires index)
      const q = query(
        collection(db, 'bookings'),
        where('playerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const bookingsList: any[] = [];
      querySnapshot.forEach((doc) => {
        bookingsList.push({ id: doc.id, ...doc.data() });
      });

      setBookings(bookingsList);
    } catch (error: any) {
      // Handle the missing index error gracefully
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.warn('Firestore index required for orderBy. Falling back to client-side sorting.');
        try {
          const user = auth.currentUser;
          if (user) {
            // Fallback query without orderBy (no index required)
            const qFallback = query(
              collection(db, 'bookings'),
              where('playerId', '==', user.uid)
            );
            const querySnapshot = await getDocs(qFallback);
            const bookingsList: any[] = [];
            querySnapshot.forEach((doc) => {
              bookingsList.push({ id: doc.id, ...doc.data() });
            });

            // Client-side sort by createdAt descending
            bookingsList.sort((a, b) => {
              const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return timeB - timeA;
            });

            setBookings(bookingsList);
          }
        } catch (fallbackError) {
          console.error("Fallback fetch also failed:", fallbackError);
          Alert.alert(i18n.t('error'), 'Failed to load bookings');
        }
      } else {
        console.error('Error fetching bookings:', error);
        Alert.alert(i18n.t('error'), 'Failed to load bookings');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(b => b.type === filter);

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
              <Text style={styles.headerSubtitle}>{i18n.t('yourReservations') || 'Your reservations'}</Text>
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
              style={[styles.filterButton, filter === 'clinic' && styles.filterButtonActive]}
              onPress={() => setFilter('clinic')}
            >
              <Ionicons name="medical" size={18} color={filter === 'clinic' ? '#fff' : '#666'} />
              <Text style={[styles.filterButtonText, filter === 'clinic' && styles.filterButtonTextActive]}>
                {i18n.t('clinics') || 'Clinics'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'academy' && styles.filterButtonActive]}
              onPress={() => setFilter('academy')}
            >
              <Ionicons name="school" size={18} color={filter === 'academy' ? '#fff' : '#666'} />
              <Text style={[styles.filterButtonText, filter === 'academy' && styles.filterButtonTextActive]}>
                {i18n.t('academies') || 'Academies'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bookings List */}
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
            }
          >
            {loading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.emptyText}>{i18n.t('loading') || 'Loading...'}</Text>
              </View>
            ) : filteredBookings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
                <Text style={styles.emptyText}>{i18n.t('noBookings') || 'No bookings found'}</Text>
                <Text style={styles.emptySubtext}>{i18n.t('bookingsWillAppear') || 'Your bookings will appear here'}</Text>
              </View>
            ) : (
              filteredBookings.map((booking) => (
                <View key={booking.id} style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <View style={styles.bookingTypeContainer}>
                      <Ionicons 
                        name={booking.type === 'clinic' ? 'medical' : 'school'} 
                        size={24} 
                        color="#fff" 
                      />
                      <Text style={styles.bookingType}>
                        {booking.type === 'clinic' ? (i18n.t('clinic') || 'Clinic') : (i18n.t('academy') || 'Academy')}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(booking.status)}</Text>
                    </View>
                  </View>

                  <Text style={styles.bookingName}>{booking.name}</Text>
                  
                  {booking.type === 'clinic' ? (
                    <>
                      {booking.doctor && (
                        <View style={styles.bookingDetail}>
                          <Ionicons name="person" size={16} color="rgba(255,255,255,0.7)" />
                          <Text style={styles.bookingDetailText}>{booking.doctor}</Text>
                        </View>
                      )}
                      {booking.service && (
                        <View style={styles.bookingDetail}>
                          <Ionicons name="medical-outline" size={16} color="rgba(255,255,255,0.7)" />
                          <Text style={styles.bookingDetailText}>{booking.service}</Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      {booking.program && (
                        <View style={styles.bookingDetail}>
                          <Ionicons name="football" size={16} color="rgba(255,255,255,0.7)" />
                          <Text style={styles.bookingDetailText}>{booking.program}</Text>
                        </View>
                      )}
                      {booking.ageGroup && (
                        <View style={styles.bookingDetail}>
                          <Ionicons name="people" size={16} color="rgba(255,255,255,0.7)" />
                          <Text style={styles.bookingDetailText}>{i18n.t('ageGroup') || 'Age Group'}: {booking.ageGroup} {i18n.t('years') || 'years'}</Text>
                        </View>
                      )}
                    </>
                  )}

                  <View style={styles.bookingFooter}>
                    <View style={styles.bookingDateTime}>
                      <Ionicons name="calendar" size={16} color="rgba(255,255,255,0.7)" />
                      <Text style={styles.bookingDateTimeText}>{booking.date || (booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : 'N/A')}</Text>
                    </View>
                    {booking.time && (
                      <View style={styles.bookingDateTime}>
                        <Ionicons name="time" size={16} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.bookingDateTimeText}>{booking.time}</Text>
                      </View>
                    )}
                    <Text style={styles.bookingPrice}>{booking.price || 0} EGP</Text>
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
    paddingTop: 60,
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
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  filterButtonActive: {
    backgroundColor: '#fff',
  },
  filterButtonText: {
    fontSize: 16,
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
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookingType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
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
  bookingName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  bookingDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  bookingDetailText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  bookingDateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bookingDateTimeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  bookingPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});

