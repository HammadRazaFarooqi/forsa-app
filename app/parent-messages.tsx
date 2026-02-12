import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import { Animated, Easing, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import { useHamburgerMenu } from '../components/HamburgerMenuContext';
import i18n from '../locales/i18n';

export default function ParentMessagesScreen() {
  const { openMenu } = useHamburgerMenu();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const messages = [
    { id: '1', sender: 'Cairo Sports Clinic', last: 'Your appointment is confirmed!', time: '09:30', unread: true },
    { id: '2', sender: 'Giza Ortho Center', last: 'Please send your child\'s reports.', time: 'Yesterday', unread: false },
    { id: '3', sender: 'Alex Kids Clinic', last: 'Thank you for your feedback.', time: 'Mon', unread: false },
  ];

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
              <Text style={styles.headerTitle}>{i18n.t('parentMessages') || 'Messages'}</Text>
              <Text style={styles.headerSubtitle}>{i18n.t('yourConversations') || 'Your conversations'}</Text>
            </View>
          </View>

          <HamburgerMenu />

          <FlatList
            data={messages}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.messageCard, item.unread && styles.messageCardUnread]}>
                <View style={styles.messageHeader}>
                  <View style={[styles.avatar, item.unread && styles.avatarUnread]}>
                    <Ionicons 
                      name={item.sender.includes('Clinic') ? 'medical' : 'school'} 
                      size={20} 
                      color={item.unread ? '#fff' : '#666'} 
                    />
                  </View>
                  <View style={styles.messageInfo}>
                    <View style={styles.messageHeaderRow}>
                      <Text style={[styles.msgSender, item.unread && styles.msgSenderUnread]}>{item.sender}</Text>
                      <Text style={styles.msgTime}>{item.time}</Text>
                    </View>
                    <Text style={[styles.msgLast, item.unread && styles.msgLastUnread]} numberOfLines={1}>
                      {item.last}
                    </Text>
                  </View>
                  {item.unread && <View style={styles.unreadDot} />}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={64} color="#666" />
                <Text style={styles.emptyText}>{i18n.t('noMessages') || 'No messages'}</Text>
                <Text style={styles.emptySubtext}>{i18n.t('startChatting') || 'Start chatting with academies and clinics!'}</Text>
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
  messagesContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  messageCardUnread: {
    backgroundColor: '#f8f8f8',
    borderLeftWidth: 4,
    borderLeftColor: '#000',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarUnread: {
    backgroundColor: '#000',
  },
  messageInfo: {
    flex: 1,
  },
  messageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  msgSender: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  msgSenderUnread: {
    fontWeight: 'bold',
    color: '#000',
  },
  msgLast: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  msgLastUnread: {
    color: '#333',
    fontWeight: '500',
  },
  msgTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000',
    marginLeft: 8,
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
