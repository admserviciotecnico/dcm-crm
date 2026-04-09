import { create } from 'zustand';
import { User } from '@/types/domain';

const AUTH_TOKEN_KEY = 'auth_token';

function readStoredToken() {
  if (typeof window === 'undefined') return null;

  const localToken = localStorage.getItem(AUTH_TOKEN_KEY);
  const sessionToken = sessionStorage.getItem(AUTH_TOKEN_KEY);

  // Single source of truth: if both exist, prefer persistent session and clean sessionStorage.
  if (localToken && sessionToken) {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    return localToken;
  }

  return localToken ?? sessionToken;
}

type State = {
  token: string | null;
  user: User | null;
  setToken: (v: string | null, rememberMe?: boolean) => void;
  setUser: (u: User | null) => void;
  logout: () => void;
};

export const authStore = create<State>((set) => ({
  token: readStoredToken(),
  user: null,
  setToken: (token, rememberMe = false) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      if (token) {
        if (rememberMe) localStorage.setItem(AUTH_TOKEN_KEY, token);
        else sessionStorage.setItem(AUTH_TOKEN_KEY, token);
      }
    }
    set({ token });
  },
  setUser: (user) => set({ user }),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
    }
    set({ token: null, user: null });
  }
}));

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== AUTH_TOKEN_KEY && event.key !== null) return;
    const token = readStoredToken();
    const current = authStore.getState().token;
    if (token === current) return;
    authStore.setState({ token, user: null });
  });
}
