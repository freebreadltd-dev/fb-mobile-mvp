import { ActivityIndicator, Pressable, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useUserStore } from '@/context/user';
import { createApiClient } from '@/lib/apiClient';
import { useSessionStore } from '@/lib/session';
import { Redirect } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TabTwoScreen() {
  const api = React.useMemo(() => createApiClient('json'), []);
  const session = useSessionStore((s) => s.session);
  const setSession = useSessionStore((s) => s.setSession);
  const user = useUserStore((s) => s.user);
  const accountMode = useUserStore((s) => s.accountMode);
  const setAccountMode = useUserStore((s) => s.setAccountMode);
  const getModes = useUserStore((s) => s.getModes);
  const status = useUserStore((s) => s.status);
  const refreshMe = useUserStore((s) => s.refreshMe);
  const modes = getModes();
  const hasMultipleModes = modes.length > 1;
  const isBuyerOnly = !hasMultipleModes && modes[0] === 'buyer';
  const rolesLabel = Array.isArray(user?.roles) && user.roles.length > 0
    ? user.roles.join(', ')
    : (user?.role ?? '—');

  const [requestingSellerRole, setRequestingSellerRole] = React.useState(false);
  const [requestFeedback, setRequestFeedback] = React.useState<string | null>(null);

  const switchMode = React.useCallback(() => {
    if (!hasMultipleModes) return;
    const nextMode = accountMode === 'buyer' ? 'seller' : 'buyer';
    setAccountMode(nextMode);
  }, [accountMode, hasMultipleModes, setAccountMode]);

  const requestSellerRole = React.useCallback(async () => {
    setRequestFeedback(null);
    setRequestingSellerRole(true);
    try {
      const resp = await api.post('/user/seller-role-requests', {});
      if (resp.status === false) {
        setRequestFeedback(resp.message || 'Failed to submit seller role request');
        return;
      }
      setRequestFeedback('Seller role request submitted. Awaiting admin approval.');
      await refreshMe();
    } finally {
      setRequestingSellerRole(false);
    }
  }, [api, refreshMe]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView>
      <ThemedView className='p-4 py-8'>
        <View className='text-2xl text-center font-bold flex items-center gap-2'>
          <IconSymbol name="person.circle.fill" size={36} color="#000" />

        </View>

        <View className='flex flex-col gap-2 items-center mt-4'>
          <ThemedText className='text-center'>{status === 'loading' ? 'Loading…' : user?.email ?? '—'}</ThemedText>
          <View className='flex flex-row items-center gap-10 opacity-70'>
            <ThemedText>{user?.phone ?? '—'}</ThemedText>
            <ThemedText>{rolesLabel}</ThemedText>
          </View>
          {hasMultipleModes && (
            <View style={{ marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: '#E5E7EB' }}>
              <ThemedText>Mode: {accountMode}</ThemedText>
            </View>
          )}
        </View>
        <View className='flex  flex-col items-start gap-2 mt-4'>
          {hasMultipleModes && (
            <Pressable onPress={switchMode}>
              <ThemedText>Switch to {accountMode === 'buyer' ? 'seller' : 'buyer'} mode</ThemedText>
            </Pressable>
          )}

          {isBuyerOnly && (
            <Pressable
              disabled={requestingSellerRole}
              onPress={() => {
                void requestSellerRole();
              }}
              style={{ opacity: requestingSellerRole ? 0.6 : 1 }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {requestingSellerRole && <ActivityIndicator size="small" />}
                <ThemedText>{requestingSellerRole ? 'Requesting seller role...' : 'Request seller role'}</ThemedText>
              </View>
            </Pressable>
          )}

          {requestFeedback ? <ThemedText>{requestFeedback}</ThemedText> : null}

          <Pressable
            onPress={() => {
              void refreshMe();
            }}
          >
            <ThemedText>Refresh profile</ThemedText>
          </Pressable>

          <Pressable
            onPress={() => {
              void setSession(null);
            }}
            style={{ marginTop: 12 }}
          >
            <ThemedText>Logout</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}
