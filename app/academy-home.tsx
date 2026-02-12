import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Animated, FlatList, I18nManager, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import i18n from '../locales/i18n';

// Dummy feed data (should be replaced with real API data)
const dummyFeed = [
  { id: '1', type: 'player', name: 'Mohamed Salah', content: 'Looking for a new academy!', avatar: require('../assets/logo.png') },
  { id: '2', type: 'agent', name: 'Agent Y', content: 'I have talented players available.', avatar: require('../assets/logo.png') },
];

export default function AcademyHomeScreen({ navigation }: any) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const [dropdownAnim] = useState(new Animated.Value(0)); // 0 = closed, 1 = open

  const openMenu = () => {
    setMenuOpen(true);
    Animated.timing(dropdownAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: false,
    }).start();
  };
  const closeMenu = () => {
    Animated.timing(dropdownAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start(() => setMenuOpen(false));
  };

  // Dropdown Y position (below hamburger)
  const dropdownTop = 48 + 8 + 48; // paddingTop + marginTop + hamburger height

  return (
    <View style={styles.container}>
      {/* Title Bar with Hamburger */}
      <View style={styles.titleBar}>
        <TouchableOpacity style={styles.hamburgerBox} onPress={openMenu}>
          <View style={styles.line} />
          <View style={styles.line} />
          <View style={styles.line} />
        </TouchableOpacity>
        <Text style={styles.title}>{i18n.t('academyHomeTitle') || 'Academy Home'}</Text>
      </View>
      {/* Dropdown Hamburger Menu */}
      <Modal visible={menuOpen} animationType="none" transparent>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeMenu} />
        <Animated.View style={[styles.dropdown, {
          top: dropdownTop,
          opacity: dropdownAnim,
          transform: [{ scaleY: dropdownAnim }],
        }]}
        >
          <ScrollView contentContainerStyle={{ paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); router.push('/academy-upload-media'); }}>
              <Text style={styles.menuText}>{i18n.t('uploadMedia') || 'Upload Media'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); router.push('/academy-edit-profile'); }}>
              <Text style={styles.menuText}>{i18n.t('editProfile') || 'Edit Profile'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { closeMenu(); router.push('/signout'); }}>
              <Text style={styles.menuText}>{i18n.t('signOut') || 'Sign Out'}</Text>
            </TouchableOpacity>
            {/* Language Switcher */}
            <View style={styles.buttonRowSingle}>
              <TouchableOpacity style={styles.chicButton} onPress={() => {
                const newLang = i18n.locale === 'en' ? 'ar' : 'en';
                const isRTL = newLang === 'ar';
                i18n.locale = newLang;
                I18nManager.forceRTL(isRTL);
                I18nManager.swapLeftAndRightInRTL(isRTL);
                closeMenu();
              }}>
                <Text style={styles.chicButtonText}>{i18n.locale === 'en' ? 'العربية' : 'English'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </Modal>
      {/* Feed */}
      <FlatList
        data={dummyFeed}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 18 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Image source={item.avatar} style={styles.avatar} />
              <View>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardType}>{item.type === 'player' ? i18n.t('playerProfile') : i18n.t('agentName')}</Text>
              </View>
            </View>
            <Text style={styles.cardContent}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{i18n.t('noPosts')}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' }, // White background
  titleBar: {
    backgroundColor: '#000',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: 48,
    paddingBottom: 18,
    paddingHorizontal: 0,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    zIndex: 10,
    position: 'relative',
  },
  hamburgerBox: {
    position: 'absolute',
    left: 12,
    top: 80,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    marginLeft: 12,
    marginRight: 18,
    flexDirection: 'column',
  },
  line: {
    width: 28,
    height: 4,
    backgroundColor: '#000', // Hamburger lines black
    marginVertical: 3,
    borderRadius: 2,
    alignSelf: 'center',
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 26,
    textAlign: 'center',
    flex: 1,
    zIndex: 1,
  },
  card: {
    backgroundColor: '#000', // Card black
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#fff', // White shadow for contrast
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#fff', // White border
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  cardName: { fontWeight: 'bold', fontSize: 18, color: '#fff', marginBottom: 2 }, // White text
  cardType: { color: '#fff', fontSize: 14, marginBottom: 2 }, // White text
  cardContent: { color: '#fff', fontSize: 15, marginTop: 4 }, // White text
  empty: { color: '#888', textAlign: 'center', marginTop: 40 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.18)',
    zIndex: 1,
  },
  dropdown: {
    position: 'absolute',
    left: 20,
    width: 240,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 10,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  buttonRowSingle: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  chicButton: {
    backgroundColor: '#007bff',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  chicButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
