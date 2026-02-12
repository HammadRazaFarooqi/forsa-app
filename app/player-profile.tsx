import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import { useHamburgerMenu } from '../components/HamburgerMenuContext';
import i18n from '../locales/i18n';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { uploadImageToStorage } from '../lib/firebaseHelpers';

export default function PlayerProfileScreen() {
  const { openMenu } = useHamburgerMenu();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [position, setPosition] = useState('');
  const [dob, setDob] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null); // Firebase Storage URL
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();

    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      console.log('Current User:', user ? user.uid : 'No user');

      if (!user) {
        setLoading(false);
        Alert.alert(i18n.t('error') || 'Error', 'User not authenticated');
        return;
      }

      // Try fetching from 'players' collection first as it's role specific
      const playerDocRef = doc(db, 'players', user.uid);
      const playerDocSnap = await getDoc(playerDocRef);

      console.log('Fetching from players:', playerDocSnap.exists());

      if (playerDocSnap.exists()) {
        const data = playerDocSnap.data();
        console.log('Player Data:', data);
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setCity(data.city || '');
        setPosition(data.position || '');
        setDob(data.dob || '');
        if (data.profilePhoto) {
          setProfilePhoto(data.profilePhoto);
          setProfilePhotoUrl(data.profilePhoto);
        }
      } else {
        console.log('Fallback to users collection');
        // Fallback to 'users' collection if not found in 'players'
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        console.log('Fetching from users:', userDocSnap.exists());

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          console.log('User Data:', data);
          setFirstName(data.firstName || '');
          setLastName(data.lastName || '');
          setEmail(data.email || '');
          setPhone(data.phone || '');
          setCity(data.city || '');
          setPosition(data.position || '');
          setDob(data.dob || '');
          if (data.profilePhoto) {
            setProfilePhoto(data.profilePhoto);
            setProfilePhotoUrl(data.profilePhoto);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert(i18n.t('error') || 'Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const pickProfilePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      // Set local URI for preview (will be uploaded when saving)
      setProfilePhoto(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim() || !city || !position || !dob) {
      Alert.alert(i18n.t('missingFields') || 'Missing Fields', i18n.t('fillAllRequiredFields') || 'Please fill all required fields');
      return;
    }

    setUploading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert(i18n.t('error') || 'Error', 'User not authenticated');
        return;
      }

      let finalProfilePhotoUrl = profilePhotoUrl;

      // Upload profile photo to Firebase Storage if it's a new local image
      // Check if profilePhoto is different from the stored URL and is a local file
      if (profilePhoto && profilePhoto !== profilePhotoUrl && 
          (profilePhoto.startsWith('file://') || profilePhoto.startsWith('content://'))) {
        try {
          console.log('Uploading profile photo to Firebase Storage...');
          finalProfilePhotoUrl = await uploadImageToStorage(
            profilePhoto,
            `players/${user.uid}/profilePhoto.jpg`
          );
          console.log('Profile photo uploaded:', finalProfilePhotoUrl);
          setProfilePhotoUrl(finalProfilePhotoUrl);
        } catch (error) {
          console.error('Error uploading profile photo:', error);
          Alert.alert(i18n.t('error') || 'Error', 'Failed to upload profile photo');
          setUploading(false);
          return;
        }
      }

      // Prepare update data
      const updateData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim(),
        position: position.trim(),
        dob: dob.trim(),
        profilePhoto: finalProfilePhotoUrl || null,
        updatedAt: new Date().toISOString()
      };

      // Update both 'players' and 'users' collections
      await updateDoc(doc(db, 'players', user.uid), updateData);
      await updateDoc(doc(db, 'users', user.uid), updateData);

      // Update local state to show the uploaded URL
      if (finalProfilePhotoUrl) {
        setProfilePhoto(finalProfilePhotoUrl);
      }

      Alert.alert(i18n.t('success') || 'Success', i18n.t('profileUpdated') || 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert(i18n.t('error') || 'Error', 'Failed to save profile');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a1a' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>{i18n.t('editProfile') || 'Edit Profile'}</Text>
              <Text style={styles.headerSubtitle}>{i18n.t('updateYourInformation') || 'Update your information'}</Text>
            </View>
        </View>

          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Profile Photo Section */}
            <View style={styles.profileSection}>
              <TouchableOpacity onPress={pickProfilePhoto} style={styles.profileImageContainer}>
            {profilePhoto ? (
                  <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
            ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Ionicons name="camera" size={32} color="#999" />
                  </View>
            )}
                <View style={styles.profileImageOverlay}>
                  <Ionicons name="camera" size={20} color="#fff" />
                </View>
          </TouchableOpacity>
              <Text style={styles.profileLabel}>{i18n.t('profile_picture') || 'Profile Picture'}</Text>
        </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{i18n.t('first_name') || 'First Name'}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
                    placeholder={i18n.t('first_name_ph') || 'Enter first name'}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{i18n.t('last_name') || 'Last Name'}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
                    placeholder={i18n.t('last_name_ph') || 'Enter last name'}
                    placeholderTextColor="#999"
            />
          </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{i18n.t('email') || 'Email'}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
                    placeholder={i18n.t('email_ph') || 'Enter email'}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{i18n.t('phone') || 'Phone'}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
                    placeholder={i18n.t('phone_ph') || 'Enter phone number'}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{i18n.t('city') || 'City'}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="location-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
                    placeholder={i18n.t('selectCity') || 'Enter city'}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{i18n.t('position') || 'Position'}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="football-outline" size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={position}
              onChangeText={setPosition}
                    placeholder={i18n.t('position') || 'Enter position'}
                    placeholderTextColor="#999"
            />
          </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{i18n.t('dob') || 'Date of Birth'}</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="calendar-outline" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={dob}
            onChangeText={setDob}
                    placeholder={i18n.t('dob_ph') || 'YYYY-MM-DD'}
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, uploading && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={uploading}
                activeOpacity={0.8}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>{i18n.t('save') || 'Save'}</Text>
                )}
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
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
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
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 16,
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
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
