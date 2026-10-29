import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RegisterForm } from '../components/auth';
import { useAuth } from '../hooks';
import type { RegisterRequestDto } from '../types';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async (data: RegisterRequestDto) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 🛡️ Live secure registration
      await register(data);
      alert(`Account created successfully for ${data.fullName}! Please log in.`);
      navigate('/login');
    } catch (err: unknown) {
      const serverMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Registration failed. The corporate email may already be registered.';
      setErrorMessage(serverMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem 1rem' }}>
      <RegisterForm
        onSubmit={handleRegister}
        isLoading={isLoading}
        errorMessage={errorMessage}
      />
    </div>
  );
};