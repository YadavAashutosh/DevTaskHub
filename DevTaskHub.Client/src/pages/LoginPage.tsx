import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '../components/auth';
import { useAuth } from '../hooks';
import type { LoginRequestDto } from '../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Return to requested protected route after login, or default to /tasks
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/tasks';

  const handleLogin = async (credentials: LoginRequestDto) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 🛡️ Live secure authentication (Zero console.log of passwords)
      await login(credentials);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const serverMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Invalid corporate credentials. Please verify your email and password.';
      setErrorMessage(serverMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem 1rem' }}>
      <LoginForm
        onSubmit={handleLogin}
        isLoading={isLoading}
        errorMessage={errorMessage}
      />
    </div>
  );
};