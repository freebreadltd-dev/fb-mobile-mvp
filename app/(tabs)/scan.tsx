import React, { useState } from 'react';
import { SafeAreaView, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

import { createAxiosUnsecuredInstance } from '@/lib/config';

type ScanResponse = {
  remaining?: number;
  message?: string;
};

export default function ScanTab() {
  const [permission, requestPermission] = useCameraPermissions();
  const [lastCode, setLastCode] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Ready');
  const api = React.useMemo(() => createAxiosUnsecuredInstance('json'), []);

  if (!permission) {
    return (
      <SafeAreaView>
        <View style={{ padding: 16 }}>
          <Text>Requesting camera permission…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView>
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600' }}>Camera required</Text>
          <Text style={{ marginTop: 8 }}>
            Enable camera access to scan QR codes.
          </Text>
          <View style={{ height: 12 }} />
          <Text
            onPress={requestPermission}
            style={{ color: '#2563EB', fontWeight: '600' }}
          >
            Tap to grant permission
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '600' }}>Scan (Subscriber)</Text>
        <Text style={{ marginTop: 8, opacity: 0.7 }}>{status}</Text>
        {!!lastCode && (
          <Text style={{ marginTop: 8, opacity: 0.7 }}>Last: {lastCode}</Text>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <CameraView
          style={{ flex: 1 }}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={async ({ data }) => {
            if (!data || data === lastCode) return;

            setLastCode(data);
            setStatus('Submitting…');

            try {
              // `createAxiosUnsecuredInstance` already prefixes `ENV.apiBaseUrl + "/api/v1"`.
              // So endpoints here should be relative to `/api/v1`.
              const resp = (await api.post<ScanResponse>('/rations/scan', {
                code: data,
                device_id: 'expo-device',
                lat: null,
                lng: null,
              })).data;
              setStatus(`OK. Remaining: ${String(resp.remaining ?? '—')}`);
            } catch (e: any) {
              setStatus(e?.message ?? 'Scan failed');
            }
          }}
        />
      </View>
    </SafeAreaView>
  );
}

