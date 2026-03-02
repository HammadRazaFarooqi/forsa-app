import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { getApp } from 'firebase/app';
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore';
import { auth } from '../lib/firebase';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import { useHamburgerMenu } from '../components/HamburgerMenuContext';
import i18n from '../locales/i18n';

const AGE_GROUPS = Array.from({ length: 11 }, (_, i) => (7 + i).toString());

function isValidTimeFormat(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

function formatTime12Hour(time24: string): string {
  if (!time24 || !isValidTimeFormat(time24)) return time24;
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export default function AcademyEditProfileScreen({ academyName }: { academyName?: string }) {
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [prices, setPrices] = useState<{ [key: string]: string }>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [newPrice, setNewPrice] = useState('');
  const [settingAge, setSettingAge] = useState<string | null>(null);
  const { openMenu } = useHamburgerMenu();
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [editingAddress, setEditingAddress] = useState(false);
  const [contactPerson, setContactPerson] = useState('');
  const [editingContactPerson, setEditingContactPerson] = useState(false);
  const [schedule, setSchedule] = useState<{ [age: string]: { day: string; time: string } }>({});
  const [scheduleDropdown, setScheduleDropdown] = useState<{ age: string; type: 'day' | 'time' } | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isNarrow = screenWidth < 380;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    async function fetchPrices() {
      setLoading(true);
      setFetchError(null);
      try {
        const app = getApp();
        const db = getFirestore(app);
        const uid = auth.currentUser?.uid;
        const name = academyName || 'DefaultAcademy';
        const docId = uid || name;
        const docRef = doc(db, 'academies', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const feesOrPrices = data.fees || data.prices || {};
          if (data && (data.prices || data.fees)) {
            setPrices(feesOrPrices);
            setSelected(Object.keys(feesOrPrices));
          }
          if (data && data.schedule) setSchedule(data.schedule);
          if (data && data.profilePic) setProfilePic(data.profilePic);
          if (data && data.address) setAddress(data.address);
          if (data && data.contactPerson) setContactPerson(data.contactPerson);
        }
      } catch (e: any) {
        setFetchError(i18n.t('couldNotLoadData') || 'Could not load academy data.');
      } finally {
        setLoading(false);
      }
    }
    fetchPrices();
  }, [academyName]);

  const handleSetAge = (age: string) => {
    setSettingAge(age);
    setNewPrice('');
  };
  const handleSaveAge = (age: string) => {
    if (newPrice.trim()) {
      setPrices({ ...prices, [age]: newPrice });
      setSelected([...selected, age]);
      setSettingAge(null);
      setNewPrice('');
    }
  };
  const handleEditPrice = (age: string, value: string) => {
    setPrices({ ...prices, [age]: value });
  };

  const handleSave = async () => {
    const uid = auth.currentUser?.uid;
    const docId = uid || academyName || 'DefaultAcademy';
    if (!uid && !academyName) return;
    setSaving(true);
    try {
      const db = getFirestore(getApp());
      const academyRef = doc(db, 'academies', docId);
      const feesObj: { [key: string]: string | number } = {};
      Object.entries(prices).forEach(([k, v]) => { if (v) feesObj[k] = isNaN(Number(v)) ? v : Number(v); });
      await updateDoc(academyRef, {
        prices: feesObj,
        fees: feesObj,
        schedule: schedule,
        address: address || null,
        contactPerson: contactPerson || null,
        updatedAt: new Date().toISOString(),
      });
      if (router.canGoBack()) router.back();
    } catch (e: any) {
      console.error('Academy profile save error:', e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }
  if (fetchError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#ff3b30' }}>{fetchError}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient
        colors={['#000000', '#1a1a1a', '#2d2d2d']}
        style={styles.gradient}
      >
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.menuButton} onPress={openMenu}>
              <Ionicons name="menu" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>{i18n.t('editProfile') || 'Edit Profile'}</Text>
              <Text style={styles.headerSubtitle}>{i18n.t('updateYourInformation') || 'Update your academy information'}</Text>
              </View>
          </View>

          <HamburgerMenu />

          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formCard}>
              {/* Profile Picture */}
              <View style={styles.profileSection}>
                <TouchableOpacity onPress={() => {/* TODO: open image picker */}} style={styles.profileImageContainer}>
                  {profilePic ? (
                    <View style={styles.profileImageWrapper}>
                      <Ionicons name="image" size={48} color="#fff" />
          </View>
        ) : (
                    <View style={styles.profileImagePlaceholder}>
                      <Ionicons name="camera" size={32} color="#999" />
                    </View>
                  )}
                  <View style={styles.profileImageOverlay}>
                    <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        <TouchableOpacity onPress={() => {/* TODO: open image picker */}}>
                  <Text style={styles.changeProfileText}>{i18n.t('changeProfilePicture')}</Text>
        </TouchableOpacity>
      </View>

              {/* Academy Name (read-only) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{i18n.t('academyNameLabel')}</Text>
                <View style={[styles.inputWrapper, styles.readOnlyInput]}>
                  <Ionicons name="school-outline" size={20} color="#999" style={styles.inputIcon} />
                  <Text style={styles.readOnlyText}>{academyName || i18n.t('academyNameLabel')}</Text>
        </View>
      </View>

              {/* Address */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{i18n.t('address')}</Text>
        {editingAddress ? (
                  <View style={styles.inputWrapper}>
                    <Ionicons name="map-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
                      style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder={i18n.t('addressPlaceholder')}
                      placeholderTextColor="#999"
              autoFocus
            />
                    <TouchableOpacity onPress={() => setEditingAddress(false)}>
                      <Ionicons name="checkmark-circle" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        ) : (
                  <TouchableOpacity 
                    style={styles.inputWrapper}
                    onPress={() => setEditingAddress(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="map-outline" size={20} color="#999" style={styles.inputIcon} />
                    <Text style={[styles.input, !address && styles.placeholderText]}>
                      {address || i18n.t('addressPlaceholder')}
                    </Text>
                    <Ionicons name="create-outline" size={20} color="#999" />
            </TouchableOpacity>
        )}
      </View>

              {/* Contact Person */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{i18n.t('contactPerson')}</Text>
        {editingContactPerson ? (
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
                      style={styles.input}
              value={contactPerson}
              onChangeText={setContactPerson}
              placeholder={i18n.t('contactPersonPlaceholder')}
                      placeholderTextColor="#999"
              autoFocus
            />
                    <TouchableOpacity onPress={() => setEditingContactPerson(false)}>
                      <Ionicons name="checkmark-circle" size={24} color="#000" />
            </TouchableOpacity>
          </View>
        ) : (
                  <TouchableOpacity 
                    style={styles.inputWrapper}
                    onPress={() => setEditingContactPerson(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
                    <Text style={[styles.input, !contactPerson && styles.placeholderText]}>
                      {contactPerson || i18n.t('contactPersonPlaceholder')}
                    </Text>
                    <Ionicons name="create-outline" size={20} color="#999" />
            </TouchableOpacity>
        )}
      </View>

              {/* Fees per Age Group */}
              <View style={styles.inputGroup}>
      <Text style={styles.label}>{i18n.t('feesPerAgeGroup') || 'Fees per Age Group'}</Text>
      <View style={styles.bubbleRow}>
        {AGE_GROUPS.map(age => (
          <View key={age} style={[styles.bubble, selected.includes(age) && styles.bubbleSelected]}>
            <Text style={[styles.bubbleText, selected.includes(age) && styles.bubbleTextSelected]}>{age}</Text>
            {selected.includes(age) ? (
              <TextInput
                style={styles.priceInput}
                value={prices[age] || ''}
                onChangeText={v => handleEditPrice(age, v)}
                keyboardType="numeric"
                placeholder={i18n.t('feePlaceholder') || 'Fee'}
                          placeholderTextColor="#999"
              />
            ) : settingAge === age ? (
              <View style={styles.setRow}>
                <TextInput
                  style={styles.priceInput}
                  value={newPrice}
                  onChangeText={setNewPrice}
                  keyboardType="numeric"
                  placeholder={i18n.t('feePlaceholder') || 'Fee'}
                            placeholderTextColor="#999"
                  autoFocus
                />
                <TouchableOpacity style={styles.setBtn} onPress={() => handleSaveAge(age)}>
                  <Text style={styles.setBtnText}>{i18n.t('save') || 'Save'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.setBtn} onPress={() => handleSetAge(age)}>
                <Text style={styles.setBtnText}>{i18n.t('set') || 'Set'}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>
              </View>

              {/* Schedule (day + time) per age group - theme-aligned, responsive */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{i18n.t('schedulePerAgeGroup') || 'Training schedule (day & time per age)'}</Text>
                {AGE_GROUPS.map((age) => (
                  <View
                    key={age}
                    style={[
                      styles.scheduleRow,
                      isNarrow && styles.scheduleRowNarrow,
                      { position: 'relative', zIndex: scheduleDropdown?.age === age ? 10 : 1 },
                    ]}
                  >
                    <Text style={styles.scheduleAgeLabel} numberOfLines={1}>{age} {i18n.t('years') || 'yrs'}</Text>
                    <View style={styles.schedulePickersWrap}>
                      <TouchableOpacity
                        style={styles.schedulePickerBtn}
                        onPress={() => setScheduleDropdown(prev => prev?.age === age && prev?.type === 'day' ? null : { age, type: 'day' })}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.schedulePickerText} numberOfLines={1}>
                          {schedule[age]?.day ? (i18n.t(schedule[age].day) || schedule[age].day) : (i18n.t('day') || 'Day')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.schedulePickerBtn}
                        onPress={() => setScheduleDropdown(prev => prev?.age === age && prev?.type === 'time' ? null : { age, type: 'time' })}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.schedulePickerText} numberOfLines={1}>
                          {schedule[age]?.time ? formatTime12Hour(schedule[age].time) : (i18n.t('time') || 'Time')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {scheduleDropdown?.age === age && (
                      <View style={[styles.scheduleDropdown, { maxWidth: screenWidth - 48 }, isNarrow && styles.scheduleDropdownNarrow]}>
                        <ScrollView style={styles.scheduleDropdownScroll} showsVerticalScrollIndicator={true}>
                          {scheduleDropdown.type === 'day'
                            ? DAYS_OF_WEEK.map((day) => (
                                <TouchableOpacity
                                  key={day}
                                  onPress={() => {
                                    setSchedule(s => ({ ...s, [age]: { ...(s[age] || { day: '', time: '' }), day } }));
                                    setScheduleDropdown(null);
                                  }}
                                  style={[styles.scheduleDropdownItem, schedule[age]?.day === day && styles.scheduleDropdownItemSelected]}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.scheduleDropdownItemText}>{i18n.t(day) || day}</Text>
                                </TouchableOpacity>
                              ))
                            : TIME_OPTIONS.map((t) => (
                                <TouchableOpacity
                                  key={t}
                                  onPress={() => {
                                    setSchedule(s => ({ ...s, [age]: { ...(s[age] || { day: '', time: '' }), time: t } }));
                                    setScheduleDropdown(null);
                                  }}
                                  style={[styles.scheduleDropdownItem, schedule[age]?.time === t && styles.scheduleDropdownItemSelected]}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.scheduleDropdownItemText}>{t}</Text>
                                </TouchableOpacity>
                              ))}
                        </ScrollView>
                        <TouchableOpacity onPress={() => setScheduleDropdown(null)} style={styles.scheduleDropdownCancel} activeOpacity={0.8}>
                          <Text style={styles.scheduleDropdownCancelText}>{i18n.t('cancel') || 'Cancel'}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
                <Text style={styles.saveButtonText}>{saving ? (i18n.t('saving') || 'Saving...') : (i18n.t('save') || 'Save')}</Text>
      </TouchableOpacity>
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
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  profileImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  changeProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f5f5f5',
    paddingHorizontal: 16,
    minHeight: 56,
  },
  readOnlyInput: {
    backgroundColor: '#f9f9f9',
    opacity: 0.7,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 16,
  },
  readOnlyText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
    paddingVertical: 16,
  },
  placeholderText: {
    color: '#999',
  },
  bubbleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  bubble: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    minWidth: 60,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  bubbleSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  bubbleText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  bubbleTextSelected: {
    color: '#fff',
  },
  priceInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 14,
    color: '#000',
    minWidth: 60,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#ddd',
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  setBtn: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  setBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
    minHeight: 44,
  },
  scheduleRowNarrow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 6,
    marginBottom: 14,
  },
  scheduleAgeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    minWidth: 48,
    width: 48,
  },
  schedulePickersWrap: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minWidth: 0,
  },
  schedulePickerBtn: {
    flex: 1,
    minWidth: 72,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  schedulePickerText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '500',
  },
  scheduleDropdown: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    zIndex: 100,
    maxHeight: 220,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  scheduleDropdownScroll: {
    maxHeight: 180,
  },
  scheduleDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  scheduleDropdownItemSelected: {
    backgroundColor: '#f0f0f0',
  },
  scheduleDropdownItemText: {
    color: '#000',
    fontSize: 15,
  },
  scheduleDropdownCancel: {
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  scheduleDropdownCancelText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 15,
  },
  scheduleDropdownNarrow: {
    top: 76,
    left: 0,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
