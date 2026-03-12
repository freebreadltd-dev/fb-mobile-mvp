import { router } from 'expo-router';
import React from 'react';
import { Button, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BuyerListingsView } from '@/components/buyer-listings-view';
import { SellerCatalogView } from '@/components/seller-catalog-view';
import { useUserStore } from '@/context/user';
import { useSessionStore } from '@/lib/session';

export default function HomeScreen() {
  const session = useSessionStore((s) => s.session);
  const accountMode = useUserStore((s) => s.accountMode);

  const handleLogin = () => {
    router.push('/login');
  };

  if (!session) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <View className="flex-1 items-center justify-center bg-white">
          <Text className="text-xl font-bold text-blue-500">
            Welcome to Freebread!
          </Text>
          <Button title="Login" onPress={handleLogin} />
        </View>
      </SafeAreaView>
    );
  }

  if (accountMode === 'buyer') {
    return <BuyerListingsView />;
  }

  return <SellerCatalogView />;
}
