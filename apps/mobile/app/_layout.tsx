import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { Fraunces_500Medium_Italic } from '@expo-google-fonts/fraunces/500Medium_Italic';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Fraunces_700Bold } from '@expo-google-fonts/fraunces/700Bold';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ReduceMotion, ReducedMotionConfig } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DialogHost } from '../components/DialogHost';
import { AuthProvider } from '../lib/auth';
import { colors } from '../lib/theme';
import '../lib/notification-handler';

const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Fraunces_500Medium_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  // Render a real React frame while fonts load so the platform splash can
  // auto-hide on every supported Android version. Mounting navigation only
  // after the font metrics are ready also prevents first-frame text clipping.
  if (!fontsLoaded && !fontError) {
    return (
      <View accessibilityLabel="Milte is opening" style={styles.fontLoading}>
        <StatusBar style="light" />
        <Image
          accessibilityIgnoresInvertColors
          source={require('../assets/splash-icon.png')}
          resizeMode="contain"
          style={styles.fontLoadingMark}
        />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <ReducedMotionConfig mode={ReduceMotion.System} />
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              animation: 'fade',
            }}
          />
          <DialogHost />
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  fontLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgDeep,
  },
  fontLoadingMark: {
    width: 128,
    height: 128,
  },
});
