import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import type { AuthResponseDto } from '../types';

// Bank-Grade Security: Access token lives strictly in JS memory (Zero localStorage)
let inMemoryAccessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  inMemoryAccessToken = token;
};

export const getAccessToken = (): string | null => {
  return inMemoryAccessToken;
};

// Central Axios instance pointing to Vite reverse proxy (/api -> https://localhost:7092)
export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true, // Sends and receives HttpOnly refresh cookie
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Injects In-Memory Bearer token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (inMemoryAccessToken && config.headers) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Concurrency queue to prevent multiple simultaneous refresh calls
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Catches 401, triggers silent token rotation, and replays request
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // If request failed with 401 and was not already an auth rotation call
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register')
    ) {
      // If the refresh call itself failed, session is truly expired -> wipe and reject
      if (originalRequest.url?.includes('/auth/refresh')) {
        setAccessToken(null);
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue pending requests while refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Silent token rotation using HttpOnly cookie
        const { data } = await axios.post<AuthResponseDto>(
          '/api/auth/refresh',
          {},
          { withCredentials: true }
        );

        const newAccessToken = data.token;
        setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);