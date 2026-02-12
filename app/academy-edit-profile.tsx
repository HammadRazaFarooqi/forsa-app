import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { getApp } from 'firebase/app';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import { useHamburgerMenu } from '../components/HamburgerMenuContext';
import i18n from '../locales/i18n';

const AGE_GROUPS = Array.from({ length: 11 }, (_, i) => (7 + i).toString());

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

  useEffect(() => {
    async function fetchPrices() {
      setLoading(true);
      setFetchError(null);
      try {
        const app = getApp();
        const db = getFirestore(app);
        const name = academyName || 'DefaultAcademy';
        const docRef = doc(db, 'academies', name);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.prices) {
            setPrices(data.prices);
            setSelected(Object.keys(data.prices));
          }
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

              <TouchableOpacity style={styles.saveButton} activeOpacity={0.8}>
                <Text style={styles.saveButtonText}>{i18n.t('save') || 'Save'}</Text>
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
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
