import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Alert, ActivityIndicator, Modal } from 'react-native';
import i18n from '../locales/i18n';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { notifyProviderAndAdmins, createNotification } from '../services/NotificationService';
import { Ionicons } from '@expo/vector-icons';

export default function ClinicDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [doctorModalVisible, setDoctorModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  let clinic = null;
  try {
    clinic = params.clinic ? JSON.parse(params.clinic as string) : null;

    // 👇 Parse working_hours if it's a string
    if (clinic?.working_hours && typeof clinic.working_hours === 'string') {
      try {
        clinic.working_hours = JSON.parse(clinic.working_hours);
      } catch (err) {
        console.error('⚠️ Cannot parse working_hours:', err);
      }
    }
  } catch (err) {
    clinic = null;
  }

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const storedFavorites = await AsyncStorage.getItem('clinicFavorites');
        if (storedFavorites) {
          setFavorites(JSON.parse(storedFavorites));
        }
      } catch (e) {
        console.error("Failed to load favorites", e);
      }
    };
    loadFavorites();
  }, []);

  const toggleFavorite = async (clinicId: string) => {
    if (!clinicId) return;
    const newFavorites = favorites.includes(clinicId)
      ? favorites.filter((id) => id !== clinicId)
      : [...favorites, clinicId];
    setFavorites(newFavorites);
    await AsyncStorage.setItem('clinicFavorites', JSON.stringify(newFavorites));
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.5, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const handleReserve = async (doctorName?: string, serviceName?: string) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert(i18n.t('error') || 'Error', i18n.t('loginRequired') || 'You must be logged in to book');
      return;
    }

    // If no doctor selected and there are doctors, show modal
    if (!doctorName && doctors.length > 0) {
      setDoctorModalVisible(true);
      return;
    }

    // If no doctors available, still allow booking
    const selectedDoctor = doctorName || (doctors.length > 0 ? doctors[0].name : 'General Consultation');
    const selectedServiceName = serviceName || (services.length > 0 ? services[0].name : 'General Service');
    const servicePrice = serviceName
      ? (clinic[`${serviceName}_fee`] || 0)
      : (services.length > 0 ? services[0].fee : 0);

    try {
      setBookingLoading(true);

      // Fetch user name from Firestore
      let playerName = user.displayName || 'Player';
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          playerName = userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || playerName;
        }
      } catch (err) {
        console.log('Error fetching user name, using default');
      }

      // Fetch clinic details from Firestore if available
      let clinicName = clinic.clinic_name || clinic.name || 'Clinic';
      let clinicCity = clinic.city || '';
      let clinicId = clinic.id || '';

      try {
        if (clinicId) {
          const clinicDoc = await getDoc(doc(db, 'clinics', clinicId));
          if (clinicDoc.exists()) {
            const clinicData = clinicDoc.data();
            clinicName = clinicData.clinicName || clinicData.name || clinicName;
            clinicCity = clinicData.city || clinicCity;
          }
        }
      } catch (err) {
        console.log('Using parsed clinic data');
      }

      const bookingData = {
        playerId: user.uid,
        parentId: user.uid, // Add parentId for consistency with parent-bookings.tsx
        playerName: playerName,
        customerName: playerName, // Standardized field for admin
        providerId: clinicId || clinic.id || '',
        providerName: clinicName,
        type: 'clinic',
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        name: clinicName,
        city: clinicCity,
        doctor: selectedDoctor,
        service: selectedServiceName,
        price: Number(servicePrice) || 0,
      };

      const bookingRef = await addDoc(collection(db, 'bookings'), bookingData);
      const providerId = clinicId || clinic.id || '';
      try {
        await notifyProviderAndAdmins(
          providerId,
          i18n.t('newBookingRequest') || 'New booking request',
          `${playerName} ${i18n.t('requestedBooking') || 'requested a booking'}: ${selectedServiceName}`,
          'booking',
          { bookingId: bookingRef.id },
          user.uid
        );
        await createNotification({
          userId: user.uid,
          title: i18n.t('bookingRequestSent') || 'Booking request sent',
          body: `${clinicName} – ${selectedDoctor}, ${selectedServiceName}`,
          type: 'booking',
          data: { bookingId: bookingRef.id },
        });
      } catch (e) {
        console.warn('Notification create failed:', e);
      }

      Alert.alert(
        i18n.t('reservation') || 'Reservation',
        `${i18n.t('reservationSuccess') || 'Reservation request sent!'}\n${i18n.t('doctor') || 'Doctor'}: ${selectedDoctor}\n${i18n.t('service') || 'Service'}: ${selectedServiceName}`,
        [{ text: i18n.t('ok') || 'OK', onPress: () => router.push('/player-bookings') }]
      );
      setDoctorModalVisible(false);
    } catch (error) {
      console.error('Error creating clinic booking:', error);
      Alert.alert(i18n.t('error') || 'Error', i18n.t('bookingFailed') || 'Failed to create booking');
    } finally {
      setBookingLoading(false);
    }
  };
  if (!clinic) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{i18n.t('noDetails') || 'No details available'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{i18n.t('close') || 'Close'}</Text>
        </TouchableOpacity>
      </View>
    );
  }
  // Extract all *_fee keys for services
  const services = Object.keys(clinic)
    .filter((key) => key.endsWith('_fee') && clinic[key])
    .map((key) => ({
      name: key.replace('_fee', ''),
      fee: clinic[key],
    }));

  // Use working_hours for timings (string or JSON)
  const timings = clinic.working_hours;
  // Fallback demo doctors if not present
  // Accepts both new and old doctor formats
  const doctors = (clinic.doctors || [
    { name: 'Dr. Ahmed Ali', specialty: 'Physiotherapist' },
    { name: 'Dr. Mona Hassan', specialty: 'Nutritionist' },
  ]).map((doc: any) => ({
    name: doc.name,
    major: doc.major || doc.specialty || '',
    description: doc.description || '',
    photoUri: doc.photoUri || doc.photo || '',
  }));

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
        <View style={styles.headerBox}>
          {clinic.profile_photo ? (
            <Image source={{ uri: clinic.profile_photo }} style={styles.profilePhoto} />
          ) : (
            <Image source={require('../assets/logo.png')} style={styles.logo} />
          )}
          <Text style={styles.title}>{clinic.clinic_name || clinic.name}</Text>
          <TouchableOpacity
            style={styles.favoriteBtn}
            onPress={() => toggleFavorite(clinic.id)}
          >
            <Animated.Text style={{ fontSize: 32, color: favorites.includes(clinic.id) ? '#ffd700' : '#aaa', transform: [{ scale: scaleAnim }] }}>
              ★
            </Animated.Text>
          </TouchableOpacity>
          <Text style={styles.city}>{clinic.city}</Text>
        </View>
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>{i18n.t('address') || 'Address'}</Text>
          <Text style={styles.sectionText}>{clinic.address}</Text>
        </View>
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>{i18n.t('description') || 'Description'}</Text>
          <Text style={styles.sectionText}>{clinic.description}</Text>
        </View>
        {/* Working Hours Table */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>{i18n.t('workingHours') || 'Working Hours'}</Text>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee', marginBottom: 6 }}>
            <Text style={[styles.feeType, { flex: 1, fontWeight: 'bold' }]}>Day</Text>
            <Text style={[styles.feeValue, { flex: 1, fontWeight: 'bold' }]}>Hours</Text>
          </View>
          {timings && typeof timings === 'object' ? (
            Object.entries(timings).map(([day, value]) => {
              if (
                value &&
                typeof value === 'object'
              ) {
                const from = (value as any).from || '';
                const to = (value as any).to || '';
                const isOff = (value as any).off;

                return (
                  <View key={day} style={styles.feeRow}>
                    <Text style={[styles.feeType, { flex: 1 }]}>
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </Text>
                    <Text style={[styles.feeValue, { flex: 1 }]}>
                      {isOff || (!from && !to) ? 'Closed' : `${from} – ${to}`}
                    </Text>
                  </View>
                );
              }
              return null;
            })
          ) : (
            <Text style={styles.sectionText}>{i18n.t('noTimings') || 'No timings available.'}</Text>
          )}


        </View>
        {/* Doctors */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>{i18n.t('doctors') || 'Doctors'}</Text>
          {doctors.map((doc: any, idx: number) => (
            <TouchableOpacity
              key={idx}
              style={styles.doctorCard}
              onPress={() => handleReserve(doc.name)}
              activeOpacity={0.7}
            >
              {doc.photoUri ? (
                <Image source={{ uri: doc.photoUri }} style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }} />
              ) : (
                <View style={styles.doctorIconPlaceholder}>
                  <Ionicons name="person" size={24} color="#666" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{doc.name}</Text>
                {doc.major ? <Text style={{ color: '#555' }}>{doc.major}</Text> : null}
                {doc.description ? <Text style={{ fontSize: 14, color: '#777' }}>{doc.description}</Text> : null}
              </View>
              <Ionicons name="calendar-outline" size={20} color="#000" />
            </TouchableOpacity>
          ))}
          {doctors.length === 0 && <Text style={styles.sectionText}>{i18n.t('noDoctors') || 'No doctors available.'}</Text>}
        </View>
        {/* Service Fees Table */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>{i18n.t('serviceFees') || 'Service Fees'}</Text>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee', marginBottom: 6 }}>
            <Text style={[styles.feeType, { flex: 1, fontWeight: 'bold' }]}>Service</Text>
            <Text style={[styles.feeValue, { flex: 1, fontWeight: 'bold' }]}>Fee</Text>
          </View>
          {services.length > 0 ? services.map((s, idx) => (
            <View key={idx} style={styles.feeRow}>
              <Text style={[styles.feeType, { flex: 1 }]}>{i18n.t(s.name) !== s.name ? i18n.t(s.name) : s.name}</Text>
              <Text style={[styles.feeValue, { flex: 1 }]}>{String(s.fee)} EGP</Text>
            </View>
          )) : <Text style={styles.sectionText}>{i18n.t('noServices') || 'No services listed.'}</Text>}
        </View>
        {/* Contact */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>{i18n.t('contact') || 'Contact'}</Text>
          <Text style={styles.sectionText}>{clinic.phone}</Text>
        </View>

        <TouchableOpacity
          style={[styles.reserveBtn, bookingLoading && styles.reserveBtnDisabled]}
          onPress={() => handleReserve()}
          disabled={bookingLoading}
        >
          {bookingLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.reserveBtnText}>{i18n.t('reserve') || 'Reserve'}</Text>
          )}
        </TouchableOpacity>

        {/* Doctor Selection Modal */}
        <Modal
          visible={doctorModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setDoctorModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setDoctorModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{i18n.t('selectDoctor') || 'Select Doctor'}</Text>
                <TouchableOpacity onPress={() => setDoctorModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScrollView}>
                {doctors.map((doc: any, idx: number) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.modalDoctorOption}
                    onPress={() => {
                      handleReserve(doc.name);
                    }}
                  >
                    <View style={styles.modalDoctorInfo}>
                      {doc.photoUri ? (
                        <Image source={{ uri: doc.photoUri }} style={styles.modalDoctorPhoto} />
                      ) : (
                        <View style={styles.modalDoctorIconPlaceholder}>
                          <Ionicons name="person" size={24} color="#666" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalDoctorName}>{doc.name}</Text>
                        {doc.major && <Text style={styles.modalDoctorMajor}>{doc.major}</Text>}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{i18n.t('close') || 'Close'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({

  container: { flex: 1, backgroundColor: '#f8f8f8', padding: 0 },
  headerBox: {
    alignItems: 'center',
    backgroundColor: '#000',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingTop: 48,
    paddingBottom: 32,
    marginBottom: 18,
  },
  logo: {
    width: 64,
    height: 64,
    resizeMode: 'contain',
    marginBottom: 10,
    tintColor: '#fff',
    opacity: 0.7,
  },
  profilePhoto: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#eee',
    resizeMode: 'cover',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 48,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  city: {
    color: '#eee',
    fontSize: 17,
    marginBottom: 0,
    textAlign: 'center',
  },
  sectionBox: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginHorizontal: 18,
    marginBottom: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    color: '#111',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 6,
  },
  sectionText: {
    color: '#333',
    fontSize: 16,
    marginBottom: 2,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  feeType: {
    color: '#222',
    fontSize: 16,
  },
  feeValue: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  reserveBtn: {
    backgroundColor: '#000',
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 10,
  },
  reserveBtnDisabled: {
    opacity: 0.6,
  },
  reserveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  doctorIconPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '85%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalDoctorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalDoctorInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalDoctorPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  modalDoctorIconPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalDoctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  modalDoctorMajor: {
    fontSize: 14,
    color: '#666',
  },
  backBtn: {
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginHorizontal: 18,
    borderWidth: 1,
    borderColor: '#000',
    marginBottom: 30,
  },
  backBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 17,
  },
  errorText: {
    color: '#c00',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 20,
  },
});
