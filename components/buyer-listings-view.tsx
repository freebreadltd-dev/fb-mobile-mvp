import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createApiClient } from '@/lib/apiClient';

type BrowseListingCard = {
  listing_id: string;
  seller_id: string;
  seller_display_name: string;
  product_id: string;
  product_name: string;
  product_category?: string | null;
  kind: string;
  price_cents: number;
  currency: string;
  available_qty: number;
  media_access_url?: string;
};

export function BuyerListingsView() {
  const api = React.useMemo(() => createApiClient('json'), []);
  const [listings, setListings] = React.useState<BrowseListingCard[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadListings = React.useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const resp = await api.get('/browse/listings?limit=50&offset=0');
      if (resp.status === false) {
        setError(resp.message || 'Failed to load listings');
        setListings([]);
        return;
      }
      setListings(Array.isArray(resp.data) ? resp.data : []);
    } finally {
      setLoading(false);
    }
  }, [api]);

  React.useEffect(() => {
    void loadListings();
  }, [loadListings]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text className="text-xl font-bold text-blue-500">Listings</Text>

        {loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator size="small" />
            <Text>Loading listings...</Text>
          </View>
        ) : null}

        {error ? (
          <Text style={{ color: '#B91C1C' }}>{error}</Text>
        ) : null}

        {!loading &&
          !error &&
          listings.map((item) => (
            <Pressable
              key={item.listing_id}
              onPress={() => {
                router.push({
                  pathname: '/catalog/[id]',
                  params: {
                    id: item.listing_id,
                    product_id: item.product_id ?? '',
                  },
                });
              }}
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 12,
                padding: 12,
                gap: 6,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              {item.media_access_url ? (
                <Image
                  source={{ uri: item.media_access_url }}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 8,
                    backgroundColor: '#F3F4F6',
                  }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 8,
                    backgroundColor: '#E5E7EB',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#9CA3AF', fontSize: 12 }}>No image</Text>
                </View>
              )}
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontWeight: '700' }} numberOfLines={1}>
                  {item.product_name || 'Unnamed product'}
                </Text>
                <Text style={{ color: '#6B7280', fontSize: 13 }}>
                  {item.seller_display_name || 'Seller'}
                </Text>
                <Text>
                  {item.price_cents} {item.currency} · {item.available_qty} in stock
                </Text>
                <Text style={{ color: '#2563EB', marginTop: 4 }}>View details</Text>
              </View>
            </Pressable>
          ))}

        {!loading && !error && listings.length === 0 ? (
          <Text style={{ color: '#6B7280' }}>No listings available yet.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
