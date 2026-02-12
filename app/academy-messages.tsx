import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Animated, Easing, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import { useHamburgerMenu } from '../components/HamburgerMenuContext';
import i18n from '../locales/i18n';

export default function AcademyMessagesScreen() {
  const { openMenu } = useHamburgerMenu();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, []);

  const [contacts] = useState([
    { id: '1', name: 'Coach Ahmed', lastMessage: i18n.t('lastMessageSample') || 'Hello, how are you?', unread: true },
    { id: '2', name: 'Parent Mona', lastMessage: i18n.t('lastMessageSample2') || 'Thanks for the update!', unread: false },
    { id: '3', name: 'Player Youssef', lastMessage: i18n.t('lastMessageSample3') || 'See you tomorrow!', unread: true },
  ]);

  const handleContactPress = (contact: any) => {
    router.push({ pathname: '/academy-chat', params: { contact: contact.name } });
  };

  const renderContactItem = ({ item }: any) => (
    <TouchableOpacity style={styles.messageCard} onPress={() => handleContactPress(item)} activeOpacity={0.8}>
      <View style={styles.avatarContainer}>
        <Ionicons name="person-circle" size={48} color="#000" />
        {item.unread && <View style={styles.unreadBadge} />}
      </View>
      <View style={styles.messageContent}>
        <View style={styles.messageHeader}>
      <Text style={styles.messageSender}>{item.name}</Text>
          {item.unread && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.messageText} numberOfLines={1}>{item.lastMessage}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
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
              <Text style={styles.headerTitle}>{i18n.t('academyMessages') || 'Messages'}</Text>
              <Text style={styles.headerSubtitle}>{i18n.t('yourConversations') || 'Your conversations'}</Text>
            </View>
      </View>

      <HamburgerMenu />

          {contacts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#666" />
              <Text style={styles.emptyText}>{i18n.t('noMessages') || 'No messages'}</Text>
              <Text style={styles.emptySubtext}>{i18n.t('startChatting') || 'Start chatting with coaches and parents!'}</Text>
            </View>
          ) : (
      <FlatList
        data={contacts}
        renderItem={renderContactItem}
        keyExtractor={item => item.id}
              contentContainerStyle={styles.messagesList}
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
  messagesList: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff3b30',
    borderWidth: 2,
    borderColor: '#fff',
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageSender: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#000',
    marginRight: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff3b30',
  },
  messageText: {
    fontSize: 14,
    color: '#666',
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
