import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ENV } from '@/app/config/env';
import { tokenStorage } from '@/lib/auth/token-storage';
import { normalizeApiError, triggerUnauthorized } from './error-handler';
import { API_ENDPOINTS } from './endpoints';

export const apiClient: AxiosInstance = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(normalizeApiError(error))
);

// Response Interceptor: Error Normalization & Auth Guard
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url === API_ENDPOINTS.AUTH.LOGIN;
      if (!isLoginRequest) {
        triggerUnauthorized();
      }
    }
    return Promise.reject(normalizeApiError(error));
  }
);

export default apiClient;
