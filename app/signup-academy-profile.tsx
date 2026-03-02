import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { writeEmailIndex } from '../lib/emailIndex';
import { normalizePhoneForAuth } from '../lib/validations';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { uploadMedia } from '../services/MediaService';
import {
  validateAddress,
  validateCity,
  validateEmail,
  validatePassword,
  validatePhone,
  validateRequired,
  normalizePhoneForTwilio
} from '../lib/validations';
import i18n from '../locales/i18n';
import { getBackendUrl } from '../lib/config';

function isValidTimeFormat(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time); // HH:mm 00:00 to 23:59 (same as clinic)
}

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Time options in 15-min increments (same as clinic)
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

const SignupAcademy = () => {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const isNarrow = screenWidth < 380;
  const [academyName, setAcademyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');
  const [showCityModal, setShowCityModal] = useState(false);
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fees, setFees] = useState<{ [age: string]: string }>({});
  const [schedule, setSchedule] = useState<{ [age: string]: { day: string; time: string } }>({});
  const [scheduleDropdown, setScheduleDropdown] = useState<{ age: string; type: 'day' | 'time' } | null>(null);
  const [selectedAge, setSelectedAge] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [missing, setMissing] = useState<{ [key: string]: boolean }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const cityOptions = Object.entries(i18n.t('cities', { returnObjects: true }) as Record<string, string>).map(([key, label]) => ({ key, label }));

  const ageGroups = Array.from({ length: 10 }, (_, i) => (7 + i).toString());
  const renderAgeRows = () => {
    const rows = [];
    for (let i = 0; i < ageGroups.length; i += 3) {
      rows.push(ageGroups.slice(i, i + 3));
    }
    return rows;
  };

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, []);


  // Image picker for profile photo
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleBack = () => router.back();

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    const newMissing: { [key: string]: boolean } = {};

    const academyNameError = validateRequired(academyName, i18n.t('academy_name') || 'Academy name');
    if (academyNameError) {
      newErrors.academyName = academyNameError;
      newMissing.academyName = true;
    }

    // Email is optional - only validate if provided
    if (email && email.trim().length > 0) {
      const emailError = validateEmail(email);
      if (emailError) {
        newErrors.email = emailError;
        newMissing.email = true;
      }
    }

    // Phone is now required
    const phoneError = validatePhone(phone);
    if (phoneError) {
      newErrors.phone = phoneError;
      newMissing.phone = true;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      newErrors.password = passwordError;
      newMissing.password = true;
    }

    const cityError = validateCity(city);
    if (cityError) {
      newErrors.city = cityError;
      newMissing.city = true;
    }

    const addressError = validateAddress(address);
    if (addressError) {
      newErrors.address = addressError;
      newMissing.address = true;
    }

    // Profile photo is optional

    // Check that at least one fee is entered
    if (!Object.values(fees).some((v) => v && v.trim() !== '')) {
      newErrors.fees = i18n.t('atLeastOneFeeRequired') || 'At least one fee must be entered';
      newMissing.fees = true;
    }

    setErrors(newErrors);
    setMissing(newMissing);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) {
      Alert.alert(i18n.t('missingFields'), i18n.t('fillAllRequiredFields'));
      return;
    }
    try {
      setLoading(true);
      setFormError('');

      // Step 1: Create Firebase Auth user
      const normalizedPhone = normalizePhoneForTwilio(phone);
      const phoneForAuth = normalizePhoneForAuth(normalizedPhone);
      const authEmail = `user_${phoneForAuth}@forsa.app`;

      const userCredential = await createUserWithEmailAndPassword(auth, authEmail, password);
      const uid = userCredential.user.uid;

      // Step 2: Upload profile photo to Cloudinary
      let profilePhotoUrl = '';
      if (profileImage) {
        try {
          const cloudinaryResponse = await uploadMedia(profileImage, 'image');
          profilePhotoUrl = cloudinaryResponse.secure_url;
        } catch (error: any) {
          console.error('Error uploading profile photo:', error);
          throw new Error('Failed to upload profile photo. Please try again.');
        }
      }

      // Step 3: Save extended profile to Firestore
      const userData = {
        uid,
        role: 'academy',
        email: email && email.trim().length > 0 ? email.trim() : null,
        phone,
        academyName,
        city,
        address,
        description,
        fees,
        schedule: schedule,
        profilePhoto: profilePhotoUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', uid), userData, { merge: true });
      await setDoc(doc(db, 'academies', uid), userData);

      // Save email → authEmail mapping
      if (email && email.trim().length > 0) {
        await writeEmailIndex(email.trim(), authEmail);
      }

      router.replace('/academy-feed');
    } catch (err: any) {
      console.log('[Signup] Error:', err.message);
      let errorMsg = i18n.t('signupFailedMessage');
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = i18n.t('emailAlreadyRegistered') || 'This phone number is already registered';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = i18n.t('weakPassword') || 'Password is too weak';
      } else if (err.message) {
        errorMsg = err.message;
      }
      setFormError(errorMsg);
      Alert.alert(i18n.t('signupFailed'), errorMsg);
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
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>{i18n.t('signup_academy')}</Text>
              <Text style={styles.headerSubtitle}>{i18n.t('createYourAcademyAccount')}</Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {formError && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#ff3b30" />
                <Text style={styles.errorSubmitText}>{formError}</Text>
              </View>
            )}

            {/* Profile Picture Picker */}
            <View style={styles.profileSection}>
              <TouchableOpacity onPress={pickImage} style={styles.profileImageContainer}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Ionicons name="camera" size={32} color="#999" />
                  </View>
                )}
                <View style={styles.profileImageOverlay}>
                  <Ionicons name="camera" size={20} color="#fff" />
                </View>
              </TouchableOpacity>
              <Text style={styles.profileLabel}>
                {i18n.t('add_profile_picture')}
              </Text>
            </View>
            {/* Form Fields */}
            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {i18n.t('academy_name')}
                  <Text style={styles.required}> *</Text>
                </Text>
                <View style={[styles.inputWrapper, missing.academyName && styles.inputWrapperError]}>
                  <Ionicons name="school-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={academyName}
                    onChangeText={t => { setAcademyName(t); if (missing.academyName) setMissing(m => ({ ...m, academyName: false })); }}
                    autoCapitalize="words"
                    placeholder={i18n.t('academy_name_placeholder')}
                    placeholderTextColor="#999"
                  />
                </View>
                {errors.academyName && <Text style={styles.errorText}>{errors.academyName}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {i18n.t('phone')}
                  <Text style={styles.required}> *</Text>
                </Text>
                <View style={[styles.inputWrapper, missing.phone && styles.inputWrapperError]}>
                  <Ionicons name="call-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={t => { setPhone(t); if (missing.phone) setMissing(m => ({ ...m, phone: false })); }}
                    keyboardType="phone-pad"
                    placeholder={i18n.t('phone_placeholder') || i18n.t('phone_ph')}
                    placeholderTextColor="#999"
                  />
                </View>
                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {i18n.t('email_address') || 'Email Address'} <Text style={{ color: '#999', fontSize: 14 }}>(Optional)</Text>
                </Text>
                <View style={[styles.inputWrapper, missing.email && styles.inputWrapperError]}>
                  <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={t => {
                      setEmail(t);
                      if (missing.email) setMissing(m => ({ ...m, email: false }));
                      // Clear error if field is empty (since it's optional)
                      if (!t || t.trim().length === 0) {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.email;
                          return newErrors;
                        });
                        setMissing(prev => {
                          const newMissing = { ...prev };
                          delete newMissing.email;
                          return newMissing;
                        });
                      }
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder={i18n.t('email_address_ph') || 'Enter your email address (optional)'}
                    placeholderTextColor="#999"
                  />
                </View>
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {i18n.t('password')}
                  <Text style={styles.required}> *</Text>
                </Text>
                <View style={[styles.inputWrapper, missing.password && styles.inputWrapperError]}>
                  <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={t => { setPassword(t); if (missing.password) setMissing(m => ({ ...m, password: false })); }}
                    secureTextEntry
                    placeholder={i18n.t('password_placeholder')}
                    placeholderTextColor="#999"
                  />
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {i18n.t('city')}
                  <Text style={styles.required}> *</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.inputWrapper, styles.cityPickerWrapper, missing.city && styles.inputWrapperError]}
                  onPress={() => setShowCityModal(true)}
                >
                  <Ionicons name="location-outline" size={20} color="#999" style={styles.inputIcon} />
                  <Text style={[styles.cityText, !city && styles.cityPlaceholder]}>
                    {city ? i18n.t(`cities.${city}`) : i18n.t('selectCity') || 'Select City'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#999" />
                </TouchableOpacity>
                {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
                <Modal visible={showCityModal} transparent animationType="fade" onRequestClose={() => setShowCityModal(false)}>
                  <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCityModal(false)}>
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{i18n.t('selectCity')}</Text>
                        <TouchableOpacity onPress={() => setShowCityModal(false)}>
                          <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                      </View>
                      <ScrollView style={styles.modalScrollView}>
                        {cityOptions.map(option => (
                          <TouchableOpacity
                            key={option.key}
                            style={[styles.cityOption, city === option.key && styles.cityOptionSelected]}
                            onPress={() => {
                              setCity(option.key);
                              if (missing.city) setMissing(m => ({ ...m, city: false }));
                              setShowCityModal(false);
                            }}
                          >
                            <Text style={[styles.cityOptionText, city === option.key && styles.cityOptionTextSelected]}>
                              {option.label}
                            </Text>
                            {city === option.key && <Ionicons name="checkmark" size={20} color="#fff" />}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </TouchableOpacity>
                </Modal>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {i18n.t('address')}
                  <Text style={styles.required}> *</Text>
                </Text>
                <View style={[styles.inputWrapper, missing.address && styles.inputWrapperError]}>
                  <Ionicons name="map-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={address}
                    onChangeText={t => { setAddress(t); if (missing.address) setMissing(m => ({ ...m, address: false })); }}
                    autoCapitalize="words"
                    placeholder={i18n.t('address_placeholder')}
                    placeholderTextColor="#999"
                  />
                </View>
                {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{i18n.t('description')}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="document-text-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    placeholder={i18n.t('description_placeholder')}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {i18n.t('monthlyFeesPerAgeGroup')}
                  <Text style={styles.required}> *</Text>
                </Text>
                {renderAgeRows().map((row, rowIdx) => (
                  <View key={rowIdx} style={styles.feeBubblesRow}>
                    {row.map((age) => (
                      <View key={age} style={{ alignItems: 'center', flex: 1 }}>
                        <TouchableOpacity
                          style={[
                            styles.feeBubble,
                            selectedAge === age && styles.feeBubbleSelected,
                          ]}
                          onPress={() => setSelectedAge(selectedAge === age ? null : age)}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.feeBubbleText,
                            selectedAge === age && styles.feeBubbleTextSelected,
                          ]}>{age}</Text>
                        </TouchableOpacity>
                        {selectedAge === age && (
                          <Animated.View style={[styles.feeBubbleInputBox, { opacity: fadeAnim, transform: [{ scale: fadeAnim }] }]}>
                            <Text style={styles.feeInputLabel}>{i18n.t('enterFeeForAge', { age })}</Text>
                            <TextInput
                              style={styles.feeBubbleInput}
                              value={fees[age] || ''}
                              onChangeText={(val) => setFees({ ...fees, [age]: val.replace(/[^0-9]/g, '') })}
                              keyboardType="numeric"
                              placeholder={i18n.t('feePlaceholder')}
                              placeholderTextColor="#aaa"
                              maxLength={6}
                            />
                          </Animated.View>
                        )}
                      </View>
                    ))}
                    {/* Fill empty columns if needed for last row */}
                    {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, idx) => (
                      <View key={`empty-${idx}`} style={{ flex: 1 }} />
                    ))}
                  </View>
                ))}
                {errors.fees && <Text style={styles.errorText}>{errors.fees}</Text>}
              </View>

              {/* Schedule (day + time) per age group - theme-aligned, responsive */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{i18n.t('schedulePerAgeGroup') || 'Training schedule (day & time per age group)'}</Text>
                {ageGroups.map((age) => (
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

              <TouchableOpacity
                style={[styles.signupButton, loading && styles.signupButtonDisabled]}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.signupButtonText}>{i18n.t('signup')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

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
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  profileImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  required: {
    color: '#ff3b30',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
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
  inputWrapperError: {
    borderColor: '#ff3b30',
    backgroundColor: '#fff5f5',
  },
  cityPickerWrapper: {
    paddingHorizontal: 16,
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  cityText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 16,
  },
  cityPlaceholder: {
    color: '#999',
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
    width: '90%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
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
  cityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cityOptionSelected: {
    backgroundColor: '#000',
  },
  cityOptionText: {
    fontSize: 16,
    color: '#000',
  },
  cityOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorSubmitText: {
    color: '#ff3b30',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  signupButton: {
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
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  feeBubblesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    width: '100%',
    gap: 8,
  },
  feeBubble: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 2,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    minWidth: 60,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  feeBubbleSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  feeBubbleText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 18,
  },
  feeBubbleTextSelected: {
    color: '#fff',
  },
  feeBubbleInputBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000',
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 140,
    zIndex: 10,
  },
  feeBubbleInput: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    fontSize: 16,
    color: '#000',
    minWidth: 80,
    marginTop: 4,
    textAlign: 'left',
    fontWeight: '600',
  },
  feeInputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
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
});

export default SignupAcademy;