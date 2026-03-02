import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
};

export type SessionStore = {
  get(): Promise<AuthSession | null>;
  set(session: AuthSession | null): Promise<void>;
};

const SECURE_STORE_KEY = 'freebread_auth_session_v1';

async function readSecureSession(): Promise<AuthSession | null> {
  const raw = await SecureStore.getItemAsync(SECURE_STORE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const p = parsed as Partial<AuthSession>;
    if (typeof p.accessToken !== 'string' || p.accessToken.length === 0) return null;
    if (p.refreshToken != null && typeof p.refreshToken !== 'string') return null;
    return { accessToken: p.accessToken, refreshToken: p.refreshToken };
  } catch {
    return null;
  }
}

async function writeSecureSession(session: AuthSession | null): Promise<void> {
  if (!session) {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY);
    return;
  }
  await SecureStore.setItemAsync(SECURE_STORE_KEY, JSON.stringify(session));
}

type SessionState = {
  session: AuthSession | null;
  hydrated: boolean;
  hydrate(): Promise<void>;
  setSession(session: AuthSession | null): Promise<void>;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  hydrated: false,
  hydrate: async () => {
    if (get().hydrated) return;
    const session = await readSecureSession();
    set({ session, hydrated: true });
  },
  setSession: async (session) => {
    set({ session });
    await writeSecureSession(session);
  },
}));

export const sessionStore: SessionStore = {
  async get() {
    const state = useSessionStore.getState();
    if (!state.hydrated) await state.hydrate();
    return useSessionStore.getState().session;
  },
  async set(session) {
    await useSessionStore.getState().setSession(session);
  },
};

