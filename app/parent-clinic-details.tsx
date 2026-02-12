import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState, useEffect } from 'react';
import { Alert, Animated, Easing, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import i18n from '../locales/i18n';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';

export default function ParentClinicDetailsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [clinic, setClinic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();

    if (params.id) {
      fetchClinicDetails(params.id as string);
    }
  }, [params.id]);

  const fetchClinicDetails = async (id: string) => {
    try {
      setLoading(true);
      const docRef = doc(db, 'clinics', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        // Transform services data
        const servicesList: any[] = [];
        if (data.services) {
          Object.entries(data.services).forEach(([key, val]: [string, any]) => {
            if (val.selected) {
              servicesList.push({
                name: i18n.t(key) || key,
                fee: val.fee
              });
            }
          });
        }

        // Transform working hours
        const workingHoursList: any[] = [];
        if (data.workingHours) {
          const daysOrder = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          daysOrder.forEach(day => {
            if (data.workingHours[day]) {
              const dayData = data.workingHours[day];
              workingHoursList.push({
                day: i18n.t(day) || day,
                from: dayData.off ? 'Closed' : dayData.from,
                to: dayData.off ? '' : dayData.to,
                off: dayData.off
              });
            }
          });
        }

        setClinic({
          id: docSnap.id,
          name: data.clinicName,
          city: data.city,
          address: data.address,
          email: data.email,
          phone: data.phone,
          desc: data.description,
          services: servicesList,
          workingHours: workingHoursList,
          doctors: data.doctors ? data.doctors.map((d: any) => d.name) : []
        });
      } else {
        console.log('No such document!');
      }
    } catch (error) {
      console.error('Error fetching clinic details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!clinic) {
    return (
      <View style={styles.errorContainer}>
        <LinearGradient colors={['#000000', '#1a1a1a', '#2d2d2d']} style={styles.gradient}>
          <View style={styles.errorContent}>
            <Ionicons name="alert-circle-outline" size={64} color="#fff" />
            <Text style={styles.errorText}>{i18n.t('clinicNotFound') || 'Clinic not found.'}</Text>
            <TouchableOpacity style={styles.backButtonLarge} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>{i18n.t('goBack') || 'Go Back'}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const handleCall = () => {
    if (clinic.phone) {
      Linking.openURL(`tel:${clinic.phone}`);
    } else {
      Alert.alert(i18n.t('error'), 'No phone number available');
    }
  };

  const handleReserve = async (doctor: string) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert(i18n.t('error'), i18n.t('loginRequired') || 'You must be logged in to book');
      return;
    }

    try {
      setLoading(true);
      const bookingData = {
        parentId: user.uid,
        providerId: clinic.id,
        type: 'clinic',
        status: 'pending',
        date: new Date().toISOString().split('T')[0], // Default to today for now, or maybe needs a picker?
        createdAt: new Date().toISOString(),
        name: clinic.name,
        city: clinic.city,
        doctor: doctor,
        price: 0, // Clinic price varies by service, maybe we can't capture it here easily without service selection
      };

      await addDoc(collection(db, 'bookings'), bookingData);

      Alert.alert(
        i18n.t('success') || 'Success',
        `${i18n.t('reservationSuccess') || 'Reservation request sent!'}\n${i18n.t('doctor')}: ${doctor}`,
        [{ text: 'OK', onPress: () => router.push('/parent-bookings') }] // successful booking takes you to My Bookings? Or just OK.
      );
    } catch (error) {
      console.error('Error creating booking:', error);
      Alert.alert(i18n.t('error'), i18n.t('bookingFailed') || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient
        colors={['#000000', '#1a1a1a', '#2d2d2d']}
        style={styles.gradient}
      >
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>{clinic.name}</Text>
              <Text style={styles.headerSubtitle}>{i18n.t('clinicDetails') || 'Clinic Information'}</Text>
            </View>
            <TouchableOpacity style={styles.callButton} onPress={handleCall}>
              <Ionicons name="call" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.detailsCard}>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="medical" size={20} color="#000" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{i18n.t('clinicNameLabel') || 'Clinic Name'}</Text>
                  <Text style={styles.detailValue}>{clinic.name}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="location" size={20} color="#000" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{i18n.t('city')}</Text>
                  <Text style={styles.detailValue}>{clinic.city}</Text>
                </View>
              </View>

              {/* Services with Individual Pricing */}
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="cash" size={20} color="#000" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{i18n.t('services') || 'Services & Fees'}</Text>
                  {clinic.services.map((service: any, idx: number) => (
                    <View key={idx} style={styles.serviceRow}>
                      <Text style={styles.serviceName}>{service.name}</Text>
                      <Text style={styles.serviceFee}>{service.fee} EGP</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="document-text" size={20} color="#000" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{i18n.t('description') || 'Description'}</Text>
                  <Text style={styles.detailValue}>{clinic.desc}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="map" size={20} color="#000" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{i18n.t('address') || 'Address'}</Text>
                  <Text style={styles.detailValue}>{clinic.address}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons name="mail" size={20} color="#000" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{i18n.t('email')}</Text>
                  <Text style={styles.detailValue}>{clinic.email || 'N/A'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.hoursCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="time" size={24} color="#000" />
                <Text style={styles.cardTitle}>{i18n.t('workingHours') || 'Working Hours'}</Text>
              </View>
              {clinic.workingHours.map((row: any, idx: number) => (
                <View key={idx} style={styles.hoursRow}>
                  <Text style={styles.hoursDay}>{row.day}</Text>
                  <Text style={styles.hoursTime}>
                    {row.off ? 'Closed' : `${row.from} - ${row.to}`}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.doctorsCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="people" size={24} color="#000" />
                <Text style={styles.cardTitle}>{i18n.t('doctors') || 'Doctors'}</Text>
              </View>
              {clinic.doctors && clinic.doctors.length > 0 ? (
                clinic.doctors.map((doctor: string, idx: number) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.doctorButton}
                    onPress={() => handleReserve(doctor)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="person" size={20} color="#000" style={styles.doctorIcon} />
                    <Text style={styles.doctorName}>{doctor}</Text>
                    <Ionicons name="calendar" size={20} color="#000" />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={{ color: '#666', fontStyle: 'italic', padding: 8 }}>{i18n.t('noDoctorsListed') || 'No doctors listed'}</Text>
              )}
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  errorContainer: {
    flex: 1,
  },
  errorContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 16,
    marginBottom: 20,
  },
  backButtonLarge: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  backButtonText: {
    color: '#000',
    fontWeight: 'bold',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
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
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginTop: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#000',
    lineHeight: 22,
  },
  hoursCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  doctorsCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 12,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  hoursDay: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  hoursTime: {
    fontSize: 16,
    color: '#666',
  },
  doctorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  doctorIcon: {
    marginRight: 12,
  },
  doctorName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  serviceName: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  serviceFee: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginLeft: 12,
  },
});
