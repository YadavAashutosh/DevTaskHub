import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import { authService } from '../services/auth.service';
import type { UserDto, LoginRequestDto, RegisterRequestDto } from '../types';

export interface AuthContextType {
  user: UserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequestDto) => Promise<void>;
  register: (data: RegisterRequestDto) => Promise<UserDto>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // In-Memory User State (Zero localStorage)
  const [user, setUser] = useState<UserDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initial Boot: Attempt silent token restoration via HttpOnly cookie
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const response = await authService.refresh();
        if (isMounted) {
          setUser(response.user);
        }
      } catch {
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials: LoginRequestDto): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequestDto): Promise<UserDto> => {
    setIsLoading(true);
    try {
      return await authService.register(data);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};