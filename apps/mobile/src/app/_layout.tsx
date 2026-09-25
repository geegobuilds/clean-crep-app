import { useEffect } from 'react';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ DMSans_400Regular, DMSans_500Medium });
  // If the fonts fail to load, carry on with system fonts rather than leaving
  // the user stuck on the splash screen forever.
  const ready = fontsLoaded || fontError != null;

  useEffect(() => {
    if (fontError) console.warn('[fonts]', fontError);
    if (ready) SplashScreen.hideAsync();
  }, [ready, fontError]);

  // The native splash screen stays up until `ready` (preventAutoHideAsync
  // above), so nothing blank is ever visible here.
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Slot />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
