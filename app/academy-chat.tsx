import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import HamburgerMenu from '../components/HamburgerMenu';
import { useHamburgerMenu } from '../components/HamburgerMenuContext';
import i18n from '../locales/i18n';

export default function AcademyChatScreen() {
  const [messages, setMessages] = useState([
    { id: '1', text: i18n.t('welcomeToAcademyChat'), sender: 'system' },
  ]);
  const [input, setInput] = useState('');
  const { openMenu } = useHamburgerMenu();
  const router = useRouter();
  const params = useLocalSearchParams();
  const contact = params.contact || i18n.t('academyChat');

  const sendMessage = () => {
    if (input.trim()) {
      setMessages([
        ...messages,
        { id: Date.now().toString(), text: input, sender: 'me' },
      ]);
      setInput('');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Flat Header with Back Arrow and Hamburger Menu */}
      <View style={styles.headerBar}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => router.back()} 
          accessibilityLabel="Back"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{contact}</Text>
        <TouchableOpacity 
          style={styles.hamburgerBtn} 
          onPress={openMenu} 
          accessibilityLabel="Open menu"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.hamburgerBox}>
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </View>
        </TouchableOpacity>
      </View>
      <HamburgerMenu />
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.messageBubble, item.sender === 'me' ? styles.myMessage : styles.systemMessage]}>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        // Not inverted, so messages start from the top
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={i18n.t('typeMessage')}
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendBtnText}>{i18n.t('send')}</Text>
        </TouchableOpacity>
      </View>
      <Image source={require('../assets/logo.png')} style={styles.forsaLogo} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    backgroundColor: '#000',
    height: 80,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingBottom: 12,
    paddingHorizontal: 0,
    position: 'relative',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    bottom: 12,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginLeft: 44,
    marginRight: 44,
  },
  hamburgerBtn: {
    position: 'absolute',
    right: 16,
    bottom: 12,
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  hamburgerBox: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hamburgerLine: {
    width: 20,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    padding: 12,
    marginVertical: 6,
  },
  myMessage: {
    backgroundColor: '#000',
    alignSelf: 'flex-end',
  },
  systemMessage: {
    backgroundColor: '#eee',
    alignSelf: 'flex-start',
  },
  messageText: {
    color: '#111',
    fontSize: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#111',
    borderRadius: 16,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#111',
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: '#000',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  forsaLogo: { position: 'absolute', bottom: 18, left: '50%', transform: [{ translateX: -24 }], width: 48, height: 48, opacity: 0.18, zIndex: 1 },
});
