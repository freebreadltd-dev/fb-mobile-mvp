import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createApiClient } from '@/lib/apiClient';
import { useSessionStore } from '@/lib/session';

export function SellerCatalogView() {
  const api = React.useMemo(() => createApiClient('json'), []);
  const session = useSessionStore((s) => s.session);

  const [sellerID, setSellerID] = React.useState<string | null>(null);
  const [catalogs, setCatalogs] = React.useState<any[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = React.useState(false);
  const [catalogError, setCatalogError] = React.useState<string | null>(null);

  const [showAddProductForm, setShowAddProductForm] = React.useState(false);
  const [creatingProduct, setCreatingProduct] = React.useState(false);
  const [createFeedback, setCreateFeedback] = React.useState<string | null>(null);

  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [unit, setUnit] = React.useState('');
  const [kind, setKind] = React.useState('GENERAL');
  const [priceCents, setPriceCents] = React.useState('');
  const [onHand, setOnHand] = React.useState('');

  const loadCatalogs = React.useCallback(async () => {
    if (!session) return;

    setCatalogError(null);
    setLoadingCatalogs(true);
    try {
      const sellerResp = await api.get('/sellers/me');
      if (sellerResp.status === false) {
        setCatalogError(sellerResp.message || 'Failed to fetch seller profile');
        setCatalogs([]);
        setSellerID(null);
        return;
      }

      const nextSellerID = sellerResp.data?.id as string | undefined;
      if (!nextSellerID) {
        setCatalogError('Seller profile has no id');
        setCatalogs([]);
        setSellerID(null);
        return;
      }
      setSellerID(nextSellerID);

      const listingsResp = await api.get(`/sellers/${nextSellerID}/listings`);
      if (listingsResp.status === false) {
        setCatalogError(listingsResp.message || 'Failed to fetch listings');
        setCatalogs([]);
        return;
      }
      setCatalogs(Array.isArray(listingsResp.data) ? listingsResp.data : []);
    } finally {
      setLoadingCatalogs(false);
    }
  }, [api, session]);

  React.useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

  const createProductAndListing = React.useCallback(async () => {
    if (!sellerID) {
      setCreateFeedback('Seller profile missing. Try reloading catalogs.');
      return;
    }
    if (!name.trim()) {
      setCreateFeedback('Product name is required.');
      return;
    }
    const parsedPrice = Number(priceCents);
    const parsedOnHand = Number(onHand);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setCreateFeedback('Enter a valid non-negative price.');
      return;
    }
    if (!Number.isFinite(parsedOnHand) || parsedOnHand < 0) {
      setCreateFeedback('Enter a valid non-negative stock quantity.');
      return;
    }

    setCreateFeedback(null);
    setCreatingProduct(true);
    try {
      const productResp = await api.post('/products', {
        name: name.trim(),
        category: category.trim() || undefined,
        unit: unit.trim() || undefined,
      });
      if (productResp.status === false) {
        setCreateFeedback(productResp.message || 'Failed to create product.');
        return;
      }

      const productID = productResp.data?.id as string | undefined;
      if (!productID) {
        setCreateFeedback('Product creation did not return a product id.');
        return;
      }

      const listingResp = await api.post(`/sellers/${sellerID}/listings`, {
        product_id: productID,
        kind: kind.trim() || 'GENERAL',
        price_cents: Math.trunc(parsedPrice),
        on_hand: Math.trunc(parsedOnHand),
        currency: 'NGN',
      });
      if (listingResp.status === false) {
        setCreateFeedback('Product created, but listing failed.');
        return;
      }

      setCreateFeedback('Product added to catalog successfully.');
      setName('');
      setCategory('');
      setUnit('');
      setKind('GENERAL');
      setPriceCents('');
      setOnHand('');
      setShowAddProductForm(false);
      void loadCatalogs();
    } finally {
      setCreatingProduct(false);
    }
  }, [api, category, kind, loadCatalogs, name, onHand, priceCents, sellerID, unit]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text className="text-xl font-bold text-blue-500">Seller Catalog</Text>

        <Pressable
          onPress={() => {
            setShowAddProductForm((prev) => !prev);
            setCreateFeedback(null);
          }}
          style={{
            backgroundColor: '#2563EB',
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '700' }}>
            {showAddProductForm ? 'Close add product form' : 'Add product'}
          </Text>
        </Pressable>

        {showAddProductForm && (
          <View
            style={{
              gap: 8,
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 12,
              padding: 12,
            }}
          >
            <Text style={{ fontWeight: '700' }}>New product</Text>
            <TextInput
              placeholder="Name"
              value={name}
              onChangeText={setName}
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                padding: 10,
              }}
            />
            <TextInput
              placeholder="Category (optional)"
              value={category}
              onChangeText={setCategory}
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                padding: 10,
              }}
            />
            <TextInput
              placeholder="Unit (optional)"
              value={unit}
              onChangeText={setUnit}
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                padding: 10,
              }}
            />
            <TextInput
              placeholder="Kind (e.g. GENERAL)"
              value={kind}
              onChangeText={setKind}
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                padding: 10,
              }}
            />
            <TextInput
              placeholder="Price (cents)"
              value={priceCents}
              onChangeText={setPriceCents}
              keyboardType="numeric"
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                padding: 10,
              }}
            />
            <TextInput
              placeholder="Stock (on_hand)"
              value={onHand}
              onChangeText={setOnHand}
              keyboardType="numeric"
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                padding: 10,
              }}
            />
            <Pressable
              disabled={creatingProduct}
              onPress={() => {
                void createProductAndListing();
              }}
              style={{
                marginTop: 6,
                backgroundColor: creatingProduct ? '#93C5FD' : '#16A34A',
                paddingVertical: 10,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>
                {creatingProduct ? 'Creating...' : 'Create product'}
              </Text>
            </Pressable>
            {createFeedback ? (
              <Text style={{ color: '#374151' }}>{createFeedback}</Text>
            ) : null}
          </View>
        )}

        {loadingCatalogs ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator size="small" />
            <Text>Loading catalogs...</Text>
          </View>
        ) : null}

        {catalogError ? (
          <Text style={{ color: '#B91C1C' }}>{catalogError}</Text>
        ) : null}

        {catalogs.map((catalog: any) => (
          <Pressable
            key={catalog.id}
            onPress={() => {
              router.push({
                pathname: '/catalog/[id]',
                params: {
                  id: String(catalog.id),
                  product_id: String(catalog.product_id ?? ''),
                },
              });
            }}
            style={{
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 12,
              padding: 12,
              gap: 4,
            }}
          >
            <Text style={{ fontWeight: '700' }}>{catalog.kind ?? 'GENERAL'}</Text>
            <Text>Product: {catalog.product_id}</Text>
            <Text>
              Price: {catalog.price_cents} {catalog.currency}
            </Text>
            <Text>Stock: {catalog.on_hand}</Text>
            <Text style={{ color: '#2563EB', marginTop: 4 }}>View details</Text>
          </Pressable>
        ))}

        {!loadingCatalogs && !catalogError && catalogs.length === 0 ? (
          <Text style={{ color: '#6B7280' }}>
            No catalogs yet. Add your first product.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
