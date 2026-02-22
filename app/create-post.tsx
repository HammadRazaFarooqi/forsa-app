import { addDoc, collection, getFirestore, serverTimestamp } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import i18n from '../locales/i18n';

interface CreatePostScreenProps {
  route: { params?: { feedType?: 'player' | 'agent' | 'academy' } };
}

export default function CreatePostScreen({ route }: CreatePostScreenProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  // route.params.feedType: 'player' | 'agent' | 'academy'
  const feedType = route?.params?.feedType || 'player';

  const handlePost = async () => {
    if (!content.trim()) {
      Alert.alert(i18n.t('missingFields'), i18n.t('fillAllRequiredFields'));
      return;
    }
    setLoading(true);
    try {
      // Check if user is suspended
      const { isUserSuspended } = await import('../services/ModerationService');
      const suspended = await isUserSuspended();
      if (suspended) {
        Alert.alert('Account Suspended', 'Your account has been suspended. You cannot create new posts.');
        setLoading(false);
        return;
      }

      const db = getFirestore();
      const collectionName = feedType === 'agent' ? 'agentPosts' : feedType === 'academy' ? 'academyPosts' : 'posts';
      await addDoc(collection(db, collectionName), {
        author: i18n.t('moderator'), // You can replace with actual user name if needed
        content,
        timestamp: serverTimestamp(),
      });
      setContent('');
      Alert.alert(i18n.t('success'), i18n.t('postCreated'));
    } catch (e: any) {
      if (e.message && e.message.includes('suspended')) {
        Alert.alert('Account Suspended', e.message);
      } else {
        Alert.alert(i18n.t('error'), i18n.t('submissionError'));
      }
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} />
      <Text style={styles.header}>{i18n.t('createPost') || 'Create Post'}</Text>
      <TextInput
        style={styles.input}
        placeholder={i18n.t('postPlaceholder') || 'Write your post...'}
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={5}
      />
      <TouchableOpacity style={styles.button} onPress={handlePost} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? i18n.t('loading') : i18n.t('post')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
  logo: { width: 60, height: 60, resizeMode: 'contain', alignSelf: 'center', marginTop: 18, marginBottom: 6, opacity: 0.22, tintColor: '#000' },
  header: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#000' },
  input: { borderWidth: 1, borderColor: '#000', borderRadius: 10, padding: 16, fontSize: 17, color: '#000', backgroundColor: '#fff', marginBottom: 20 },
  button: { backgroundColor: '#000', borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});
