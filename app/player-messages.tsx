import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import { useHamburgerMenu } from '../components/HamburgerMenuContext';
import i18n from '../locales/i18n';

export default function PlayerMessagesScreen() {
  const { openMenu } = useHamburgerMenu();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [conversations] = useState([
    { id: '1', name: 'Academy A', lastMessage: 'See you at training!', unread: 2 },
    { id: '2', name: 'Agent X', lastMessage: 'Send your highlights.', unread: 0 },
  ]);
  const router = useRouter();

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
      <HamburgerMenu />
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.menuButton} onPress={openMenu}>
              <Ionicons name="menu" size={24} color="#fff" />
      </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>{i18n.t('messages') || 'Messages'}</Text>
              <Text style={styles.headerSubtitle}>{i18n.t('yourConversations') || 'Your conversations'}</Text>
            </View>
          </View>

          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {conversations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color="rgba(255, 255, 255, 0.3)" />
                <Text style={styles.emptyText}>{i18n.t('noConversations') || 'No conversations yet'}</Text>
                <Text style={styles.emptySubtext}>{i18n.t('startChatting') || 'Start chatting with academies and agents!'}</Text>
              </View>
            ) : (
              conversations.map((item) => (
                <TouchableOpacity 
                  key={item.id}
                  style={styles.conversationCard} 
                  onPress={() => router.push({ pathname: '/player-chat', params: { id: item.id, name: item.name } })}
                  activeOpacity={0.8}
                >
                  <View style={styles.avatarContainer}>
                    <Ionicons name="person-circle" size={48} color="#000" />
                  </View>
                  <View style={styles.conversationContent}>
                    <View style={styles.conversationHeader}>
                      <Text style={styles.conversationName}>{item.name}</Text>
                      {item.unread > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>{item.unread}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
                </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
              ))
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
  conversationCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  avatarContainer: {
    marginRight: 16,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#000',
  },
  unreadBadge: {
    backgroundColor: '#000',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  unreadText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  lastMessage: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
  },
});
