import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  QueryClient,
  focusManager,
  onlineManager,
} from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';

function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            gcTime: 1000 * 60 * 60 * 24, // 24h
            retry(failureCount, error) {
              // Don't keep retrying obvious auth/client errors.
              // (We keep it conservative until we have a richer ApiError type.)
              if (failureCount >= 2) return false;
              if (error instanceof Error) {
                const msg = error.message.toLowerCase();
                if (msg.includes('401') || msg.includes('403')) return false;
              }
              return true;
            },
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  React.useEffect(() => {
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);

  React.useEffect(() => {
    onlineManager.setEventListener((setOnline) => {
      const unsubscribe = NetInfo.addEventListener((state) => {
        setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
      });
      return unsubscribe;
    });
  }, []);

  const persister = React.useMemo(
    () =>
      createAsyncStoragePersister({
        storage: AsyncStorage,
        key: 'freebread_rq_cache_v1',
      }),
    [],
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        buster: 'v1',
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Avoid persisting queries with errors by default; keeps cache cleaner.
            return query.state.status === 'success';
          },
        },
      }}
      onSuccess={() => {
        // Kick an immediate focus sync after rehydration.
        focusManager.setFocused(AppState.currentState === 'active');
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

