import { Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold, Figtree_800ExtraBold } from '@expo-google-fonts/figtree';
import { Unbounded_700Bold, Unbounded_900Black } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { SheetProvider } from '@/components/sheet';
import { ClosetProvider, useCloset } from '@/store/closet';
import { C } from '@/theme';

SplashScreen.preventAutoHideAsync();

function Root() {
  const [fontsLoaded, fontError] = useFonts({
    Unbounded_700Bold,
    Unbounded_900Black,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });
  const { ready } = useCloset();
  // A font that fails to load falls back to the system face rather than blocking the app.
  const loaded = (fontsLoaded || !!fontError) && ready;

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: C.bosque } }} />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <ClosetProvider>
        <SheetProvider>
          <Root />
        </SheetProvider>
      </ClosetProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bosque },
});
