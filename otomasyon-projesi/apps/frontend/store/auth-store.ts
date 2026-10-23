import { create } from 'zustand';

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADAY' | 'YONETICI';
};

type AuthState = {
  user?: User;
  hasHydrated: boolean;
  hydrate: () => void;
  setSession: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
};

const ACCESS_TOKEN_KEY = 'accessToken';
const AUTH_USER_KEY = 'authUser';

export function getStoredUser() {
  if (typeof window === 'undefined') return undefined;

  const rawUser = localStorage.getItem(AUTH_USER_KEY);
  if (!rawUser) return undefined;

  try {
    const user = JSON.parse(rawUser) as Partial<User>;
    const isValidUser =
      typeof user.id === 'string' &&
      typeof user.email === 'string' &&
      typeof user.firstName === 'string' &&
      typeof user.lastName === 'string' &&
      (user.role === 'ADAY' || user.role === 'YONETICI');

    if (!isValidUser) {
      clearAuthSession();
      return undefined;
    }

    return user as User;
  } catch {
    clearAuthSession();
    return undefined;
  }
}

export function getStoredToken() {
  if (typeof window === 'undefined') return undefined;
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? undefined;
}

export function setAuthSession(token: string, user: User) {
  if (!token || !user?.id) return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export const useAuthStore = create<AuthState>((set) => ({
  user: undefined,
  hasHydrated: false,
  hydrate: () => {
    set({ user: getStoredUser(), hasHydrated: true });
  },
  setSession: (token, user) => {
    setAuthSession(token, user);
    set({ user, hasHydrated: true });
  },
  setUser: (user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    }
    set({ user, hasHydrated: true });
  },
  logout: () => {
    clearAuthSession();
    set({ user: undefined, hasHydrated: true });
  }
}));
