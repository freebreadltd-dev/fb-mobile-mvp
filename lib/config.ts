import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { router } from "expo-router";

import { ENV } from "@/lib/env";
import { sessionStore } from "@/lib/session";

type RetryableAxiosConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// Align with current mobile API usage (see `app/login.tsx`)
const REFRESH_PATH = "/api/v1/auth/refresh";

let refreshInFlight: Promise<string | null> | null = null;

function contentTypeHeader(type: ContentType): string {
  return type === "json" ? "application/json" : "multipart/form-data";
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function normalizeTokenPayload(data: any): {
  accessToken?: string;
  refreshToken?: string;
} {
  if (!data || typeof data !== "object") return {};

  const accessToken =
    (data as any).access_token ??
    (data as any).accessToken ??
    (data as any)?.data?.access_token ??
    (data as any)?.data?.accessToken;

  const refreshToken =
    (data as any).refresh_token ??
    (data as any).refreshToken ??
    (data as any)?.data?.refresh_token ??
    (data as any)?.data?.refreshToken;

  return {
    accessToken: typeof accessToken === "string" ? accessToken : undefined,
    refreshToken: typeof refreshToken === "string" ? refreshToken : undefined,
  };
}

async function refreshAccessToken(
  setAccessToken?: SetAccessToken,
): Promise<string | null> {
  const current = await sessionStore.get();
  const refreshToken = current?.refreshToken;
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${ENV.apiBaseUrl}${REFRESH_PATH}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        // Many APIs accept refresh token as bearer; we also include it in the body.
        Authorization: `Bearer ${refreshToken}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const text = await res.text();
    const data = text ? safeJson(text) : null;
    if (!res.ok) return null;

    const tokens = normalizeTokenPayload(data);
    if (!tokens.accessToken) return null;

    await sessionStore.set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? refreshToken,
    });
    await setAccessToken?.(tokens.accessToken);

    return tokens.accessToken;
  } catch {
    return null;
  }
}

function attachInterceptors(
  instance: AxiosInstance,
  setAccessToken?: SetAccessToken,
) {
  instance.interceptors.request.use(async (config) => {
    const c = config as RetryableAxiosConfig;

    // In Expo, prefer `EXPO_PUBLIC_*` via `ENV`.
    if (!c.baseURL) c.baseURL = ENV.apiBaseUrl;

    // Always prefer latest stored token (may change after refresh).
    const alreadyHasAuth =
      typeof (c.headers as any)?.Authorization === "string" ||
      typeof (c.headers as any)?.authorization === "string";

    if (!alreadyHasAuth) {
      const token = (await sessionStore.get())?.accessToken;
      if (token) {
        c.headers = c.headers ?? {};
        (c.headers as any).Authorization = `Bearer ${token}`;
      }
    }

    return c;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const initialRequest = (error?.config ??
        null) as RetryableAxiosConfig | null;
      const status = error?.response?.status;

      if (!initialRequest || status !== 401 || initialRequest._retry) {
        return Promise.reject(error);
      }

      initialRequest._retry = true;

      refreshInFlight =
        refreshInFlight ??
        refreshAccessToken(setAccessToken).finally(() => {
          refreshInFlight = null;
        });

      const newAccessToken = await refreshInFlight;
      if (!newAccessToken) {
        await sessionStore.set(null);
        router.replace("/login");
        return Promise.reject(error);
      }

      initialRequest.headers = initialRequest.headers ?? {};
      (initialRequest.headers as any).Authorization =
        `Bearer ${newAccessToken}`;
      return instance(initialRequest);
    },
  );
}

export const createAxiosSecuredInstance = (
  token: string,
  setAccessToken: SetAccessToken,
  type: ContentType,
): AxiosInstance => {
  const instance = axios.create({
    baseURL: ENV.apiBaseUrl + "/api/v1",
    headers: {
      Accept: "application/json",
      "Content-Type": contentTypeHeader(type),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  attachInterceptors(instance, setAccessToken);
  return instance;
};

export const createAxiosUnsecuredInstance = (
  type: ContentType,
): AxiosInstance => {
  const instance = axios.create({
    baseURL: ENV.apiBaseUrl + "/api/v1",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  attachInterceptors(instance);
  return instance;
};
