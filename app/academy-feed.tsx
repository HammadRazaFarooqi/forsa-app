import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, getDocs, getFirestore, orderBy, query } from 'firebase/firestore';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import { useHamburgerMenu } from '../components/HamburgerMenuContext';
import i18n from '../locales/i18n';

export default function AcademyFeedScreen() {
  const router = useRouter();
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { openMenu } = useHamburgerMenu();
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
        const academyQuery = query(collection(db, 'academyPosts'), orderBy('timestamp', 'desc'));
        const agentQuery = query(collection(db, 'agentPosts'), orderBy('timestamp', 'desc'));
        const playerQuery = query(collection(db, 'playerPosts'), orderBy('timestamp', 'desc'));

        const [academySnap, agentSnap, playerSnap] = await Promise.all([
          getDocs(academyQuery),
          getDocs(agentQuery),
          getDocs(playerQuery),
        ]);

        const posts = [
          ...academySnap.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'academy' })),
          ...agentSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'agent' })),
          ...playerSnap.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'player' })),
        ];
        posts.sort((a: any, b: any) => {
          const aTime = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp?._seconds ? a.timestamp._seconds * 1000 : 0);
          const bTime = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp?._seconds ? b.timestamp._seconds * 1000 : 0);
          return bTime - aTime;
        });
        setFeed(posts);
      } catch (e) {
        setFeed([]);
      }
      setLoading(false);
    };
    fetchFeed();
  }, []);

  const renderFeedItem = ({ item }: any) => (
    <View style={styles.feedCard}>
      <View style={styles.feedHeader}>
        <View style={styles.feedAuthorContainer}>
          <Ionicons 
            name={item.type === 'agent' ? 'person-circle' : item.type === 'player' ? 'football' : 'school'} 
            size={24} 
            color={item.type === 'agent' ? '#007AFF' : item.type === 'player' ? '#bfa100' : '#000'} 
            style={styles.feedIcon}
          />
          <View>
            <Text style={[styles.feedAuthor, item.type === 'agent' && styles.feedAuthorAgent, item.type === 'player' && styles.feedAuthorPlayer]}>
              {item.author || 'Unknown'}
            </Text>
            <Text style={styles.feedType}>
              {item.type === 'agent' ? '(Agent)' : item.type === 'player' ? '(Player)' : '(Academy)'}
      </Text>
          </View>
        </View>
      </View>
      <Text style={styles.feedContent}>{item.content || ''}</Text>
      {item.timestamp && (
        <Text style={styles.feedTime}>{i18n.t('hoursAgo') || '2 hours ago'}</Text>
      )}
    </View>
  );

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
              <Text style={styles.headerTitle}>{i18n.t('feed') || 'Feed'}</Text>
              <Text style={styles.headerSubtitle}>{i18n.t('latestUpdates') || 'Latest updates from the community'}</Text>
            </View>
      </View>

      <HamburgerMenu />

      {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>{i18n.t('loading') || 'Loading...'}</Text>
            </View>
          ) : feed.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="newspaper-outline" size={64} color="#666" />
              <Text style={styles.emptyText}>{i18n.t('noPosts') || 'No posts yet.'}</Text>
              <Text style={styles.emptySubtext}>{i18n.t('beFirstToPost') || 'Be the first to share something!'}</Text>
            </View>
      ) : (
        <FlatList
          data={feed}
          renderItem={renderFeedItem}
          keyExtractor={item => item.id}
              contentContainerStyle={styles.feedList}
              showsVerticalScrollIndicator={false}
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
  feedList: {
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
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  feedHeader: {
    marginBottom: 12,
  },
  feedAuthorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedIcon: {
    marginRight: 12,
  },
  feedAuthor: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#000',
  },
  feedAuthorAgent: {
    color: '#007AFF',
  },
  feedAuthorPlayer: {
    color: '#bfa100',
  },
  feedType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  feedContent: {
    fontSize: 15,
    color: '#222',
    lineHeight: 22,
    marginBottom: 8,
  },
  feedTime: {
    fontSize: 12,
    color: '#999',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
