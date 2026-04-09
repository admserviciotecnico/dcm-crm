'use client';

import { create } from 'zustand';
import { PortalUser } from '@/types/domain';

const PORTAL_TOKEN_KEY = 'portal_auth_token';

function readStoredPortalToken() {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(PORTAL_TOKEN_KEY);
}

type PortalAuthState = {
  token: string | null;
  user: PortalUser | null;
  setToken: (token: string | null) => void;
  setUser: (user: PortalUser | null) => void;
  logout: () => void;
};

export const portalAuthStore = create<PortalAuthState>((set) => ({
  token: readStoredPortalToken(),
  user: null,
  setToken: (token) => {
    if (typeof window !== 'undefined') {
      if (token) sessionStorage.setItem(PORTAL_TOKEN_KEY, token);
      else sessionStorage.removeItem(PORTAL_TOKEN_KEY);
    }
    set({ token });
  },
  setUser: (user) => set({ user }),
  logout: () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(PORTAL_TOKEN_KEY);
    }
    set({ token: null, user: null });
  }
}));
