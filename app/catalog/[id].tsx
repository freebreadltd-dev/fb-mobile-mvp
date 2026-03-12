import * as ImagePicker from 'expo-image-picker';
import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createApiClient } from '@/lib/apiClient';
import { ENV } from '@/lib/env';
import { sessionStore, useSessionStore } from '@/lib/session';

type Listing = {
  id: string;
  seller_id: string;
  product_id: string;
  kind: string;
  price_cents: number;
  currency: string;
  on_hand: number;
  reserved: number;
  updated_at: string;
};

type Media = {
  id: string;
  product_id: string;
  access_url?: string;
  created_at: string;
};

export default function CatalogDetailScreen() {
  const api = React.useMemo(() => createApiClient('json'), []);
  const session = useSessionStore((s) => s.session);
  const { id, product_id: productIDFromParam } = useLocalSearchParams<{ id?: string; product_id?: string }>();

  const [listing, setListing] = React.useState<Listing | null>(null);
  const [media, setMedia] = React.useState<Media[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [pickedURI, setPickedURI] = React.useState<string | null>(null);

  const listingID = typeof id === 'string' ? id : '';
  const productID = typeof productIDFromParam === 'string' && productIDFromParam !== ''
    ? productIDFromParam
    : (listing?.product_id ?? '');

  const loadDetails = React.useCallback(async () => {
    if (!session || !listingID) return;
    setLoading(true);
    setError(null);
    try {
      const listingResp = await api.get(`/listings/${listingID}`);
      if (listingResp.status === false) {
        setError(listingResp.message || 'Failed to fetch listing details');
        return;
      }

      const nextListing = listingResp.data as Listing;
      setListing(nextListing);

      const nextProductID = (nextListing.product_id || productID) as string;
      if (!nextProductID) return;
      const mediaResp = await api.get(`/products/${nextProductID}/media`);
      if (mediaResp.status === false) {
        setError(mediaResp.message || 'Failed to fetch product media');
        return;
      }
      setMedia(Array.isArray(mediaResp.data) ? (mediaResp.data as Media[]) : []);
    } finally {
      setLoading(false);
    }
  }, [api, listingID, productID, session]);

  React.useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  const pickImage = React.useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFeedback('Media library permission is required to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || result.assets.length === 0) {
      return;
    }
    setPickedURI(result.assets[0].uri);
    setFeedback(null);
  }, []);

  const uploadMedia = React.useCallback(async () => {
    if (!pickedURI) {
      setFeedback('Pick an image first.');
      return;
    }
    if (!productID) {
      setFeedback('Missing product id for this listing.');
      return;
    }
    const auth = await sessionStore.get();
    if (!auth?.accessToken) {
      setFeedback('Session expired. Please login again.');
      return;
    }

    setUploading(true);
    setFeedback(null);
    try {
      const form = new FormData();
      form.append('file', {
        uri: pickedURI,
        name: `catalog-${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as any);

      const res = await fetch(`${ENV.apiBaseUrl}/api/v1/products/${productID}/media`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: form,
      });

      const body = (await res.json()) as any;
      if (!res.ok || body?.success !== true) {
        setFeedback(body?.message || 'Upload failed.');
        return;
      }

      setFeedback('Media uploaded successfully.');
      setPickedURI(null);
      await loadDetails();
    } catch {
      setFeedback('Upload failed due to network or file error.');
    } finally {
      setUploading(false);
    }
  }, [loadDetails, pickedURI, productID]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#2563EB' }}>Catalog Detail</Text>

        {loading ? (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <ActivityIndicator size="small" />
            <Text>Loading details...</Text>
          </View>
        ) : null}

        {error ? <Text style={{ color: '#B91C1C' }}>{error}</Text> : null}

        {listing ? (
          <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, gap: 6 }}>
            <Text style={{ fontWeight: '700' }}>Listing: {listing.id}</Text>
            <Text>Kind: {listing.kind}</Text>
            <Text>Product: {listing.product_id}</Text>
            <Text>Price: {listing.price_cents} {listing.currency}</Text>
            <Text>Stock: {listing.on_hand}</Text>
            <Text>Reserved: {listing.reserved}</Text>
          </View>
        ) : null}

        <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, gap: 10 }}>
          <Text style={{ fontWeight: '700' }}>Upload Product Media</Text>
          <Pressable
            onPress={() => {
              void pickImage();
            }}
            style={{ backgroundColor: '#2563EB', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }}
          >
            <Text style={{ color: 'white', fontWeight: '700' }}>{pickedURI ? 'Change image' : 'Pick image'}</Text>
          </Pressable>

          {pickedURI ? <Image source={{ uri: pickedURI }} style={{ width: '100%', height: 180, borderRadius: 8 }} /> : null}

          <Pressable
            disabled={uploading}
            onPress={() => {
              void uploadMedia();
            }}
            style={{
              backgroundColor: uploading ? '#93C5FD' : '#16A34A',
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontWeight: '700' }}>{uploading ? 'Uploading...' : 'Upload media'}</Text>
          </Pressable>

          {feedback ? <Text>{feedback}</Text> : null}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: '700' }}>Existing media ({media.length})</Text>
          {media.map((m) => (
            <View key={m.id} style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 10 }}>
              <Text style={{ fontWeight: '600' }}>{m.id}</Text>
              {m.access_url ? (
                <Image
                  source={{ uri: m.access_url }}
                  style={{ width: '100%', height: 180, borderRadius: 8, marginTop: 8, marginBottom: 8 }}
                  resizeMode="cover"
                />
              ) : null}
              <Text style={{ color: '#6B7280' }}>
                Created: {new Date(m.created_at).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
