// Polyfills must be imported first
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// Ensure global crypto object exists for AWS SDK
// react-native-get-random-values provides crypto.getRandomValues
// but AWS SDK might need the crypto object to exist
if (typeof global.crypto === 'undefined') {
  // @ts-ignore - polyfill for React Native
  global.crypto = global.crypto || {};
}

import { I18nManager } from 'react-native';
import '../locales/i18n'; // Load translations
import '../lib/firebase'; // Initialize Firebase
import { initializeLanguage } from '../lib/languageUtils';

// Set initial RTL state based on saved language
initializeLanguage().catch(error => {
  console.error('Error initializing language:', error);
});

// Entry point for Expo Router
export { default } from 'expo-router/entry';

console.log('APP FILE CHANGED');
I18nManager.allowRTL(true);