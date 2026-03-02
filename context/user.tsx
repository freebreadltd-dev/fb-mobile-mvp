import { create } from 'zustand';

import { createApiClient } from '@/lib/apiClient';
import { sessionStore } from '@/lib/session';

export type User = {
  id: string;
  role?: string;
  roles?: string[];
  phone: string;
  email: string;
  status: string;
  created_at: string;
};

export type AccountMode = 'buyer' | 'seller';

function availableModes(user: User | null): AccountMode[] {
  if (!user) return ['buyer'];
  if (Array.isArray(user.roles) && user.roles.length > 0) {
    const modes = user.roles.filter((r): r is AccountMode => r === 'buyer' || r === 'seller');
    return modes.length > 0 ? modes : ['buyer'];
  }
  if (user.role === 'seller') return ['buyer', 'seller'];
  return ['buyer'];
}

type UserState = {
  user: User | null;
  accountMode: AccountMode;
  status: 'idle' | 'loading' | 'success' | 'error';
  errorMessage: string | null;
  clear(): void;
  setAccountMode(mode: AccountMode): void;
  getModes(): AccountMode[];
  refreshMe(): Promise<void>;
};

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  accountMode: 'buyer',
  status: 'idle',
  errorMessage: null,

  clear: () => set({ user: null, accountMode: 'buyer', status: 'idle', errorMessage: null }),
  setAccountMode: (mode) => {
    const modes = availableModes(get().user);
    if (!modes.includes(mode)) return;
    set({ accountMode: mode });
  },
  getModes: () => availableModes(get().user),

  refreshMe: async () => {
    // Only fetch when we have a token (otherwise clear).
    const session = await sessionStore.get();
    if (!session?.accessToken) {
      get().clear();
      return;
    }

    set({ status: 'loading', errorMessage: null });
    const api = createApiClient('json');
    const resp = await api.get('/user/me');

    if (resp.status === false) {
      set({
        status: 'error',
        errorMessage: resp.message || 'Failed to load user',
      });
      return;
    }

    const incomingUser = resp.data as User;
    const modes = availableModes(incomingUser);
    const previousMode = get().accountMode;
    const nextMode = modes.includes(previousMode) ? previousMode : modes[0];

    set({
      user: incomingUser,
      accountMode: nextMode,
      status: 'success',
      errorMessage: null,
    });
  },
}));