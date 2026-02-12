import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import { Animated, Easing, FlatList, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import { useHamburgerMenu } from '../components/HamburgerMenuContext';
import i18n from '../locales/i18n';

const mockPosts = [
  { id: '1', academy: 'Elite Academy', content: i18n.t('samplePost1') || 'Check out our latest training session!', image: null },
  { id: '2', academy: 'Future Stars', content: i18n.t('samplePost2') || 'New batch starting next week!', image: null },
];

export default function ParentFeedScreen() {
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

      <FlatList
        data={mockPosts}
        keyExtractor={item => item.id}
            contentContainerStyle={styles.feedContent}
            showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
              <View style={styles.postCard}>
                <View style={styles.postHeader}>
                  <View style={styles.academyAvatar}>
                    <Ionicons name="school" size={20} color="#000" />
                  </View>
                  <View style={styles.postHeaderText}>
            <Text style={styles.academyName}>{item.academy}</Text>
                    <Text style={styles.postTime}>{i18n.t('hoursAgo') || '2 hours ago'}</Text>
                  </View>
                </View>
            <Text style={styles.postContent}>{item.content}</Text>
            {item.image && <Image source={{ uri: item.image }} style={styles.postImage} />}
          </View>
        )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="newspaper-outline" size={64} color="#666" />
                <Text style={styles.emptyText}>{i18n.t('noPosts') || 'No posts yet'}</Text>
                <Text style={styles.emptySubtext}>{i18n.t('beFirstToPost') || 'Be the first to share something!'}</Text>
    </View>
            }
          />
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
