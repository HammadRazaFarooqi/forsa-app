import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import i18n from '../locales/i18n';
import CommonStyles from '../styles/CommonStyles';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  hamburgerBox: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#000' },
  line: { width: 24, height: 3, backgroundColor: '#000', marginVertical: 2, borderRadius: 2 },
  bubble: { maxWidth: '80%', padding: 14, borderRadius: 22, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  bubbleSent: { backgroundColor: '#000', alignSelf: 'flex-end', borderTopRightRadius: 6 },
  bubbleReceived: { backgroundColor: '#eee', alignSelf: 'flex-start', borderTopLeftRadius: 6 },
  textSent: { color: '#fff', fontSize: 16 },
  textReceived: { color: '#222', fontSize: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 18, borderTopWidth: 1, borderTopColor: '#bbb', zIndex: 10 },
  input: { flex: 1, borderWidth: 1.5, borderColor: '#bbb', borderRadius: 22, padding: 18, marginRight: 12, color: '#000', backgroundColor: '#fff', fontSize: 17 },
  sendBtn: { backgroundColor: '#000', borderRadius: 22, paddingVertical: 16, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#bbb' },
  sendBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
  forsaLogo: { width: 100, height: 40, alignSelf: 'center', marginBottom: 16, marginTop: 8 },
  hamburgerBarAbsolute: {
    position: 'absolute',
    left: 12,
    zIndex: 2,
    padding: 0,
    backgroundColor: 'transparent',
    marginRight: 0,
    height: 44,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    top: 64, // Lowered hamburger menu by ~3cm more for better vertical alignment
  },
});


export default function PlayerChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const agentId = params.agentId as string | undefined;
  const maxFreeMessages = params.maxFreeMessages ? parseInt(params.maxFreeMessages as string, 10) : 3;
  const name = (params.name as string) || '';
  const [menuOpen, setMenuOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: '1', text: 'Hello! Welcome to the chat.', sent: false },
    { id: '2', text: 'Hi! Thank you!', sent: true },
  ]);
  const [input, setInput] = useState('');
  const [sentCount, setSentCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Load sent message count for this agent
  useEffect(() => {
    if (!agentId) return;
    (async () => {
      try {
        const now = new Date();
        const key = `agentMsgCount_${agentId}_${now.getFullYear()}_${now.getMonth()}`;
        const stored = await AsyncStorage.getItem(key);
        const count = stored ? parseInt(stored, 10) : 0;
        setSentCount(count);
        setLimitReached(count >= maxFreeMessages);
      } catch {}
    })();
  }, [agentId, maxFreeMessages]);

  // Scroll to end when messages change
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (agentId) {
      const now = new Date();
      const key = `agentMsgCount_${agentId}_${now.getFullYear()}_${now.getMonth()}`;
      let count = sentCount;
      if (count >= maxFreeMessages) {
        setLimitReached(true);
        router.replace('/_paywall');
        return;
      }
      count++;
      await AsyncStorage.setItem(key, String(count));
      setSentCount(count);
      if (count >= maxFreeMessages) {
        setLimitReached(true);
      }
    }
    setMessages(prev => [...prev, { id: Date.now().toString(), text: input, sent: true }]);
    setInput('');
  };

  return (
    <View style={styles.container}>
      {/* Unified Header */}
      <View style={CommonStyles.titleBar}>
        <View style={{ justifyContent: 'center', alignItems: 'center', position: 'relative', width: '100%' }}>
          <TouchableOpacity style={{ position: 'absolute', left: 12, top: 0, bottom: 0, justifyContent: 'center', zIndex: 2 }} onPress={() => setMenuOpen(true)}>
            <View style={styles.hamburgerBox}>
              <View style={styles.line} />
              <View style={styles.line} />
              <View style={styles.line} />
            </View>
          </TouchableOpacity>
          <Text style={[CommonStyles.titleText, { alignSelf: 'center' }]} numberOfLines={1} ellipsizeMode="tail">{name || i18n.t('chat') || 'Chat'}</Text>
        </View>
      </View>
      <HamburgerMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
      {/* Chat Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.sent ? styles.bubbleSent : styles.bubbleReceived]}>
            <Text style={item.sent ? styles.textSent : styles.textReceived}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 90, paddingTop: 16 }}
        style={{ flex: 1 }}
      />
      {/* Input Bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80} style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={i18n.t('typeMessage') || 'Type a message...'}
          placeholderTextColor="#888"
          editable={!limitReached}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={limitReached}>
          <Text style={styles.sendBtnText}>{i18n.t('send') || 'Send'}</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
      {limitReached && (
        <View style={{ backgroundColor: '#000', padding: 18, borderRadius: 18, margin: 18, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center' }}>{i18n.t('paywallMsg') || 'You have used your free messages for this agent. Please pay to continue.'}</Text>
          <TouchableOpacity style={{ marginTop: 14, backgroundColor: '#fff', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 32 }} onPress={() => router.replace('/_paywall')}>
            <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>{i18n.t('close') || 'Close'}</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Fixed Forsa Logo */}
      <Image source={require('../assets/logo.png')} style={styles.forsaLogo} />
    </View>
  );
}
