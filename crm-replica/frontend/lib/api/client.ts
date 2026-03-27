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
    if ([401, 403].includes(status)) {
      authStore.getState().logout();
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
