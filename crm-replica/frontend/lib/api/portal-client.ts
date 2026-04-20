import axios from 'axios';
import { portalAuthStore } from '@/stores/portal-auth-store';
import { appStore } from '@/stores/app-store';

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
    if (status === 401) {
      portalAuthStore.getState().logout();
      if (typeof window !== 'undefined') window.location.href = '/portal/login';
    } else if (status === 403) {
      appStore.getState().pushToast({ type: 'error', message: 'No tenés permisos para realizar esta acción' });
    }
    return Promise.reject(error);
  }
);
