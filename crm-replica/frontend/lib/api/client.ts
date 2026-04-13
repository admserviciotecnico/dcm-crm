import axios from 'axios';
import { authStore } from '@/stores/auth-store';
import { appStore } from '@/stores/app-store';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  withCredentials: true
});

api.interceptors.request.use((config) => {
  appStore.getState().startLoading();
  const token = authStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => {
    appStore.getState().stopLoading();
    return res;
  },
  (error) => {
    appStore.getState().stopLoading();
    const status = error?.response?.status;
    if (status === 401) {
      authStore.getState().logout();
      if (typeof window !== 'undefined') window.location.href = '/login';
    } else if (status === 403) {
      appStore.getState().pushToast({ type: 'error', message: 'No tenés permisos para realizar esta acción' });
    }
    return Promise.reject(error);
  }
);
