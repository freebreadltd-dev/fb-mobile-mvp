import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useUserStore } from '@/context/user';
import { createApiClient } from '@/lib/apiClient';
import { useSessionStore } from '@/lib/session';
import { Redirect } from 'expo-router';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

type WalletBucket = { account_id: string; currency: string; available_cents: number };
type WalletMeResponse = { buyer?: WalletBucket; seller?: WalletBucket };

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

  const [wallet, setWallet] = React.useState<WalletMeResponse | null>(null);
  const [walletLoading, setWalletLoading] = React.useState(true);
  const [walletError, setWalletError] = React.useState<string | null>(null);
  const [topupAmount, setTopupAmount] = React.useState('');
  const [topupLoading, setTopupLoading] = React.useState(false);
  const [topupFeedback, setTopupFeedback] = React.useState<string | null>(null);

  const loadWallet = React.useCallback(async () => {
    if (!session) return;
    setWalletError(null);
    setWalletLoading(true);
    try {
      const resp = await api.get('/wallet/me');
      if (resp.status === false) {
        setWalletError(resp.message || 'Failed to load wallets');
        setWallet(null);
        return;
      }
      setWallet(resp.data as WalletMeResponse);
    } finally {
      setWalletLoading(false);
    }
  }, [api, session]);

  React.useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const runTopup = React.useCallback(async () => {
    setTopupFeedback(null);
    const amountCents = Math.round(parseFloat(topupAmount || '0') * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setTopupFeedback('Enter a valid amount in NGN (e.g. 10 for 10 NGN).');
      return;
    }
    setTopupLoading(true);
    try {
      const resp = await api.post('/wallet/topup', { amount_cents: amountCents });
      if (resp.status === false) {
        setTopupFeedback(resp.message || 'Top-up failed');
        return;
      }
      const data = resp.data as { available_cents: number; currency?: string };
      const currency = data.currency ?? wallet?.buyer?.currency ?? 'NGN';
      setWallet((prev) => prev && prev.buyer
        ? { ...prev, buyer: { ...prev.buyer, available_cents: data.available_cents, currency } }
        : prev);
      setTopupAmount('');
      setTopupFeedback(`Topped up successfully. Buyer balance: ${((data.available_cents ?? 0) / 100).toFixed(2)} ${currency}`);
    } finally {
      setTopupLoading(false);
    }
  }, [api, topupAmount, wallet?.buyer?.currency]);

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
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <ThemedView className='py-4'>
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

          <View style={{ marginTop: 24, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14 }}>
            <ThemedText style={{ fontWeight: '700', marginBottom: 8 }}>Wallets</ThemedText>
            {walletLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" />
                <ThemedText>Loading…</ThemedText>
              </View>
            ) : walletError ? (
              <ThemedText style={{ color: '#B91C1C' }}>{walletError}</ThemedText>
            ) : wallet ? (
              <>
                {wallet.buyer != null && (
                  <View style={{ marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                    <ThemedText style={{ fontWeight: '600', marginBottom: 4 }}>Buyer wallet</ThemedText>
                    <ThemedText>Balance: {(wallet.buyer.available_cents / 100).toFixed(2)} {wallet.buyer.currency}</ThemedText>
                    <View style={{ marginTop: 10, gap: 8 }}>
                      <Text style={{ fontWeight: '600', fontSize: 13 }}>Top up (simulated)</Text>
                      <TextInput
                        placeholder="Amount in NGN (e.g. 10)"
                        value={topupAmount}
                        onChangeText={setTopupAmount}
                        keyboardType="decimal-pad"
                        style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10 }}
                      />
                      <Pressable
                        disabled={topupLoading}
                        onPress={() => void runTopup()}
                        style={{
                          backgroundColor: topupLoading ? '#93C5FD' : '#2563EB',
                          paddingVertical: 10,
                          borderRadius: 8,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: 'white', fontWeight: '700' }}>{topupLoading ? 'Topping up…' : 'Top up'}</Text>
                      </Pressable>
                      {topupFeedback ? <Text style={{ color: '#374151', fontSize: 13 }}>{topupFeedback}</Text> : null}
                    </View>
                  </View>
                )}
                {wallet.seller != null && (
                  <View>
                    <ThemedText style={{ fontWeight: '600', marginBottom: 4 }}>Seller wallet</ThemedText>
                    <ThemedText>Earnings balance: {(wallet.seller.available_cents / 100).toFixed(2)} {wallet.seller.currency}</ThemedText>
                  </View>
                )}
                <Pressable onPress={() => void loadWallet()} style={{ marginTop: 10 }}>
                  <ThemedText style={{ fontSize: 13, color: '#2563EB' }}>Refresh balances</ThemedText>
                </Pressable>
              </>
            ) : null}
          </View>

          <View className='flex flex-col items-start gap-2 mt-4'>
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
      </ScrollView>
    </SafeAreaView>
  );
}
