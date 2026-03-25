import axios from 'axios';
import { portalAuthStore } from '@/stores/portal-auth-store';

export const portalApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  withCredentials: true
});

portalApi.interceptors.request.use((config) => {
  const token = portalAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

portalApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if ([401, 403].includes(status)) {
      portalAuthStore.getState().logout();
      if (typeof window !== 'undefined') window.location.href = '/portal/login';
    }
    return Promise.reject(error);
  }
);
