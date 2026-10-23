import axios from 'axios';
import { clearAuthSession, getStoredToken } from '@/store/auth-store';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  timeout: 15000
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = getStoredToken();
    if (token) {
      config.headers.set?.('Authorization', `Bearer ${token}`);
      if (!config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && axios.isAxiosError(error) && error.response?.status === 401) {
      const requestUrl = error.config?.url ?? '';
      const isAuthRequest = requestUrl.includes('auth/giris') || requestUrl.includes('auth/kayit');
      if (!isAuthRequest) {
        clearAuthSession();
        if (!window.location.pathname.includes('/giris')) {
          window.location.replace('/giris');
        }
      }
    }

    return Promise.reject(error);
  }
);

function normalizeMessage(message: unknown) {
  if (Array.isArray(message)) {
    const joined = message
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .join(', ');
    return joined || undefined;
  }

  if (typeof message === 'string' && message.trim().length > 0) {
    return message;
  }

  return undefined;
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback;

  const data = error.response?.data as { message?: unknown; error?: unknown } | undefined;
  if (error.code === 'ECONNABORTED') {
    return 'Sunucu yanıtı gecikti. Lütfen bağlantınızı kontrol edip tekrar deneyin.';
  }

  if (!error.response) {
    return 'API servisine ulaşılamadı. Backend çalışıyor mu ve API adresi doğru mu kontrol edin.';
  }

  return normalizeMessage(data?.message) ?? normalizeMessage(data?.error) ?? fallback;
}
