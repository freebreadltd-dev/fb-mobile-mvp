import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { createApiClient } from '@/lib/apiClient';
import { useSessionStore } from '@/lib/session';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function LoginScreen() {
  const apiClient = createApiClient();
  const router = useRouter();
  const setSession = useSessionStore((s) => s.setSession);

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const login = useMutation({
    mutationFn: async () => {
      const trimmedEmail = email.trim();
      if (!trimmedEmail.includes('@')) throw new Error('Enter a valid email');
      if (password.length < 1) throw new Error('Enter your password');

      const resp = await apiClient.post('/auth/login', {
        email_or_phone: trimmedEmail,
        password,
        device_id: 'expo-device',
      });
      //TODO: account for different device ids
      console.log("resp", resp);

      if (resp.status === false) throw new Error(resp.message);
      return resp;
    },
    onSuccess: async (resp) => {
      await setSession({
        accessToken: resp.data.access_token,
        refreshToken: resp.data.refresh_token,
      });
      router.replace('/(tabs)');
    },
  });

  return (
    <SafeAreaView className="flex-1">
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: '700' }}>Storefront sign in</Text>
        <Text style={{ opacity: 0.7 }}>
          Use your email and password. OTP can be added later.
        </Text>

        <View style={{ height: 12 }} />

        <Text style={{ fontWeight: '600' }}>Email</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@store.com"
          value={email}
          onChangeText={setEmail}
          style={{
            borderWidth: 1,
            borderColor: '#E5E7EB',
            padding: 12,
            borderRadius: 12,
          }}
        />

        <Text style={{ fontWeight: '600' }}>Password</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          style={{
            borderWidth: 1,
            borderColor: '#E5E7EB',
            padding: 12,
            borderRadius: 12,
          }}
        />

        {login.isError && (
          <Text style={{ color: '#B91C1C' }}>
            {(login.error as Error)?.message ?? 'Login failed'}
          </Text>
        )}

        <Pressable
          disabled={login.isPending}
          onPress={() => {
            console.log('login');
            login.mutate()
          }}
          style={{
            marginTop: 8,
            backgroundColor: login.isPending ? '#93C5FD' : '#2563EB',
            padding: 14,
            borderRadius: 12,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          {login.isPending && <ActivityIndicator color="white" />}
          <Text style={{ color: 'white', fontWeight: '700' }}>
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

