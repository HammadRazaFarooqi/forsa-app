import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import { useHamburgerMenu } from '../components/HamburgerMenuContext';
import i18n from '../locales/i18n';

export default function AgentUploadMedia() {
  const { openMenu } = useHamburgerMenu();
  const [media, setMedia] = useState<Array<{ uri: string; type: 'image' | 'video'; caption?: string }>>([]);
  const [captionDraft, setCaptionDraft] = useState('');
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, []);

  const handleAddMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setPendingMedia({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'image',
      });
      setShowCaptionInput(true);
    }
  };

  const handleSaveCaption = () => {
    if (pendingMedia) {
      setMedia((prev) => [
        ...prev,
        { ...pendingMedia, caption: captionDraft },
      ]);
      setCaptionDraft('');
      setPendingMedia(null);
      setShowCaptionInput(false);
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
            <TouchableOpacity style={styles.menuButton} onPress={openMenu}>
              <Ionicons name="menu" size={24} color="#fff" />
        </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>{i18n.t('uploadMedia') || 'Upload Media'}</Text>
              <Text style={styles.headerSubtitle}>{i18n.t('shareYourContent') || 'Share your content with players'}</Text>
            </View>
          </View>

        <HamburgerMenu />

          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.mediaCard}>
        <Text style={styles.sectionTitle}>{i18n.t('mediaSection') || 'Media'}</Text>
        <View style={styles.mediaGrid}>
          {media.length === 0 ? (
                  <View style={styles.emptyMedia}>
                    <Ionicons name="images-outline" size={48} color="#999" />
            <Text style={styles.placeholder}>{i18n.t('noMedia') || 'No media uploaded yet.'}</Text>
                  </View>
          ) : (
            media.map((item, idx) => (
              <View key={idx} style={styles.mediaThumb}>
                {item.type === 'image' ? (
                  <Image source={{ uri: item.uri }} style={styles.mediaImg} />
                ) : (
                        <View style={styles.videoThumb}>
                          <Ionicons name="play-circle" size={32} color="#fff" />
                        </View>
                )}
                      {item.caption && (
                        <Text style={styles.captionText} numberOfLines={2}>{item.caption}</Text>
                      )}
              </View>
            ))
          )}
        </View>
              <TouchableOpacity style={styles.addBtn} onPress={handleAddMedia} activeOpacity={0.8}>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.addBtnText}> {i18n.t('add') || 'Add'}</Text>
        </TouchableOpacity>
            </View>

        {showCaptionInput && pendingMedia && (
              <View style={styles.captionCard}>
            <Text style={styles.captionLabel}>{i18n.t('caption') || 'Caption'}</Text>
                <View style={styles.previewContainer}>
              {pendingMedia.type === 'image' ? (
                    <Image source={{ uri: pendingMedia.uri }} style={styles.previewImage} />
              ) : (
                    <View style={styles.previewVideo}>
                      <Ionicons name="videocam" size={40} color="#fff" />
                </View>
              )}
            </View>
            <TextInput
              style={styles.captionInput}
              placeholder={i18n.t('caption') || 'Caption'}
              value={captionDraft}
              onChangeText={setCaptionDraft}
              maxLength={100}
                  placeholderTextColor="#999"
                  multiline
                />
                <View style={styles.captionActions}>
                  <TouchableOpacity 
                    style={styles.cancelBtn} 
                    onPress={() => {
                      setShowCaptionInput(false);
                      setPendingMedia(null);
                      setCaptionDraft('');
                    }}
                  >
                    <Text style={styles.cancelBtnText}>{i18n.t('cancel') || 'Cancel'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCaption}>
              <Text style={styles.saveBtnText}>{i18n.t('save') || 'Save'}</Text>
            </TouchableOpacity>
                </View>
          </View>
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
    marginLeft: -44, // Negative margin to center title while keeping menu button on left
    paddingHorizontal: 44, // Add padding to ensure title doesn't overlap with menu button
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
  mediaCard: {
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  emptyMedia: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 40,
  },
  placeholder: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  mediaThumb: {
    width: 100,
    marginBottom: 8,
  },
  mediaImg: {
    width: 100,
    height: 100,
    borderRadius: 12,
    resizeMode: 'cover',
    backgroundColor: '#f0f0f0',
  },
  videoThumb: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  addBtn: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  captionCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  captionLabel: {
    fontSize: 18,
    color: '#000',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  previewImage: {
    width: 150,
    height: 150,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  previewVideo: {
    width: 150,
    height: 150,
    borderRadius: 16,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f5f5f5',
    color: '#000',
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  captionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
