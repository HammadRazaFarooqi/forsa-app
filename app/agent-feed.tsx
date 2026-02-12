import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs, getFirestore, orderBy, query } from 'firebase/firestore';
import React, { useRef, useState } from 'react';
import { Animated, Easing, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import { useHamburgerMenu } from '../components/HamburgerMenuContext';
import i18n from '../locales/i18n';

export default function AgentFeedScreen() {
  const router = useRouter();
  const { openMenu } = useHamburgerMenu();
  const [feed, setFeed] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, []);

  React.useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      try {
        const db = getFirestore();
        const q = query(collection(db, 'agentPosts'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        const posts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFeed(posts);
      } catch (e) {
        setFeed([]);
      }
      setLoading(false);
    };
    fetchFeed();
  }, []);

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
              <Text style={styles.headerTitle}>{i18n.t('agentFeed') || 'Feed'}</Text>
              <Text style={styles.headerSubtitle}>{i18n.t('latestUpdates') || 'Latest updates from players'}</Text>
            </View>
      </View>

      <HamburgerMenu />

      {loading ? (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>{i18n.t('loading') || 'Loading...'}</Text>
            </View>
      ) : (
        <FlatList
          data={feed}
              renderItem={({ item }) => (
                <View style={styles.feedCard}>
                  <Text style={styles.feedAuthor}>{item.author || 'Agent'}</Text>
                  <Text style={styles.feedContent}>{item.content}</Text>
                  {item.timestamp && (
                    <Text style={styles.feedTime}>{i18n.t('hoursAgo') || '2 hours ago'}</Text>
                  )}
                </View>
              )}
          keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="newspaper-outline" size={64} color="#666" />
                  <Text style={styles.emptyText}>{i18n.t('noPosts') || 'No posts yet'}</Text>
                  <Text style={styles.emptySubtext}>{i18n.t('beFirstToPost') || 'Be the first to share something!'}</Text>
    </View>
              }
            />
          )}
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
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  feedCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  feedAuthor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  feedContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 8,
  },
  feedTime: {
    fontSize: 12,
    color: '#999',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
  },
});
