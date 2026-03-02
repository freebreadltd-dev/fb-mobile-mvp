import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import 'react-native-reanimated';

import '@/global.css';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { QueryProvider } from '@/lib/query/provider';
import { useSessionStore } from '@/lib/session';
import { useUserStore } from '@/context/user';
export const unstable_settings = {
  anchor: '(tabs)',
};

function UserBootstrap() {
  const accessToken = useSessionStore((s) => s.session?.accessToken);
  const refreshMe = useUserStore((s) => s.refreshMe);
  const clear = useUserStore((s) => s.clear);

  React.useEffect(() => {
    if (!accessToken) {
      clear();
      return;
    }
    void refreshMe();
  }, [accessToken, clear, refreshMe]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const hydrate = useSessionStore((s) => s.hydrate);

  React.useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <QueryProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <UserBootstrap />
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: 'Sign in' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </QueryProvider>
  );
}
