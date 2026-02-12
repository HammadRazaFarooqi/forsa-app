import { Slot } from 'expo-router';
import React from 'react';
import { ToastProvider } from 'react-native-toast-notifications';
import { HamburgerMenuProvider } from '../components/HamburgerMenuContext';

export default function Layout() {
  return (
    <HamburgerMenuProvider>
      <ToastProvider>
        <Slot />
      </ToastProvider>
    </HamburgerMenuProvider>
  );
}
