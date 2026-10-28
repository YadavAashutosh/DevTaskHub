import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '../components/auth';
import type { LoginRequestDto } from '../types';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // User jis page se aaya tha wahan wapas bhejne ke liye (default: /tasks)
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/tasks';

  const handleLogin = async (credentials: LoginRequestDto) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // UX review delay (Day 7 me yahan real .NET API call aayegi)
      await new Promise((resolve) => setTimeout(resolve, 600));
      console.log('Login attempt:', credentials);

      navigate(from, { replace: true });
    } catch {
      setErrorMessage('Invalid corporate credentials. Please check your email and password.');
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