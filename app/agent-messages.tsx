import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import i18n from '../locales/i18n';

interface Message {
  id: string;
  text: string;
  sender: 'agent' | 'player';
  timestamp: number;
}

export default function AgentMessagesScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: i18n.t('helloPlayer') || 'Hello, how can I help you?', sender: 'agent', timestamp: Date.now() - 60000 },
    { id: '2', text: i18n.t('hiAgent') || 'Hi Agent, I have a question.', sender: 'player', timestamp: Date.now() - 50000 },
    { id: '3', text: i18n.t('sureAsk') || 'Sure, go ahead!', sender: 'agent', timestamp: Date.now() - 40000 },
  ]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), text: input, sender: 'agent', timestamp: Date.now() },
    ]);
    setInput('');
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
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>{name || i18n.t('player') || 'Player'}</Text>
              <Text style={styles.headerSubtitle}>{i18n.t('chatting') || 'Chatting'}</Text>
        </View>
      </View>

      {/* Chat Area */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[
            styles.bubble,
            item.sender === 'agent' ? styles.agentBubble : styles.playerBubble,
              ]}>
                <Text style={[
                  styles.bubbleText,
                  item.sender === 'agent' ? styles.agentBubbleText : styles.playerBubbleText
          ]}>
                  {item.text}
                </Text>
          </View>
        )}
            contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Input Bar */}
          <View style={styles.inputBar}>
        <TextInput
              style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={i18n.t('typeMessage') || 'Type a message...'}
              placeholderTextColor="#999"
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
            <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} activeOpacity={0.8}>
              <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
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
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
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
    marginLeft: -44, // Negative margin to center title while keeping back button on left
    paddingHorizontal: 44, // Add padding to ensure title doesn't overlap with back button
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  chatContent: {
    padding: 16,
    paddingBottom: 100,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  agentBubble: {
    backgroundColor: '#000',
    alignSelf: 'flex-end',
    borderTopRightRadius: 4,
  },
  playerBubble: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderTopLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 16,
  },
  agentBubbleText: {
    color: '#fff',
  },
  playerBubbleText: {
    color: '#000',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000',
    marginRight: 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
