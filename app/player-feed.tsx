import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, getFirestore, orderBy, query } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import { ActivityIndicator, Animated, Easing, FlatList, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import { useHamburgerMenu } from '../components/HamburgerMenuContext';
import i18n from '../locales/i18n';

export default function PlayerFeedScreen() {
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
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('timestamp', 'desc'));
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

  const renderFeedItem = ({ item }: any) => (
    <View style={styles.feedItem}>
      <View style={styles.feedHeader}>
        <View style={styles.feedAuthorContainer}>
          <Ionicons name="person-circle-outline" size={24} color="#000" />
          <Text style={styles.feedAuthor}>{item.author || 'Anonymous'}</Text>
        </View>
        <Text style={styles.feedTime}>{item.timestamp ? new Date(item.timestamp.seconds * 1000).toLocaleDateString() : ''}</Text>
      </View>
      <Text style={styles.feedContent}>{item.content}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
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
              <Text style={styles.headerTitle}>{i18n.t('feed') || 'Feed'}</Text>
              <Text style={styles.headerSubtitle}>{i18n.t('latestUpdates') || 'Latest updates from the community'}</Text>
        </View>
      </View>

          {/* Feed Content */}
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
      {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>{i18n.t('loading') || 'Loading...'}</Text>
              </View>
            ) : feed.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
                <Text style={styles.emptyText}>{i18n.t('noPosts') || 'No posts yet.'}</Text>
                <Text style={styles.emptySubtext}>{i18n.t('beFirstToPost') || 'Be the first to share something!'}</Text>
              </View>
            ) : (
              feed.map((item) => (
                <View key={item.id} style={styles.feedItem}>
                  <View style={styles.feedHeader}>
                    <View style={styles.feedAuthorContainer}>
                      <Ionicons name="person-circle-outline" size={24} color="#000" />
                      <Text style={styles.feedAuthor}>{item.author || 'Anonymous'}</Text>
                    </View>
                    {item.timestamp && (
                      <Text style={styles.feedTime}>
                        {new Date(item.timestamp.seconds * 1000).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.feedContent}>{item.content}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </Animated.View>
      </LinearGradient>
    </View>
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    opacity: 0.7,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 24,
    textAlign: 'center',
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  feedItem: {
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
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  feedAuthorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedAuthor: {
    fontWeight: 'bold',
    color: '#000',
    fontSize: 16,
  },
  feedTime: {
    color: '#999',
    fontSize: 12,
  },
  feedContent: {
    fontSize: 16,
    color: '#222',
    lineHeight: 24,
  },
});
