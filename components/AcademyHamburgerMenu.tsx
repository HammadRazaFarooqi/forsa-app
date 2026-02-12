import { useRouter } from 'expo-router';
import React from 'react';
import { I18nManager, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import i18n from '../locales/i18n';

interface AcademyHamburgerMenuProps {
  visible: boolean;
  onClose: () => void;
}

const AcademyHamburgerMenu: React.FC<AcademyHamburgerMenuProps> = ({ visible, onClose }) => {
  const router = useRouter();
  // Fallback translations (Google Translate for Arabic)
  const fallback = {
    en: {
      assistance: 'Assistance & Extras',
      feed: 'Feed',
      editProfile: 'Edit Profile',
      uploadMedia: 'Upload Media',
      messages: 'Messages',
      signOut: 'Sign Out',
    },
    ar: {
      assistance: 'المساعدة والإضافات',
      feed: 'المنشورات',
      editProfile: 'تعديل الملف الشخصي',
      uploadMedia: 'رفع الوسائط',
      messages: 'الرسائل',
      signOut: 'تسجيل الخروج',
    },
  };
  const lang = i18n.locale === 'ar' ? 'ar' : 'en';
  function getLabel(key: string, fallbackLabel: string) {
    const t = i18n.t(key);
    if (!t || t === key || t === undefined || t === null) return fallbackLabel;
    return t;
  }
  const options = [
    { label: getLabel('academyAssistance', fallback[lang].assistance), route: '/academy-services', highlight: true },
    { label: getLabel('academyFeed', fallback[lang].feed), route: '/academy-feed' },
    { label: getLabel('academyEditProfile', fallback[lang].editProfile), route: '/academy-edit-profile' },
    { label: getLabel('academyUploadMedia', fallback[lang].uploadMedia), route: '/academy-upload-media' },
    { label: getLabel('academyMessages', fallback[lang].messages), route: '/academy-messages' },
    { label: getLabel('signOut', fallback[lang].signOut), route: '/signout' },
  ];
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.menuBox}>
          {options.map((item, idx) => (
            <React.Fragment key={item.route}>
              {idx === 1 && <View style={styles.menuDivider} />}
              <TouchableOpacity
                style={[styles.menuItem, item.highlight && styles.menuItemGold]}
                onPress={() => {
                  onClose();
                  if (item.route === '/academy-feed') {
                    router.replace(item.route as any);
                  } else {
                    router.push(item.route as any);
                  }
                }}
                activeOpacity={item.highlight ? 0.85 : 1}
              >
                {item.highlight && false /* goldOverlay removed, keep white background */}
                <Text style={[
                  styles.menuText,
                  item.highlight && styles.menuTextGold,
                ]}>{item.label}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
          <View style={styles.languageRow}>
            <TouchableOpacity style={[styles.langBtn, { backgroundColor: '#000' }]} onPress={() => { 
              i18n.locale = 'en';
              I18nManager.forceRTL(false);
              I18nManager.swapLeftAndRightInRTL(false);
              onClose();
            }}>
              <Text style={[styles.langText, { color: '#fff' }]}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.langBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#000' }]} onPress={() => { 
              i18n.locale = 'ar';
              I18nManager.forceRTL(true);
              I18nManager.swapLeftAndRightInRTL(true);
              onClose();
            }}>
              <Text style={[styles.langText, { color: '#000' }]}>العربية</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  menuBox: {
    marginTop: 100,
    marginLeft: 18,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 28,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
    minWidth: 210,
    alignItems: 'flex-start',
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 0,
    width: '100%',
    borderRadius: 12,
  },
  menuItemGold: {
    // No background or border, keep as normal
  },
  goldOverlay: {
    // Remove overlay, keep background white
    display: 'none',
  },
  menuText: {
    fontSize: 17,
    color: '#111',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  menuTextGold: {
    color: '#bfa100',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: '#fffbe6',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    // Subtle glow only
    shadowColor: '#fffbe6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  menuDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    alignSelf: 'center',
  },
  langBtn: {
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginHorizontal: 2,
  },
  langText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
export default AcademyHamburgerMenu;
