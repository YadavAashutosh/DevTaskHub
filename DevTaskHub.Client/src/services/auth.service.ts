import { apiClient, setAccessToken } from './api';
import type { LoginRequestDto, RegisterRequestDto, AuthResponseDto, UserDto } from '../types';

export const authService = {
  /**
   * Authenticates user, updates in-memory token, and receives HttpOnly refresh cookie.
   */
  async login(credentials: LoginRequestDto): Promise<AuthResponseDto> {
    const response = await apiClient.post<AuthResponseDto>('/auth/login', credentials);
    setAccessToken(response.data.token);
    return response.data;
  },

  /**
   * Registers a new account in the system.
   */
  async register(data: RegisterRequestDto): Promise<UserDto> {
    const response = await apiClient.post<UserDto>('/auth/register', data);
    return response.data;
  },

  /**
   * Silently exchanges the HttpOnly refresh cookie for a fresh access token.
   */
  async refresh(): Promise<AuthResponseDto> {
    const response = await apiClient.post<AuthResponseDto>('/auth/refresh');
    setAccessToken(response.data.token);
    return response.data;
  },

  /**
   * Terminates active session and instructs backend to delete HttpOnly cookie.
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },
};