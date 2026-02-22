import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, onSnapshot, getFirestore, orderBy, query, where } from 'firebase/firestore';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, FlatList, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import HamburgerMenu from '../components/HamburgerMenu';
import { useHamburgerMenu } from '../components/HamburgerMenuContext';
import PostActionsMenu from '../components/PostActionsMenu';
import i18n from '../locales/i18n';

export default function ParentFeedScreen() {
  const { openMenu } = useHamburgerMenu();
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    const db = getFirestore();
    const postsRef = collection(db, 'posts');
    
    // Parent feed: Show posts where visibleToRoles array-contains "parent" AND status == "active"
    const q = query(
      postsRef,
      where('visibleToRoles', 'array-contains', 'parent'),
      where('status', '==', 'active'),
      orderBy('timestamp', 'desc')
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const posts = querySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        setFeed(posts);
        setLoading(false);
      },
      (error) => {
        console.error('Parent feed listener error:', error);
        // Fallback: try querying without status filter for backward compatibility
        const fallbackQ = query(
          postsRef,
          where('visibleToRoles', 'array-contains', 'parent'),
          orderBy('timestamp', 'desc')
        );
        onSnapshot(
          fallbackQ,
          (snapshot) => {
            const posts = snapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() }))
              .filter((post: any) => !post.status || post.status === 'active');
            setFeed(posts);
            setLoading(false);
          },
          (fallbackError) => {
            console.error('Parent feed fallback error:', fallbackError);
            setFeed([]);
            setLoading(false);
          }
        );
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
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
              <Text style={styles.headerTitle}>{i18n.t('parentFeed') || 'Parent Feed'}</Text>
              <Text style={styles.headerSubtitle}>{i18n.t('latestUpdates') || 'Latest updates from academies'}</Text>
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
          <Text style={styles.emptyText}>{i18n.t('noPosts') || 'No posts yet'}</Text>
          <Text style={styles.emptySubtext}>{i18n.t('beFirstToPost') || 'Be the first to share something!'}</Text>
        </View>
      ) : (
        <FlatList
          data={feed}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: any) => {
            const timestamp = item.timestamp?.seconds 
              ? new Date(item.timestamp.seconds * 1000) 
              : item.createdAt?.seconds 
                ? new Date(item.createdAt.seconds * 1000)
                : null;

            return (
              <View style={styles.postCard}>
                <View style={styles.postHeader}>
                  <View style={styles.academyAvatar}>
                    <Ionicons name="person-circle-outline" size={20} color="#000" />
                  </View>
                  <View style={styles.postHeaderText}>
                    <Text style={styles.academyName}>{item.author || 'User'}</Text>
                    {timestamp && (
                      <Text style={styles.postTime}>
                        {timestamp.toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <PostActionsMenu
                    postId={item.id}
                    postOwnerId={item.ownerId}
                    postOwnerRole={item.ownerRole}
                    mediaUrl={item.mediaUrl}
                    mediaType={item.mediaType}
                    contentText={item.content}
                    postTimestamp={item.timestamp || item.createdAt}
                  />
                </View>
                
                {/* Media display */}
                {item.mediaUrl && (
                  <View style={styles.mediaContainer}>
                    {item.mediaType === 'video' ? (
                      <Video
                        source={{ uri: item.mediaUrl }}
                        style={styles.mediaVideo}
                        useNativeControls
                        resizeMode={ResizeMode.CONTAIN}
                        isLooping={false}
                      />
                    ) : (
                      <Image 
                        source={{ uri: item.mediaUrl }} 
                        style={styles.postImage}
                        resizeMode="cover"
                      />
                    )}
                  </View>
                )}
                
                <Text style={styles.postContent}>{item.content || ''}</Text>
              </View>
            );
          }}
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
  feedContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  postCard: {
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
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  academyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  postHeaderText: {
    flex: 1,
  },
  academyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  postTime: {
    fontSize: 12,
    color: '#999',
  },
  postContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginTop: 8,
  },
  mediaContainer: {
    width: '100%',
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  mediaVideo: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});
